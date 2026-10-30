/**
 * Risk Assessment Utility for GhostGuard
 * Evaluates discovered accounts, calculates age, flags dormant "ghost" candidates,
 * determines security risk levels, computes a 0-100 ghostScore, and provides actionable remediation tips.
 */

/**
 * Calculates age in days and months from a detected date
 * @param {string|Date} detectedDate
 * @returns {{ ageInDays: number, ageInMonths: number, parsedDate: Date|null }}
 */
function calculateAccountAge(detectedDate) {
  if (!detectedDate) {
    return { ageInDays: 0, ageInMonths: 0, parsedDate: null };
  }

  const parsedDate = new Date(detectedDate);
  if (isNaN(parsedDate.getTime())) {
    return { ageInDays: 0, ageInMonths: 0, parsedDate: null };
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - parsedDate.getTime());
  const ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  // Standardized month calculation (30.4375 average days per month)
  const ageInMonths = Math.floor(ageInDays / 30.4375);

  return { ageInDays, ageInMonths, parsedDate };
}

/**
 * Evaluates risk level based on domain, category, and discovery age
 * - High Risk: Financial services > 6 months old OR Developer services > 12 months old
 * - Medium Risk: Social media or general accounts > 18 months old, or Productivity > 12 months
 * - Low Risk: Accounts created < 6 months ago
 *
 * @param {string} category
 * @param {number} ageInMonths
 * @param {string} domain
 * @returns {'High' | 'Medium' | 'Low'}
 */
function determineRiskLevel(category, ageInMonths, domain = '') {
  const normCategory = (category || '').toLowerCase();
  const normDomain = (domain || '').toLowerCase();

  // High-value critical domains (AWS, Google Cloud, Docker, Stripe, PayPal, etc.)
  const isCriticalDevOrCloud = normCategory === 'developer' ||
    /\b(aws|digitalocean|docker|github|gitlab|cloud|azure|mongodb)\b/.test(normDomain);

  const isFinancial = normCategory === 'finance' ||
    /\b(bank|stripe|paypal|coinbase|binance|wise|razorpay|plaid)\b/.test(normDomain);

  // High Risk Criteria
  if (isFinancial && ageInMonths > 6) {
    return 'High';
  }
  if (isCriticalDevOrCloud && ageInMonths > 12) {
    return 'High';
  }

  // Low Risk Criteria (Recently registered or actively maintained within 6 months)
  if (ageInMonths < 6) {
    return 'Low';
  }

  // Medium Risk Criteria (Social media or general services older than 18 months)
  if ((normCategory.includes('social') || normCategory.includes('general')) && ageInMonths > 18) {
    return 'Medium';
  }

  // Productivity tools older than 12 months without confirmed interaction
  if (normCategory.includes('productivity') && ageInMonths > 12) {
    return 'Medium';
  }

  // For accounts between 6 and 18 months in general/social/productivity
  if (ageInMonths >= 12) {
    return 'Medium';
  }

  return 'Low';
}

/**
 * Computes a standardized 0-100 ghostScore
 * 100 = critically orphaned/dangerous digital asset, 0 = brand new/low concern
 *
 * @param {object} params
 * @param {number} params.ageInDays
 * @param {number} params.ageInMonths
 * @param {'High'|'Medium'|'Low'} params.riskLevel
 * @param {string} params.category
 * @param {boolean} params.isDormant
 * @returns {number} Integer between 0 and 100
 */
function calculateGhostScore({ ageInDays, ageInMonths, riskLevel, category, isDormant }) {
  let score = 0;

  // 1. Age Factor (up to 40 points)
  // Maxes out around 2 years (730 days)
  const ageScore = Math.min(40, Math.floor((ageInDays / 730) * 40));
  score += ageScore;

  // 2. Risk Level Baseline
  if (riskLevel === 'High') {
    score += 35;
  } else if (riskLevel === 'Medium') {
    score += 20;
  } else {
    score += 5;
  }

  // 3. Category Sensitivity Weighting
  const cat = (category || '').toLowerCase();
  if (cat === 'finance') {
    score += 15;
  } else if (cat === 'developer') {
    score += 12;
  } else if (cat.includes('social')) {
    score += 8;
  } else if (cat.includes('productivity')) {
    score += 5;
  } else {
    score += 3;
  }

  // 4. Dormancy Multiplier
  if (isDormant) {
    score += 10;
  }

  // Cap between 0 and 100
  return Math.min(100, Math.max(0, score));
}

