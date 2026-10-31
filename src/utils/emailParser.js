/**
 * GhostGuard Email Parser Utility
 * Extracts direct registrations and Google OAuth SSO third-party authorization notifications.
 */
const {
  assignCategory,
  extractServiceMetadata,
  parseGoogleAccountSharingEmail,
} = require('../services/parserService');
const { GMAIL_SEARCH_QUERY } = require('../services/gmailService');

module.exports = {
  GMAIL_SEARCH_QUERY,
  assignCategory,
  extractServiceMetadata,
  parseGoogleAccountSharingEmail,
};

