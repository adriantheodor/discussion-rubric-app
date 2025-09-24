// backend/server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { google } = require("googleapis");
const mongoose = require("mongoose");
const { createOAuthClient, getOAuthScopes } = require("./routes/auth");
const Participation = require("./models/Participation");

const app = express();

// ✅ Define frontend + backend URLs from env
const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL // e.g. https://discussion-rubric-app.vercel.app
    : "http://localhost:5173";

const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.BACKEND_URL // e.g. https://discussion-rubric-app.onrender.com
    : "http://localhost:4000";

// ✅ CORS
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// ✅ trust proxy is required on Render so secure cookies work
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "none", // ✅ allow cross-site
      secure: process.env.NODE_ENV === "production", // ✅ secure in prod
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((e) => console.error("MongoDB connection error:", e));

// Helpers
function todayNY(date) {
  const tz = "America/New_York";
  return date
    ? new Date(date).toLocaleDateString("en-CA", { timeZone: tz })
    : new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function getOAuthClientFromSession(req) {
  const client = createOAuthClient();
  if (req.session && req.session.tokens) {
    client.setCredentials(req.session.tokens);
  }
  return client;
}

// ---------- OAuth Routes ----------

// Start login: redirect user to Google
app.get("/auth/google", (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: getOAuthScopes(),
  });
  res.redirect(url);
});

// OAuth callback: Google redirects here
app.get("/auth/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session save error:", err);
        return res.status(500).send("Auth session error");
      }
      console.log("✅ Tokens saved to session:", tokens);
      res.redirect(`${FRONTEND_URL}/classes`);
    });
  } catch (err) {
    console.error("OAuth callback error", err);
    res.status(500).send("Auth error");
  }
});

app.get("/debug/session", (req, res) => {
  res.json(req.session);
});

// ---------- Google Classroom Helper ----------
async function getOrCreateParticipationAssignment(oauth2Client, courseId) {
  const classroom = google.classroom({ version: "v1", auth: oauth2Client });

  const listResp = await classroom.courses.courseWork.list({ courseId });
  const existing = (listResp.data.courseWork || []).find(
    (cw) => cw.title === "Participation"
  );
  if (existing) return existing.id;

  const createResp = await classroom.courses.courseWork.create({
    courseId,
    requestBody: {
      title: "Participation",
      description: "Ongoing participation (cumulative, updated daily).",
      workType: "ASSIGNMENT",
      state: "PUBLISHED",
      maxPoints: 15,
    },
  });
  return createResp.data.id;
}

// ---------- API Routes ----------

// GET /api/classes
app.get("/api/classes", async (req, res) => {
  try {
    console.log("🔎 Session tokens:", req.session.tokens);
    const oauth2Client = getOAuthClientFromSession(req);
    console.log("🔎 OAuth2Client credentials:", oauth2Client.credentials);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const resp = await classroom.courses.list({ courseStates: ["ACTIVE"] });
    res.json(resp.data.courses || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/:classId/students
app.get("/api/classes/:classId/students", async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const resp = await classroom.courses.students.list({
      courseId: req.params.classId,
    });
    res.json(resp.data.students || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/:classId/assignments
app.get("/api/classes/:classId/assignments", async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });
    const resp = await classroom.courses.courseWork.list({
      courseId: req.params.classId,
    });
    res.json(resp.data.courseWork || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grade
app.post("/api/grade", async (req, res) => {
  try {
    const { courseId, courseWorkId, studentId, scores = {}, date } = req.body;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: "courseId and studentId required" });
    }

    const d = todayNY(date);
    const total =
      (scores.preparation || 0) +
      (scores.engagement || 0) +
      (scores.critical || 0);

    // Save daily entry
    await Participation.updateOne(
      { courseId, studentId, date: d },
      { $set: { score: total, categoryScores: scores } },
      { upsert: true }
    );

    // Aggregate cumulative + days
    const agg = await Participation.aggregate([
      { $match: { courseId, studentId } },
      { $group: { _id: "$date", score: { $first: "$score" } } },
    ]);

    const cumulative = agg.reduce((sum, g) => sum + (g.score || 0), 0);
    const daysGraded = agg.length;
    const maxPointsSoFar = daysGraded * 15;

    // Update Classroom
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    const cwId =
      courseWorkId ||
      (await getOrCreateParticipationAssignment(oauth2Client, courseId));

    // Update assignment max points
    await classroom.courses.courseWork.patch({
      courseId,
      id: cwId,
      updateMask: "maxPoints",
      requestBody: { maxPoints: maxPointsSoFar },
    });

    // Find or create submission
    let subsResp = await classroom.courses.courseWork.studentSubmissions.list({
      courseId,
      courseWorkId: cwId,
      userId: studentId,
    });

    let submission = (subsResp.data.studentSubmissions || [])[0];
    if (!submission) {
      await classroom.courses.courseWork.studentSubmissions.batchCreate({
        courseId,
        courseWorkId: cwId,
        requestBody: {},
      });
      subsResp = await classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId: cwId,
        userId: studentId,
      });
      submission = (subsResp.data.studentSubmissions || [])[0];
    }

    if (!submission) {
      return res
        .status(404)
        .json({ error: "Could not create/find student submission" });
    }

    await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId: cwId,
      id: submission.id,
      updateMask: "draftGrade,assignedGrade",
      requestBody: { draftGrade: cumulative, assignedGrade: cumulative },
    });

    res.json({ success: true, date: d, total, cumulative, maxPointsSoFar });
  } catch (err) {
    console.error("/api/grade error", err);
    res.status(500).json({ error: err.message || "server error" });
  }
});

// GET /api/participation/history
app.get("/api/participation/history", async (req, res) => {
  try {
    const { courseId, studentId, limit = 30 } = req.query;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: "courseId and studentId required" });
    }

    const agg = await Participation.aggregate([
      { $match: { courseId, studentId } },
      { $group: { _id: "$date", score: { $first: "$score" } } },
      { $sort: { _id: -1 } },
      { $limit: Number(limit) },
    ]);

    const entries = agg.map((g) => ({ date: g._id, score: g.score }));
    const cumulative = entries.reduce((sum, g) => sum + (g.score || 0), 0);
    const daysGraded = agg.length;
    const maxPointsSoFar = daysGraded * 15;

    res.json({ entries, cumulative, daysGraded, maxPointsSoFar });
  } catch (err) {
    console.error("history error", err);
    res.status(500).json({ error: err.message || "server error" });
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
