require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// session should come before any router that uses req.session
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// then mount routers
const gradesRouter = require("./routes/grades");
app.use("/api/grades", gradesRouter);


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
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.redirect("http://localhost:5173/classes");
  } catch (err) {
    console.error("❌ Error in /auth/callback:", err.response?.data || err.message);
    res.status(500).send("Authentication failed");
  }
});


// Example wrappers to add AFTER createOAuthClient/getOAuthClientFromSession are available

app.get("/api/classes", async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: "Not authenticated" });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const resp = await classroom.courses.list({ courseStates: ["ACTIVE"] });
    const classes = (resp.data.courses || []).map(c => ({ id: c.id, name: c.name, section: c.section || "" }));
    res.json(classes);
  } catch (err) {
    console.error("Error /api/classes:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/classes/:classId/students", async (req, res) => {
  const { classId } = req.params;
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: "Not authenticated" });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const r = await classroom.courses.students.list({ courseId: classId });
    const students = (r.data.students || []).map(s => ({
      id: s.userId,
      name: s.profile?.name?.fullName || `${s.profile?.name?.givenName || ""} ${s.profile?.name?.familyName || ""}`.trim(),
      profile: s.profile
    }));
    res.json(students);
  } catch (err) {
    console.error("Error /api/classes/:classId/students", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/classes/:classId/assignments", async (req, res) => {
  const { classId } = req.params;
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: "Not authenticated" });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const r = await classroom.courses.courseWork.list({ courseId: classId });
    const assignments = (r.data.courseWork || []).map(a => ({ id: a.id, title: a.title, maxPoints: a.maxPoints }));
    res.json(assignments);
  } catch (err) {
    console.error("Error /api/classes/:classId/assignments", err);
    res.status(500).json({ error: err.message });
  }
});

// Accepts either submissionId OR studentId and will resolve submissionId if needed
app.post("/api/grade", async (req, res) => {
  const { courseId, courseWorkId, submissionId, studentId, grade } = req.body;
  if (!courseId || !courseWorkId || grade == null) {
    return res.status(400).json({ error: "courseId, courseWorkId and grade are required" });
  }
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: "Not authenticated" });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    let subId = submissionId;
    if (!subId && studentId) {
      const listResp = await classroom.courses.courseWork.studentSubmissions.list({ courseId, courseWorkId });
      const subs = listResp.data.studentSubmissions || [];
      const found = subs.find(s => s.userId === studentId || s.id === studentId);
      if (!found) return res.status(404).json({ error: "Submission not found" });
      subId = found.id;
    }
    if (!subId) return res.status(400).json({ error: "submissionId or studentId required" });

    await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId,
      id: subId,
      updateMask: "draftGrade,assignedGrade",
      requestBody: { draftGrade: grade, assignedGrade: grade },
    });

    res.json({ success: true, grade, submissionId: subId });
  } catch (err) {
    console.error("Error /api/grade:", err);
    res.status(500).json({ error: err.message || err });
  }
});





// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on :${PORT}`));
