const { google } = require('googleapis');

/**
 * Expanded Gmail search query to capture direct signups and Google OAuth third-party sharing alerts
 */
const GMAIL_SEARCH_QUERY = [
  'subject:("welcome" OR "verify" OR "confirm your account" OR "activate" OR "registration" OR "getting started" OR "You shared some Google Account data with" OR "was granted access to your Google Account")',
  'OR from:noreply-accounts@google.com ("You shared some Google Account data with" OR "used Sign in with Google to sign in to" OR "granted access")'
].join(' ');

/**
 * Searches and fetches messages matching registration/welcome patterns
 */
async function fetchAccountDiscoveryEmails(authClient) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: GMAIL_SEARCH_QUERY,
    maxResults: 200
  });

  const messages = response.data.messages || [];
  if (!messages.length) return [];

  const emailDetails = await Promise.all(
    messages.map(async (msg) => {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = detail.data.payload.headers || [];
        const getHeader = (name) => {
          const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
          return found ? found.value : '';
        };

        return {
          id: msg.id,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet || ''
        };
      } catch (err) {
        console.error(`Failed to fetch message details for ID ${msg.id}:`, err.message);
        return null;
      }
    })
  );

  return emailDetails.filter(Boolean);
}

module.exports = {
  GMAIL_SEARCH_QUERY,
  fetchAccountDiscoveryEmails,
};
