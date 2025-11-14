/**
 * Schema Diff & Risk Analyzer (Phase 6)
 * Provides schema diff analysis for Prisma schema changes
 */

import { json, error } from '../utils/headers.js';

const SCHEMA_DIFF_ENABLED = process.env.SCHEMA_DIFF_ENABLED === 'true';

/**
 * Simple Prisma schema parser
 * Extracts models and fields from schema text
 */
const parseSchema = (schemaText) => {
  const models = {};
  const lines = schemaText.split('\n');
  let currentModel = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Model declaration
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      models[currentModel] = { fields: {} };
      continue;
    }

    // End of model
    if (trimmed === '}' && currentModel) {
      currentModel = null;
      continue;
    }

    // Field declaration
    if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
      const fieldMatch = trimmed.match(/^(\w+)\s+(\S+)/);
      if (fieldMatch) {
        const [, fieldName, fieldType] = fieldMatch;
        models[currentModel].fields[fieldName] = fieldType;
      }
    }
  }

  return models;
};

/**
 * Compute diff operations between two schemas
 */
const computeSchemaDiff = (baseSchema, targetSchema) => {
  const ops = [];
  const baseModels = parseSchema(baseSchema);
  const targetModels = parseSchema(targetSchema);

  // Check for added/removed models
  const baseModelNames = Object.keys(baseModels);
  const targetModelNames = Object.keys(targetModels);

  for (const modelName of targetModelNames) {
    if (!baseModels[modelName]) {
      ops.push({
        type: 'addModel',
        model: modelName,
        risk: 1, // Low risk
      });
    }
  }

  for (const modelName of baseModelNames) {
    if (!targetModels[modelName]) {
      ops.push({
        type: 'dropModel',
        model: modelName,
        risk: 10, // High risk - data loss
      });
    }
  }

  // Check for field changes in existing models
  for (const modelName of targetModelNames) {
    if (baseModels[modelName]) {
      const baseFields = baseModels[modelName].fields;
      const targetFields = targetModels[modelName].fields;

      for (const fieldName of Object.keys(targetFields)) {
        if (!baseFields[fieldName]) {
          ops.push({
            type: 'addField',
            model: modelName,
            field: fieldName,
            fieldType: targetFields[fieldName],
            risk: 2, // Low-medium risk
          });
        } else if (baseFields[fieldName] !== targetFields[fieldName]) {
          ops.push({
            type: 'alterType',
            model: modelName,
            field: fieldName,
            from: baseFields[fieldName],
            to: targetFields[fieldName],
            risk: 7, // Medium-high risk - potential data loss
          });
        }
      }

      for (const fieldName of Object.keys(baseFields)) {
        if (!targetFields[fieldName]) {
          ops.push({
            type: 'dropField',
            model: modelName,
            field: fieldName,
            risk: 8, // High risk - data loss
          });
        }
      }
    }
  }

  return ops;
};

/**
 * Calculate risk score and maintenance window recommendation
 */
const analyzeRisk = (ops) => {
  const totalRisk = ops.reduce((sum, op) => sum + op.risk, 0);
  const hasDestructive = ops.some(op => ['dropModel', 'dropField'].includes(op.type));
  const hasTypeChanges = ops.some(op => op.type === 'alterType');

  let windowRecommendation = 'low-traffic';
  if (totalRisk > 50 || hasDestructive) {
    windowRecommendation = 'scheduled-maintenance';
  } else if (totalRisk > 20 || hasTypeChanges) {
    windowRecommendation = 'off-peak';
  }

  return {
    totalRisk,
    hasDestructive,
    hasTypeChanges,
    windowRecommendation,
    severity: totalRisk > 50 ? 'high' : totalRisk > 20 ? 'medium' : 'low',
  };
};

/**
 * POST /internal/schema/diff
 * Analyze schema differences
 * Body: { baseSchema, targetSchema }
 */
export const analyzeSchemaDiff = async (event) => {
  try {
    if (!SCHEMA_DIFF_ENABLED) {
      return error('Schema diff feature is not enabled', 404);
    }

    const body = JSON.parse(event.body || '{}');
    const { baseSchema, targetSchema } = body;

    if (!baseSchema || !targetSchema) {
      return error('baseSchema and targetSchema are required', 400);
    }

    // Compute diff operations
    const ops = computeSchemaDiff(baseSchema, targetSchema);

    // Analyze risk
    const riskAnalysis = analyzeRisk(ops);

    return json({
      operations: ops,
      riskScore: riskAnalysis.totalRisk,
      severity: riskAnalysis.severity,
      windowRecommendation: riskAnalysis.windowRecommendation,
      summary: {
        totalOperations: ops.length,
        addModels: ops.filter(op => op.type === 'addModel').length,
        dropModels: ops.filter(op => op.type === 'dropModel').length,
        addFields: ops.filter(op => op.type === 'addField').length,
        dropFields: ops.filter(op => op.type === 'dropField').length,
        alterTypes: ops.filter(op => op.type === 'alterType').length,
        hasDestructive: riskAnalysis.hasDestructive,
      },
    });
  } catch (e) {
    console.error('Schema diff error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
