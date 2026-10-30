/**
 * GhostGuard Backend API Client
 * Centralized service layer for communicating with the GhostGuard Node.js/Express backend.
 */

import { auth } from './firebase';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Common fetch helper with JSON parsing and standardized error handling
 * @param {string} endpoint
 * @param {RequestInit} [options={}]
 * @returns {Promise<any>}
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Automatically attach Firebase ID token if available
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!headers['Authorization'] && typeof window !== 'undefined') {
    try {
      if (auth && typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      if (auth && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
          window.localStorage.setItem('ghostguard_id_token', idToken);
        }
      } else {
        const cachedToken = window.localStorage.getItem('ghostguard_id_token');
        if (cachedToken) {
          headers['Authorization'] = `Bearer ${cachedToken}`;
        }
      }
    } catch (e) {
      const cachedToken = window.localStorage.getItem('ghostguard_id_token');
      if (cachedToken) {
        headers['Authorization'] = `Bearer ${cachedToken}`;
      }
    }
  }

  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Parse JSON body if present
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(
        (data && data.message) || (data && data.error) || `Request failed with status ${response.status}`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError = new Error(`Cannot connect to GhostGuard backend at ${API_BASE_URL}. Ensure the server is running on port 5000.`);
      networkError.status = 0;
      throw networkError;
    }
    throw err;
  }
}

/**
 * Authentication Endpoints
 */
export const authApi = {
  /**
   * Returns the OAuth 2.0 authorization URL
   * @returns {string}
   */
  getLoginUrl: () => `${API_BASE_URL}/auth/google`,

  /**
   * Checks current backend authentication status
   * @returns {Promise<{ success: boolean, authenticated: boolean, message: string }>}
   */
  checkStatus: async () => {
    return fetchApi('/auth/status');
  },

  /**
   * Logs out / clears active in-memory tokens
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  logout: async () => {
    return fetchApi('/auth/logout');
  },

  /**
   * Updates user profile in Firestore
   * @param {object} profileData
   * @returns {Promise<{ success: boolean, profile: any }>}
   */
  updateProfile: async (profileData) => {
    return fetchApi('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },
};

/**
 * Audit and Discovery Endpoints
 */
export const auditApi = {
  /**
   * Scans user inbox for account registration emails and applies risk scoring
   * @param {object} [params]
   * @param {boolean} [params.mock=false] - Run scan in mock demo mode
   * @returns {Promise<{ success: boolean, mode: string, count: number, assets: Array<any> }>}
   */
  scan: async ({ mock = false } = {}) => {
    const query = mock ? '?mock=true' : '';
    return fetchApi(`/api/audit/scan${query}`);
  },

  /**
   * Retrieves saved accounts directly from store without running full scan
   * @returns {Promise<{ success: boolean, count: number, assets: Array<any> }>}
   */
  getAccounts: async () => {
    return fetchApi('/api/audit/accounts');
  },

  /**
   * Fetches the formatted D3 / React Flow mind-map graph
   * @param {object} [params]
   * @param {string} [params.email] - Custom email for root node
   * @param {boolean} [params.mock=false] - Return mock graph if store is empty
   * @returns {Promise<{ success: boolean, graph: { nodes: Array<any>, edges: Array<any>, meta: any } }>}
   */
  getGraph: async ({ email, mock = false } = {}) => {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (mock) params.append('mock', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/api/audit/graph${query}`);
  },

  /**
   * Updates an audited service's action status
   * @param {object} payload
   * @param {string} payload.domain - e.g. "notion.so"
   * @param {'KEPT' | 'SECURED' | 'MARKED_FOR_DELETION' | 'REVOKED' | 'REMOVE_RECORD'} payload.action
   * @param {string} [payload.notes]
   * @returns {Promise<{ success: boolean, message: string, account: any }>}
   */
  updateAction: async ({ domain, action, notes }) => {
    return fetchApi('/api/audit/action', {
      method: 'POST',
      body: JSON.stringify({ domain, action, notes }),
    });
  },

  /**
   * Permanently removes an asset record from audit store
   * @param {string} domain
   * @returns {Promise<{ success: boolean, removedDomain: string, stats: any }>}
   */
  removeAsset: async (domain) => {
    return fetchApi('/api/audit/action', {
      method: 'POST',
      body: JSON.stringify({ domain, action: 'REMOVE_RECORD' }),
    });
  },

  /**
   * Retrieves aggregated audit statistics
   * @param {object} [params]
   * @param {boolean} [params.mock=false]
   * @returns {Promise<{ success: boolean, stats: { totalDiscovered: number, dormantCount: number, highRiskCount: number, reviewedCount: number, riskBreakdown: any, statusBreakdown: any, categoryBreakdown: any } }>}
   */
  getStats: async ({ mock = false } = {}) => {
    const query = mock ? '?mock=true' : '';
    return fetchApi(`/api/audit/stats${query}`);
  },

  /**
   * Clears the stored audit findings cache
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  clearCache: async () => {
    return fetchApi('/api/audit/clear', {
      method: 'POST',
    });
  },
};

const api = {
  API_BASE_URL,
  auth: authApi,
  audit: auditApi,
};

export default api;
