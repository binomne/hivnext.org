/* =====================================================================
   Leaderboard connection settings. This is the only file to edit for the leaderboard.
   Both values are PUBLIC by design (they appear in every visitor's browser), so nothing
   secret goes here.
     api            = the Web app URL of the "HIVnext Leaderboard API" Apps Script (ends in /exec)
     googleClientId = the OAuth Client ID from Google Cloud (ends in .apps.googleusercontent.com)
   Keep the quotes and the comma.
   ===================================================================== */
const LEADERBOARD = {
  api: "https://script.google.com/macros/s/AKfycbxlqfeKmWEMmzyAAGj6q9iS215PeRlXMcOPeghvkKCsdvpuwjqbhu_G6tMCm5aCxm7vTw/exec",
  googleClientId: "918847912961-2hcl6vabp5hi44atv2c3ebuc8k6ru73r.apps.googleusercontent.com"
};
