// backend/models/Participation.js
const mongoose = require("mongoose");

const ParticipationSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    // YYYY-MM-DD in New York timezone
    date: { type: String, required: true, index: true },
    categoryScores: {
      preparation: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },
    // total for that day
    score: { type: Number, required: true },
  },
  { timestamps: true }
);

// Enforce one record per student per day per class
ParticipationSchema.index(
  { courseId: 1, studentId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Participation", ParticipationSchema);
