// backend/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const { createOAuthClient, getOAuthScopes } = require('./routes/auth');
const Participation = require('./models/Participation');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// Mongo
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((e) => console.error("MongoDB connection error:", e));

// Helpers
function todayNY(date) {
  const tz = 'America/New_York';
  if (date) return new Date(date).toLocaleDateString('en-CA', { timeZone: tz });
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}
function getOAuthClientFromSession(req) {
  const client = createOAuthClient();
  if (req.session && req.session.tokens) client.setCredentials(req.session.tokens);
  return client;
}

// OAuth routes
app.get('/auth/google', (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: getOAuthScopes() });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens; // store tokens in session (for production store per-user)
    res.redirect('http://localhost:5173/classes');
  } catch (err) {
    console.error('OAuth callback error', err);
    res.status(500).send('Auth error');
  }
});


// Helper: find or create Participation assignment in Classroom and return id
async function getOrCreateParticipationAssignment(oauth2Client, courseId) {
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

  // Look for an existing assignment
  const listResp = await classroom.courses.courseWork.list({ courseId });
  const existing = (listResp.data.courseWork || []).find(
    (cw) => cw.title === 'Participation'
  );
  if (existing) return existing.id;

  // Otherwise create it
  const createResp = await classroom.courses.courseWork.create({
    courseId,
    requestBody: {
      title: 'Participation',
      description: 'Ongoing participation (cumulative, updated daily).',
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
      maxPoints: 15, // ✅ start with one day’s max
    },
  });

  return createResp.data.id;
}


/**
 * Required endpoints (spec)
 */

// GET /api/classes
app.get('/api/classes', async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: 'Not authenticated' });
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const resp = await classroom.courses.list({ courseStates: ['ACTIVE'] });
    res.json(resp.data.courses || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/:classId/students
app.get('/api/classes/:classId/students', async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: 'Not authenticated' });
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const resp = await classroom.courses.students.list({ courseId: req.params.classId });
    res.json(resp.data.students || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/:classId/assignments
app.get('/api/classes/:classId/assignments', async (req, res) => {
  try {
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) return res.status(401).json({ error: 'Not authenticated' });
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const resp = await classroom.courses.courseWork.list({ courseId: req.params.classId });
    res.json(resp.data.courseWork || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/grade
 * body: { courseId, courseWorkId (optional), studentId, scores: {preparation,engagement,critical}, date (optional) }
 * - stores daily record (upsert) in Mongo
 * - computes cumulative sum and patches Classroom assignment (courseWorkId if provided, otherwise uses/get-or-create "Participation")
 */
// POST /api/grade
// POST /api/grade
app.post('/api/grade', async (req, res) => {
  try {
    const { courseId, courseWorkId, studentId, scores = {}, date } = req.body;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: 'courseId and studentId required' });
    }

    const d = todayNY(date);
    const total =
      (scores.preparation || 0) +
      (scores.engagement || 0) +
      (scores.critical || 0);

    // 1. Save daily entry (upsert by course+student+date)
    await Participation.updateOne(
      { courseId, studentId, date: d },
      { $set: { score: total, categoryScores: scores } },
      { upsert: true }
    );

    // 2. Compute cumulative + distinct days
    const agg = await Participation.aggregate([
      { $match: { courseId, studentId } },
      {
        $group: {
          _id: '$date',
          score: { $first: '$score' },
        },
      },
    ]);

    const cumulative = agg.reduce((sum, g) => sum + (g.score || 0), 0);
    const daysGraded = agg.length;
    const maxPointsSoFar = daysGraded * 15;

    // 3. Authenticate with Classroom
    const oauth2Client = getOAuthClientFromSession(req);
    if (!oauth2Client.credentials) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

    // 4. Find or create Participation assignment
    const cwId =
      courseWorkId || (await getOrCreateParticipationAssignment(oauth2Client, courseId));

    // 5. Update maxPoints dynamically
    await classroom.courses.courseWork.patch({
      courseId,
      id: cwId,
      updateMask: 'maxPoints',
      requestBody: { maxPoints: maxPointsSoFar },
    });

    // 6. Ensure student submission exists
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
      return res.status(404).json({ error: 'Could not create/find student submission' });
    }

    // 7. Update Classroom grade
    await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId: cwId,
      id: submission.id,
      updateMask: 'draftGrade,assignedGrade',
      requestBody: {
        draftGrade: cumulative,
        assignedGrade: cumulative,
      },
    });

    res.json({ success: true, date: d, total, cumulative, maxPointsSoFar });
  } catch (err) {
    console.error('/api/grade error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});


// GET /api/participation/history?courseId=...&studentId=...
app.get('/api/participation/history', async (req, res) => {
  try {
    const { courseId, studentId, limit = 30 } = req.query;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: 'courseId and studentId required' });
    }

    // Group by distinct date
    const agg = await Participation.aggregate([
      { $match: { courseId, studentId } },
      {
        $group: {
          _id: '$date',
          score: { $first: '$score' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: Number(limit) },
    ]);

    const entries = agg.map((g) => ({ date: g._id, score: g.score }));
    const cumulative = entries.reduce((sum, g) => sum + (g.score || 0), 0);
    const daysGraded = agg.length;
    const maxPointsSoFar = daysGraded * 15; // ✅ each day max 15 points

    res.json({ entries, cumulative, daysGraded, maxPointsSoFar });
  } catch (err) {
    console.error('history error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));
