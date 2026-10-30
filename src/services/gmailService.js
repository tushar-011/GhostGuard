const { google } = require('googleapis');

/**
 * Searches and fetches messages matching registration/welcome patterns
 */
async function fetchAccountDiscoveryEmails(authClient) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });

  // Targeted query to catch account activations, welcome emails, and verifications
  const searchQuery = 'subject:("welcome" OR "verify your email" OR "confirm your account" OR "registration" OR "thanks for signing up" OR "activate your account")';

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: searchQuery,
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

module.exports = { fetchAccountDiscoveryEmails };
