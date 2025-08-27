require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json());

const gradesRouter = require("./routes/grades");

app.use("/api/grades", gradesRouter);

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// --- Helper: create OAuth2 client ---
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// --- Helper: OAuth2 client from session ---
function getOAuthClientFromSession(req) {
  const oauth2Client = createOAuthClient();
  if (req.session.tokens) {
    oauth2Client.setCredentials(req.session.tokens);
  }
  return oauth2Client;
}

// --- Login route ---
app.get('/auth/login', (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // get refresh_token
    scope: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.students',
      'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
    ],
    prompt: 'consent'
  });
  res.redirect(url);
});

// --- OAuth callback ---
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:4000/auth/callback"
    );

    const { tokens } = await oauth2Client.getToken(code);

    console.log("👉 Tokens received from Google:", tokens); // <--- DEBUG HERE

    oauth2Client.setCredentials(tokens);

    req.session.tokens = tokens;
    console.log("✅ Saved tokens into session:", req.session.tokens); // <--- DEBUG HERE

    res.redirect("http://localhost:5173/classes"); // send user to frontend classes page
  } catch (err) {
    console.error("❌ Error in /auth/callback:", err.response?.data || err.message);
    res.status(500).send("Authentication failed");
  }
});


app.get("/classroom/courses", async (req, res) => {
  try {
    if (!req.session.tokens) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials(req.session.tokens);

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    const response = await classroom.courses.list({
      courseStates: ["ACTIVE"],
    });

    console.log("✅ Classroom API response:", response.data);

    res.json(response.data.courses || []);
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});



app.get("/api/students/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log("📘 Fetching students for course:", courseId);

    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const result = await classroom.courses.students.list({ courseId });

    res.json(result.data);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.post("/submit", async (req, res) => {
  const { courseId, courseWorkId, studentId, grade } = req.body;

  try {
    if (!courseId || !courseWorkId || !studentId || grade === undefined) {
      return res.status(400).json({ error: "Missing required fields", body: req.body });
    }

    const auth = await getAuthClient();
    const classroom = google.classroom({ version: "v1", auth });

    console.log("➡️ Submitting grade with:", { courseId, courseWorkId, studentId, grade });

    // Step 1: Patch draft grade
    const draft = await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId,
      id: studentId,
      updateMask: "assignedGrade",
      requestBody: { assignedGrade: grade },
    });
    console.log("✅ Draft grade set:", draft.data);

    // Step 2: Finalize the grade
    const finalized = await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId,
      id: studentId,
      updateMask: "draftGrade,assignedGrade",
      requestBody: { assignedGrade: grade, draftGrade: grade },
    });
    console.log("✅ Final grade set:", finalized.data);

    res.json({ success: true, grade });
  } catch (error) {
    console.error("❌ Error submitting grade:", error.response?.data || error.message || error);
    res.status(500).json({ error: "Failed to submit grade", details: error.response?.data || error.message });
  }
});




// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on :${PORT}`));
