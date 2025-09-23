// backend/routes/auth.js
const { google } = require("googleapis");
require("dotenv").config();

function createOAuthClient() {
  // In prod, BACKEND_URL must be set!
  const redirectUri =
    process.env.NODE_ENV === "production"
      ? `${process.env.BACKEND_URL}/auth/callback`
      : "http://localhost:4000/auth/callback";

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function getOAuthScopes() {
  return [
    "openid",
    "profile",
    "email",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
  ];
}

module.exports = { createOAuthClient, getOAuthScopes };
