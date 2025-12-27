/**
 * Environment Variable Validation Module
 * Provides fail-fast runtime validation for critical environment variables
 * to prevent 503 outages from missing or invalid configuration
 */

import crypto from 'crypto';

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Validation rules for each environment variable
 */
const ENV_VAR_RULES = {
  // Critical - must be set and valid
  DATABASE_URL: {
    required: true,
    validate: (value) => {
      if (!value) return { valid: false, error: 'DATABASE_URL is required' };
      if (value.includes(' ')) return { valid: false, error: 'DATABASE_URL contains spaces' };
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return { valid: false, error: 'DATABASE_URL must start with postgresql:// or postgres://' };
      }
      return { valid: true };
    }
  },
  
  JWT_SECRET: {
    required: true,
    validate: (value, env) => {
      if (!value) return { valid: false, error: 'JWT_SECRET is required' };
      if (env === 'production' && value === 'dev-secret-key-change-in-production') {
        return { valid: false, error: 'JWT_SECRET must not use default value in production' };
      }
      if (value.length < 32) {
        return { valid: false, error: 'JWT_SECRET must be at least 32 characters' };
      }
      return { valid: true };
    }
  },
  
  NODE_ENV: {
    required: true,
    validate: (value) => {
      if (!value) return { valid: false, error: 'NODE_ENV is required' };
      const validEnvs = ['development', 'test', 'production'];
      if (!validEnvs.includes(value)) {
        return { valid: false, error: `NODE_ENV must be one of: ${validEnvs.join(', ')}` };
      }
      return { valid: true };
    }
  },
  
  // Important - should be set but not critical for startup
  MEDIA_BUCKET: {
    required: false,
    validate: (value) => {
      if (!value) return { valid: true, warning: 'MEDIA_BUCKET not set, media uploads will fail' };
      return { valid: true };
    }
  },
  
  FRONTEND_URL: {
    required: false,
    validate: (value) => {
      if (!value) return { valid: true, warning: 'FRONTEND_URL not set, CORS may not work correctly' };
      try {
        new URL(value);
        return { valid: true };
      } catch {
        return { valid: false, error: 'FRONTEND_URL must be a valid URL' };
      }
    }
  }
};

/**
 * Validate all critical environment variables
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {ValidationResult} Validation result
 */
export function validateEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];
  
  const nodeEnv = env.NODE_ENV || 'development';
  
  // Validate each required environment variable
  for (const [key, rules] of Object.entries(ENV_VAR_RULES)) {
    const value = env[key];
    
    if (rules.required && !value) {
      errors.push(`${key} is required but not set`);
      continue;
    }
    
    if (rules.validate) {
      const result = rules.validate(value, nodeEnv);
      if (!result.valid) {
        if (result.error) {
          errors.push(`${key}: ${result.error}`);
        }
      }
      if (result.warning) {
        warnings.push(`${key}: ${result.warning}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results
 * @param {ValidationResult} result - Validation result
 * @param {string} correlationId - Optional correlation ID for tracking
 */
export function logValidationResult(result, correlationId = null) {
  const logData = {
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
    event: 'env_validation',
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length
  };
  
  if (result.valid) {
    if (result.warnings.length > 0) {
      console.warn('[EnvValidation] Validation passed with warnings:', {
        ...logData,
        warnings: result.warnings
      });
    } else {
      console.log('[EnvValidation] All required environment variables validated successfully', logData);
    }
  } else {
    console.error('[EnvValidation] Environment validation FAILED:', {
      ...logData,
      errors: result.errors,
      ...(result.warnings.length > 0 && { warnings: result.warnings })
    });
  }
}

/**
 * Validate environment and throw error if validation fails
 * Use this at module startup to fail-fast
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @param {string} correlationId - Optional correlation ID for tracking
 * @throws {Error} If validation fails
 */
export function validateEnvironmentOrThrow(env = process.env, correlationId = null) {
  const result = validateEnvironment(env);
  logValidationResult(result, correlationId);
  
  if (!result.valid) {
    const errorMessage = `Environment validation failed:\n${result.errors.join('\n')}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Validate a single environment variable
 * @param {string} key - Environment variable name
 * @param {string} value - Environment variable value
 * @param {string} nodeEnv - Current NODE_ENV
 * @returns {Object} Validation result
 */
export function validateEnvVar(key, value, nodeEnv = 'development') {
  const rules = ENV_VAR_RULES[key];
  if (!rules) {
    return { valid: true };
  }
  
  if (rules.required && !value) {
    return { valid: false, error: `${key} is required but not set` };
  }
  
  if (rules.validate) {
    return rules.validate(value, nodeEnv);
  }
  
  return { valid: true };
}

/**
 * Get a list of all required environment variables
 * @returns {string[]} Array of required environment variable names
 */
export function getRequiredEnvVars() {
  return Object.entries(ENV_VAR_RULES)
    .filter(([_, rules]) => rules.required)
    .map(([key, _]) => key);
}

/**
 * Generate a secure random JWT secret (for initial setup)
 * @returns {string} A secure random string suitable for JWT_SECRET
 */
export function generateSecureJwtSecret() {
  return crypto.randomBytes(64).toString('hex');
}
