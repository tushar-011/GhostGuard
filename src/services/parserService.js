/**
 * Categorizes a domain into a logical group
 */
function assignCategory(domain) {
  const productivity = ['notion', 'slack', 'trello', 'figma', 'canva', 'zoom', 'atlassian', 'asana'];
  const dev = ['github', 'gitlab', 'stackoverflow', 'docker', 'vercel', 'netlify', 'postman'];
  const social = ['twitter', 'x', 'instagram', 'linkedin', 'reddit', 'discord', 'facebook', 'spotify'];
  const finance = ['paypal', 'stripe', 'razorpay', 'coinbase', 'binance', 'wise'];

  const root = domain.split('.')[0].toLowerCase();

  if (productivity.includes(root)) return 'Productivity';
  if (dev.includes(root)) return 'Developer';
  if (social.includes(root)) return 'Social & Media';
  if (finance.includes(root)) return 'Finance';
  return 'General Service';
}

/**
 * Parses raw email headers to identify unique third-party services
 */
function extractServiceMetadata(emailList) {
  const servicesMap = new Map();

  emailList.forEach((email) => {
    const fromHeader = email.from;
    if (!fromHeader) return;

    // Extract address inside angle brackets: "Name <user@domain.com>"
    const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
    const emailAddress = emailMatch[1] ? emailMatch[1].trim() : fromHeader.trim();
    const domainMatch = emailAddress.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    if (domainMatch) {
      let domain = domainMatch[1].toLowerCase();

      // Filter out self-referential Google notifications
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
          recommendedAction: 'Keep | Secure | Revoke'
        });
      }
    }
  });

  return Array.from(servicesMap.values());
}

module.exports = { assignCategory, extractServiceMetadata };
