const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { createOAuthClient } = require("auth");


// POST /api/grades/submit
router.post("/submit", async (req, res) => {
  const { courseId, courseWorkId, studentId, grade } = req.body;

  if (!courseId || !courseWorkId || !studentId || grade == null) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    // ✅ Mocking for now — in real Google Classroom, you must PATCH
    // a submission's assignedGrade and then call return
    console.log("Submitting grade:", { courseId, courseWorkId, studentId, grade });

    // Fake API call for testing
    // Replace with:
    // await classroom.courses.courseWork.studentSubmissions.patch({...})
    // followed by:
    // await classroom.courses.courseWork.studentSubmissions.return({...})

    return res.json({
      success: true,
      message: `Mock grade ${grade} submitted for student ${studentId}`,
      submitted: { courseId, courseWorkId, studentId, grade },
    });
  } catch (err) {
    console.error("Error submitting grade:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error while submitting grade",
      details: err.message,
    });
  }
});

module.exports = router;
