/**
 * Synthetic Journey Script (Observability v2)
 * Provides end-to-end journey validation with real HTTP requests
 * for deployment verification and continuous monitoring
 */

import { json, error } from '../utils/headers.js';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const SYNTHETIC_JOURNEY_ENABLED = process.env.SYNTHETIC_JOURNEY_ENABLED === 'true';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const USE_REAL_REQUESTS = process.env.SYNTHETIC_USE_REAL_REQUESTS !== 'false'; // Default to true

/**
 * Make HTTP request helper
 */
const makeRequest = (method, path, data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Valine-Synthetic-Journey/2.0',
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

/**
 * Execute a single journey step
 */
const executeStep = async (stepName, fn) => {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    return {
      step: stepName,
      status: 'passed',
      duration,
      result,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    return {
      step: stepName,
      status: 'failed',
      duration,
      error: err.message,
      stack: err.stack,
    };
  }
};

/**
 * Real journey steps with actual HTTP requests
 */
const realJourneySteps = {
  async register() {
    const timestamp = Date.now();
    const email = `synthetic-${timestamp}@valine-test.local`;
    const username = `synthetic${timestamp}`;
    const displayName = `Synthetic User ${timestamp}`;
    const password = crypto.randomBytes(16).toString('hex');

    const response = await makeRequest('POST', '/api/auth/register', {
      email,
      username,
      displayName,
      password,
    });

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Registration failed: ${response.statusCode} - ${JSON.stringify(response.body)}`);
    }

    return {
      email,
      username,
      password,
      userId: response.body.user?.id,
      verificationToken: response.body.verificationToken,
    };
  },

  async verify(context) {
    if (!context.verificationToken) {
      throw new Error('No verification token available');
    }

    const response = await makeRequest('POST', '/api/auth/verify-email', {
      token: context.verificationToken,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Email verification failed: ${response.statusCode}`);
    }

    return { verified: true };
  },

  async login(context) {
    if (!context.email || !context.password) {
      throw new Error('Email and password required for login');
    }

    const response = await makeRequest('POST', '/api/auth/login', {
      email: context.email,
      password: context.password,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Login failed: ${response.statusCode}`);
    }

    // Extract cookies from response headers
    const cookies = response.headers['set-cookie'] || [];
    const accessToken = cookies.find(c => c.startsWith('accessToken='));
    const refreshToken = cookies.find(c => c.startsWith('refreshToken='));

    return {
      loggedIn: true,
      userId: response.body.user?.id,
      accessToken: accessToken?.split(';')[0].split('=')[1],
      refreshToken: refreshToken?.split(';')[0].split('=')[1],
    };
  },

  async createProfile(context) {
    if (!context.accessToken) {
      throw new Error('Access token required for profile creation');
    }

    const response = await makeRequest('POST', '/api/profiles', {
      bio: 'Synthetic test profile for observability',
      location: 'Test Environment',
    }, {
      Cookie: `accessToken=${context.accessToken}`,
    });

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Profile creation failed: ${response.statusCode}`);
    }

    return { profileId: response.body.profile?.id || response.body.id };
  },

  async uploadMedia(context) {
    if (!context.accessToken) {
      throw new Error('Access token required for media upload');
    }

    // Note: This is a simplified version. Real media upload would need multipart/form-data
    const response = await makeRequest('POST', '/api/media/presigned-url', {
      fileName: `synthetic-test-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    }, {
      Cookie: `accessToken=${context.accessToken}`,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Media presigned URL request failed: ${response.statusCode}`);
    }

    return { mediaId: response.body.mediaId, presignedUrl: response.body.url };
  },

  async searchSelf(context) {
    if (!context.username) {
      throw new Error('Username required for search');
    }

    const response = await makeRequest('GET', `/api/search/users?q=${encodeURIComponent(context.username)}`);

    if (response.statusCode !== 200) {
      throw new Error(`Search failed: ${response.statusCode}`);
    }

    const found = response.body.users?.some(u => u.username === context.username);
    return { found, resultsCount: response.body.users?.length || 0 };
  },

  async exportData(context) {
    if (!context.accessToken) {
      throw new Error('Access token required for data export');
    }

    const response = await makeRequest('POST', '/api/users/export-data', {}, {
      Cookie: `accessToken=${context.accessToken}`,
    });

    if (response.statusCode !== 200 && response.statusCode !== 202) {
      throw new Error(`Data export failed: ${response.statusCode}`);
    }

    return { exportRequested: true, exportId: response.body.exportId };
  },

  async logout(context) {
    if (!context.accessToken) {
      throw new Error('Access token required for logout');
    }

    const response = await makeRequest('POST', '/api/auth/logout', {}, {
      Cookie: `accessToken=${context.accessToken}`,
    });

    if (response.statusCode !== 200) {
      throw new Error(`Logout failed: ${response.statusCode}`);
    }

    return { loggedOut: true };
  },
};

