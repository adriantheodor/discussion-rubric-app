// backend/auth.js
const { google } = require("googleapis");
require("dotenv").config();

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
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

