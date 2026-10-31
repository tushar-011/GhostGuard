/**
 * Categorizes a domain into a logical group
 */
function assignCategory(domain) {
  const productivity = ['notion', 'slack', 'trello', 'figma', 'canva', 'zoom', 'atlassian', 'asana', 'linear'];
  const dev = ['github', 'gitlab', 'stackoverflow', 'docker', 'vercel', 'netlify', 'postman'];
  const social = ['twitter', 'x', 'instagram', 'linkedin', 'reddit', 'discord', 'facebook', 'spotify', 'pinterest', 'medium', 'quora'];
  const finance = ['paypal', 'stripe', 'razorpay', 'coinbase', 'binance', 'wise'];

  const root = (domain || '').split('.')[0].toLowerCase();

  if (productivity.includes(root)) return 'Productivity';
  if (dev.includes(root)) return 'Developer';
  if (social.includes(root)) return 'Social & Media';
  if (finance.includes(root)) return 'Finance';
  return 'General Service';
}

/**
 * Detects and extracts third-party service names from Google Security / OAuth emails.
 * Supports a headers array, an email object, or individual parameters.
 *
 * @param {Array<{ name: string, value: string }>|object|string} headers
 * @param {string} [bodySnippet='']
 * @param {string} [fullBodyText='']
 * @returns {object|null}
 */
function parseGoogleAccountSharingEmail(headers, bodySnippet = '', fullBodyText = '') {
  let fromHeader = '';
  let subjectHeader = '';
  let dateHeader = '';
  let snippet = bodySnippet || '';
  let body = fullBodyText || '';

  if (Array.isArray(headers)) {
    fromHeader = headers.find((h) => h.name && h.name.toLowerCase() === 'from')?.value || '';
    subjectHeader = headers.find((h) => h.name && h.name.toLowerCase() === 'subject')?.value || '';
    dateHeader = headers.find((h) => h.name && h.name.toLowerCase() === 'date')?.value || '';
  } else if (headers && typeof headers === 'object') {
    if (Array.isArray(headers.headers)) {
      fromHeader = headers.headers.find((h) => h.name && h.name.toLowerCase() === 'from')?.value || '';
      subjectHeader = headers.headers.find((h) => h.name && h.name.toLowerCase() === 'subject')?.value || '';
      dateHeader = headers.headers.find((h) => h.name && h.name.toLowerCase() === 'date')?.value || '';
    }
    fromHeader = fromHeader || headers.from || '';
    subjectHeader = subjectHeader || headers.subject || '';
    dateHeader = dateHeader || headers.date || '';
    snippet = snippet || headers.snippet || '';
    body = body || headers.body || headers.fullBodyText || '';
  } else if (typeof headers === 'string') {
    fromHeader = headers;
  }

  // Verify it is an authentic Google Account notification
  const lowerFrom = fromHeader.toLowerCase();
  if (!lowerFrom.includes('google.com') && !lowerFrom.includes('accounts@google.com') && !lowerFrom.includes('noreply-accounts@google.com')) {
    return null;
  }

  let serviceName = null;
  let domain = null;

  // Pattern 1: "You shared some Google Account data with {ServiceName}" or "{ServiceName} was granted access"
  const subjectMatch = subjectHeader.match(/You shared some Google Account data with\s+([^.]+)/i)
    || subjectHeader.match(/([A-Za-z0-9\.\-\s]+?)\s+was granted access to your Google Account/i)
    || subjectHeader.match(/granted\s+([A-Za-z0-9\.\-\s]+?)\s+access to your Google Account/i);

  if (subjectMatch && subjectMatch[1]) {
    serviceName = subjectMatch[1].trim();
  }

  // Pattern 2: Inspect body text for "used Sign in with Google to sign in to {ServiceName}"
  if (!serviceName) {
    const textToSearch = `${body} ${snippet}`.trim();
    const bodyMatch = textToSearch.match(/used Sign in with Google to sign in to\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s*\.|\s*,|\s*$)/i)
      || textToSearch.match(/([A-Za-z0-9\.\-]+)\s+received this profile info/i)
      || textToSearch.match(/You shared some Google Account data with\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s*\.|\s*,|\s*$)/i)
      || textToSearch.match(/granted\s+([A-Za-z0-9\.\-\s]+?)\s+access to your Google Account/i);
    if (bodyMatch && bodyMatch[1]) {
      serviceName = bodyMatch[1].trim();
    }
  }

  if (serviceName) {
    // Sanitize and derive domain (e.g., "Reddit" -> "reddit.com")
    const cleanName = serviceName.replace(/[^\w\s\.\-]/g, '').replace(/\.+$/, '').trim();
    const commonDomains = {
      'reddit': 'reddit.com',
      'canva': 'canva.com',
      'notion': 'notion.so',
      'figma': 'figma.com',
      'spotify': 'spotify.com',
      'discord': 'discord.com',
      'airbnb': 'airbnb.com',
      'uber': 'uber.com',
      'pinterest': 'pinterest.com',
      'slack': 'slack.com',
      'trello': 'trello.com',
      'zoom': 'zoom.us',
      'medium': 'medium.com',
      'quora': 'quora.com',
      'dropbox': 'dropbox.com',
      'github': 'github.com',
      'gitlab': 'gitlab.com',
      'linear': 'linear.app',
      'openai': 'openai.com',
      'chatgpt': 'openai.com'
    };

    const lowerName = cleanName.toLowerCase();
    if (cleanName.includes('.') && !cleanName.endsWith('.')) {
      domain = cleanName.toLowerCase();
    } else {
      domain = commonDomains[lowerName] || `${lowerName.replace(/\s+/g, '')}.com`;
    }

    const category = assignCategory(domain) !== 'General Service' ? assignCategory(domain) : 'Social & Media';

    return {
      serviceName: cleanName,
      domain: domain,
      category: category,
      authMethod: 'Google OAuth SSO',
      ghostScore: 45, // default baseline for active OAuth link
      riskLevel: 'MEDIUM',
      detectedDate: dateHeader || new Date().toISOString(),
      status: 'UNREVIEWED',
      details: 'Connected via Google Single Sign-On (Account Data Shared)',
      firstDiscoveredEmail: subjectHeader || `You shared some Google Account data with ${cleanName}`,
      snippet: snippet || 'Connected via Sign in with Google (OAuth Data Shared)',
      recommendedAction: 'Keep | Secure | Revoke'
    };
  }

  return null;
}

