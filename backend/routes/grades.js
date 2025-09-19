// backend/routes/grades.js
const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { createOAuthClient } = require("./auth"); // <-- fixed path

// POST /api/grades/submit
router.post("/submit", async (req, res) => {
  const { courseId, courseWorkId, submissionId, studentId, grade } = req.body;

  if (!courseId || !courseWorkId || grade == null) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields (courseId, courseWorkId, grade)",
    });
  }

  try {
    const oauth2Client = createOAuthClient();

    // Ensure session tokens exist (session middleware must be mounted before router)
    if (!req.session || !req.session.tokens) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }
    oauth2Client.setCredentials(req.session.tokens);

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    // If front-end provided studentId (userId) instead of submissionId, try to resolve
    let subId = submissionId;
    if (!subId && studentId) {
      const sres = await classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId,
      });
      const subs = sres.data.studentSubmissions || [];
      const found = subs.find(
        (s) => s.userId === studentId || s.id === studentId
      );
      if (!found) {
        return res.status(404).json({
          success: false,
          error: "Submission not found for that student",
        });
      }
      subId = found.id;
    }

    if (!subId) {
      return res.status(400).json({
        success: false,
        error: "submissionId or studentId must be supplied",
      });
    }

    // Write draft grade then finalize assigned grade (common Classroom flow)
    await classroom.courses.courseWork.studentSubmissions.patch({
      courseId,
      courseWorkId,
      id: subId,
      updateMask: "draftGrade",
      requestBody: { draftGrade: grade },
    });

    const finalized =
      await classroom.courses.courseWork.studentSubmissions.patch({
        courseId,
        courseWorkId,
        id: subId,
        updateMask: "assignedGrade",
        requestBody: { assignedGrade: grade, draftGrade: grade },
      });

    res.json({
      success: true,
      grade,
      submissionId: subId,
      finalized: finalized.data,
    });
  } catch (err) {
    console.error("Error submitting grade:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
});

module.exports = router;
