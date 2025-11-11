/**
 * Phases 4-7: Internal Tooling Tests
 * Tests for PR Intelligence, Flaky Test Detector, Schema Diff, and Synthetic Journey
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';

describe('Phase 4: PR Intelligence Backend Hook', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
  const WEBHOOK_SECRET = process.env.PR_INTEL_WEBHOOK_SECRET || 'test-secret-123';

  const generateHMAC = (payload) => {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(JSON.stringify(payload));
    return 'sha256=' + hmac.digest('hex');
  };

  describe('PR Intel Ingestion', () => {
    it('should reject request without HMAC signature', async () => {
      if (process.env.PR_INTEL_ENABLED !== 'true') {
        console.warn('Skipping test: PR_INTEL_ENABLED flag is false');
        return;
      }

      const payload = {
        prNumber: 123,
        changedFilesCount: 5,
        sensitivePathsCount: 1,
        riskScore: 3.5,
      };

      const response = await fetch(`${API_BASE}/internal/pr-intel/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(403);
    });

    it('should reject request with invalid HMAC signature', async () => {
      if (process.env.PR_INTEL_ENABLED !== 'true') {
        console.warn('Skipping test: PR_INTEL_ENABLED flag is false');
        return;
      }

      const payload = {
        prNumber: 123,
        changedFilesCount: 5,
        sensitivePathsCount: 1,
        riskScore: 3.5,
      };

      const response = await fetch(`${API_BASE}/internal/pr-intel/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=invalid',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(403);
    });

    it('should accept request with valid HMAC signature', async () => {
      if (process.env.PR_INTEL_ENABLED !== 'true') {
        console.warn('Skipping test: PR_INTEL_ENABLED flag is false');
        return;
      }

      const payload = {
        prNumber: 123,
        changedFilesCount: 5,
        sensitivePathsCount: 1,
        riskScore: 3.5,
      };

      const signature = generateHMAC(payload);

      const response = await fetch(`${API_BASE}/internal/pr-intel/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature,
        },
        body: JSON.stringify(payload),
      });

      expect([201, 200]).toContain(response.status);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.prNumber).toBe(123);
    });
  });

  describe('PR Intel Retrieval', () => {
    it('should retrieve PR intelligence data', async () => {
      if (process.env.PR_INTEL_ENABLED !== 'true') {
        console.warn('Skipping test: PR_INTEL_ENABLED flag is false');
        return;
      }

      // First ingest a record
      const payload = {
        prNumber: 456,
        changedFilesCount: 3,
        sensitivePathsCount: 0,
        riskScore: 1.5,
      };

      const signature = generateHMAC(payload);

      await fetch(`${API_BASE}/internal/pr-intel/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature,
        },
        body: JSON.stringify(payload),
      });

      // Retrieve it
      const response = await fetch(`${API_BASE}/internal/pr-intel/456`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.prNumber).toBe(456);
      expect(data.records).toBeDefined();
      expect(Array.isArray(data.records)).toBe(true);
    });
  });
});

describe('Phase 5: Flaky Test Detector', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  describe('Test Run Ingestion', () => {
    it('should ingest test results', async () => {
      if (process.env.FLAKY_DETECTOR_ENABLED !== 'true') {
        console.warn('Skipping test: FLAKY_DETECTOR_ENABLED flag is false');
        return;
      }

      const payload = {
        tests: [
          {
            suite: 'auth',
            testName: 'login should succeed',
            status: 'passed',
            durationMs: 150,
          },
          {
            suite: 'auth',
            testName: 'logout should succeed',
            status: 'passed',
            durationMs: 50,
          },
        ],
      };

      const response = await fetch(`${API_BASE}/internal/tests/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect([201, 200]).toContain(response.status);

      const data = await response.json();
      expect(data.count).toBe(2);
    });
  });

  describe('Flaky Candidate Detection', () => {
    it('should return flaky test candidates', async () => {
      if (process.env.FLAKY_DETECTOR_ENABLED !== 'true') {
        console.warn('Skipping test: FLAKY_DETECTOR_ENABLED flag is false');
        return;
      }

      const response = await fetch(`${API_BASE}/internal/tests/flaky-candidates?minRuns=5`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.flakyCandidates).toBeDefined();
      expect(Array.isArray(data.flakyCandidates)).toBe(true);
      expect(data.minRuns).toBe(5);
    });
  });
});

describe('Phase 6: Schema Diff & Risk Analyzer', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should analyze schema differences', async () => {
    if (process.env.SCHEMA_DIFF_ENABLED !== 'true') {
      console.warn('Skipping test: SCHEMA_DIFF_ENABLED flag is false');
      return;
    }

    const baseSchema = `
model User {
  id String @id @default(uuid())
  email String @unique
}
    `;

    const targetSchema = `
model User {
  id String @id @default(uuid())
  email String @unique
  username String
}
    `;

    const response = await fetch(`${API_BASE}/internal/schema/diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseSchema, targetSchema }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.operations).toBeDefined();
    expect(Array.isArray(data.operations)).toBe(true);
    expect(data.riskScore).toBeDefined();
    expect(data.windowRecommendation).toBeDefined();
    expect(data.summary).toBeDefined();

    // Should detect added field
    const addFieldOp = data.operations.find(op => op.type === 'addField');
    expect(addFieldOp).toBeDefined();
    expect(addFieldOp.field).toBe('username');
  });

  it('should calculate risk scores correctly', async () => {
    if (process.env.SCHEMA_DIFF_ENABLED !== 'true') {
      console.warn('Skipping test: SCHEMA_DIFF_ENABLED flag is false');
      return;
    }

    const baseSchema = `
model User {
  id String @id
  email String
  username String
}
    `;

    const targetSchema = `
model User {
  id String @id
  email String
}
    `;

    const response = await fetch(`${API_BASE}/internal/schema/diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseSchema, targetSchema }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();

    // Dropping a field should have higher risk
    expect(data.riskScore).toBeGreaterThan(5);
    expect(data.summary.hasDestructive).toBe(true);
  });
});

describe('Phase 7: Synthetic Journey', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should execute synthetic journey successfully', async () => {
    if (process.env.SYNTHETIC_JOURNEY_ENABLED !== 'true') {
      console.warn('Skipping test: SYNTHETIC_JOURNEY_ENABLED flag is false');
      return;
    }

    const response = await fetch(`${API_BASE}/internal/journey/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarios: ['register', 'verify', 'login', 'logout'],
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.journey).toBeDefined();
    expect(data.journey.status).toBeDefined();
    expect(data.journey.steps).toBeDefined();
    expect(Array.isArray(data.journey.steps)).toBe(true);
    expect(data.journey.summary).toBeDefined();
    expect(data.journey.summary.total).toBe(4);
  });

  it('should track step timing and status', async () => {
    if (process.env.SYNTHETIC_JOURNEY_ENABLED !== 'true') {
      console.warn('Skipping test: SYNTHETIC_JOURNEY_ENABLED flag is false');
      return;
    }

    const response = await fetch(`${API_BASE}/internal/journey/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarios: ['register', 'login'],
      }),
    });

    const data = await response.json();

    data.journey.steps.forEach(step => {
      expect(step.step).toBeDefined();
      expect(step.status).toMatch(/^(passed|failed)$/);
      expect(step.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