/**
 * Returns contextual remediation instructions based on category and risk level
 * @param {string} category
 * @param {'High'|'Medium'|'Low'} riskLevel
 * @param {string} domain
 * @returns {string}
 */
function getRemediationTip(category, riskLevel, domain = '') {
  const normCategory = (category || '').toLowerCase();

  if (normCategory === 'finance') {
    if (riskLevel === 'High') {
      return 'Critical: Audit linked bank accounts and saved cards. Check for recurring subscription charges and enable MFA or initiate account closure via settings.';
    }
    return 'Verify multi-factor authentication (2FA) is enabled and remove any expired or unused payment cards.';
  }

  if (normCategory === 'developer') {
    if (riskLevel === 'High') {
      return 'Audit active Personal Access Tokens (PATs), SSH keys, and cloud permissions. Delete dormant organization seats or revoke API credentials.';
    }
    return 'Enforce hardware 2FA / WebAuthn security keys and review active OAuth application authorizations.';
  }

  if (normCategory.includes('social')) {
    if (riskLevel === 'High' || riskLevel === 'Medium') {
      return 'Export account data archive and delete account via settings to prevent identity footprint leaks or unauthorized credential stuffing.';
    }
    return 'Review profile visibility, tighten privacy controls, and disconnect unused third-party logins.';
  }

  if (normCategory.includes('productivity')) {
    if (riskLevel === 'High' || riskLevel === 'Medium') {
      return 'Export workspace documents, revoke team permissions, and delete your member seat via organization account settings.';
    }
    return 'Verify single sign-on (SSO) configuration and review active team workspace memberships.';
  }

  // General fallback
  if (riskLevel === 'High' || riskLevel === 'Medium') {
    return 'Navigate to security settings, request complete data deletion under GDPR/CCPA, and terminate the account.';
  }
  return 'Unsubscribe from promotional emails and update passwords to unique passphrases.';
}

/**
 * Evaluates a single discovered asset and enriches it with full risk telemetry
 * @param {object} asset
 * @param {string} asset.detectedDate
 * @param {string} asset.category
 * @param {string} asset.domain
 * @returns {object}
 */
function evaluateRisk(asset) {
  const { detectedDate, category, domain } = asset;
  const { ageInDays, ageInMonths, parsedDate } = calculateAccountAge(detectedDate);

  // If discovered > 12 months ago: Flag as Dormant / Ghost Candidate
  const isDormant = ageInMonths >= 12;
  const flag = isDormant ? 'Dormant / Ghost Candidate' : 'Active / Recent';

  const riskLevel = determineRiskLevel(category, ageInMonths, domain);
  const ghostScore = calculateGhostScore({ ageInDays, ageInMonths, riskLevel, category, isDormant });
  const remediationTip = getRemediationTip(category, riskLevel, domain);

  // Align recommended action with risk level and dormancy
  let recommendedAction = 'Keep';
  if (riskLevel === 'High' && isDormant) {
    recommendedAction = 'Revoke';
  } else if (riskLevel === 'High') {
    recommendedAction = 'Secure';
  } else if (isDormant) {
    recommendedAction = 'Revoke';
  } else if (riskLevel === 'Medium') {
    recommendedAction = 'Secure';
  }

  return {
    ...asset,
    ageInDays,
    ageInMonths,
    formattedDate: parsedDate ? parsedDate.toISOString() : detectedDate,
    isDormant,
    flag,
    riskLevel,
    ghostScore,
    remediationTip,
    recommendedAction
  };
}

module.exports = {
  calculateAccountAge,
  determineRiskLevel,
  calculateGhostScore,
  getRemediationTip,
  evaluateRisk
};