/**
 * Simulate user journey steps (fallback for testing)
 */
const simulatedJourneySteps = {
  async register() {
    // Simulate registration
    const email = `test-${Date.now()}@example.com`;
    const username = `testuser${Date.now()}`;
    return { email, username, simulated: true };
  },

  async verify(context) {
    // Simulate email verification
    return { verified: true, simulated: true };
  },

  async login(context) {
    // Simulate login
    return { loggedIn: true, userId: crypto.randomUUID(), simulated: true };
  },

  async createProfile(context) {
    // Simulate profile creation
    return { profileId: crypto.randomUUID(), simulated: true };
  },

  async uploadMedia(context) {
    // Simulate media upload
    return { mediaId: crypto.randomUUID(), simulated: true };
  },

  async searchSelf(context) {
    // Simulate search
    return { found: true, simulated: true };
  },

  async exportData(context) {
    // Simulate data export
    return { exportSize: 1024, simulated: true };
  },

  async logout(context) {
    // Simulate logout
    return { loggedOut: true, simulated: true };
  },
};

/**
 * POST /internal/journey/run
 * Run synthetic journey
 * Body: { scenarios?: string[], mode?: 'real' | 'simulated' }
 */
export const runSyntheticJourney = async (event) => {
  try {
    if (!SYNTHETIC_JOURNEY_ENABLED) {
      return error('Synthetic journey feature is not enabled', 404);
    }

    const body = JSON.parse(event.body || '{}');
    const scenarios = body.scenarios || [
      'register',
      'verify',
      'login',
      'createProfile',
      'uploadMedia',
      'searchSelf',
      'exportData',
      'logout',
    ];

    // Determine which journey steps to use
    const mode = body.mode || (USE_REAL_REQUESTS ? 'real' : 'simulated');
    const journeySteps = mode === 'real' ? realJourneySteps : simulatedJourneySteps;

    const startTime = Date.now();
    const results = [];
    const context = {}; // Shared context between steps

    // Execute each scenario step
    for (const scenario of scenarios) {
      if (journeySteps[scenario]) {
        const stepResult = await executeStep(scenario, () => journeySteps[scenario](context));
        results.push(stepResult);

        // Store result in context for next steps
        if (stepResult.status === 'passed') {
          Object.assign(context, stepResult.result);
        } else {
          // Stop on first failure
          break;
        }
      } else {
        results.push({
          step: scenario,
          status: 'failed',
          duration: 0,
          error: `Unknown scenario: ${scenario}`,
        });
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedSteps = results.filter(r => r.status === 'passed').length;
    const failedSteps = results.filter(r => r.status === 'failed').length;
    const overallStatus = failedSteps === 0 ? 'passed' : 'failed';

    return json({
      journey: {
        status: overallStatus,
        mode,
        totalDuration,
        steps: results,
        summary: {
          total: results.length,
          passed: passedSteps,
          failed: failedSteps,
          successRate: Math.round((passedSteps / results.length) * 100),
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        apiBaseUrl: API_BASE_URL,
        mode,
      },
    });
  } catch (e) {
    console.error('Synthetic journey error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
