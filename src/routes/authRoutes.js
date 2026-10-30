const express = require('express');
const router = express.Router();
const { oauth2Client, SCOPES } = require('../config/googleAuth');

// 1. Send user to Google's consent screen
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// 2. Google redirects back here with authorization code
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Redirect user to the frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?auth=success`);
  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

module.exports = router;