/**
 * Parses raw email headers to identify unique third-party services,
 * detecting both direct registration receipts and Google OAuth SSO authorization alerts.
 */
function extractServiceMetadata(emailList = []) {
  const servicesMap = new Map();

  emailList.forEach((email) => {
    if (!email) return;

    // 1. Check if email is a Google OAuth / Account Sharing alert
    const googleOAuthAsset = parseGoogleAccountSharingEmail(
      email.headers || email,
      email.snippet,
      email.body || email.fullBodyText
    );

    if (googleOAuthAsset && googleOAuthAsset.domain) {
      if (!servicesMap.has(googleOAuthAsset.domain)) {
        servicesMap.set(googleOAuthAsset.domain, googleOAuthAsset);
      }
      return;
    }

    const fromHeader = email.from;
    if (!fromHeader) return;

    // Extract address inside angle brackets: "Name <user@domain.com>"
    const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
    const emailAddress = emailMatch[1] ? emailMatch[1].trim() : fromHeader.trim();
    const domainMatch = emailAddress.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    if (domainMatch) {
      let domain = domainMatch[1].toLowerCase();

      // Filter out self-referential Google notifications that are not third-party authorizations
      if (domain.includes('google.com') || domain.includes('gmail.com')) {
        return;
      }

      // Strip subdomains (e.g. mail.netflix.com -> netflix.com)
      const domainParts = domain.split('.');
      if (domainParts.length > 2) {
        domain = domainParts.slice(-2).join('.');
      }

      // Extract sender display name or capitalize domain
      let serviceName = fromHeader.split('<')[0].replace(/["']/g, '').trim();
      if (!serviceName) {
        serviceName = domain.split('.')[0].toUpperCase();
      }

      if (!servicesMap.has(domain)) {
        servicesMap.set(domain, {
          serviceName,
          domain,
          category: assignCategory(domain),
          firstDiscoveredEmail: email.subject,
          detectedDate: email.date,
          snippet: email.snippet,
          riskLevel: 'Review Needed',
          recommendedAction: 'Keep | Secure | Revoke',
          authMethod: 'Direct Registration'
        });
      }
    }
  });

  return Array.from(servicesMap.values());
}

module.exports = {
  assignCategory,
  extractServiceMetadata,
  parseGoogleAccountSharingEmail,
};
