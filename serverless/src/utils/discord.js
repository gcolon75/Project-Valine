/**
 * Discord webhook utilities for moderation alerts
 * Sends formatted embeds to Discord channels for moderation events
 */

/**
 * Check if Discord alerts are enabled
 */
export function areDiscordAlertsEnabled() {
  return (
    process.env.MODERATION_ALERTS_ENABLED === 'true' &&
    process.env.MODERATION_ALERT_CHANNEL_ID
  );
}

/**
 * Get severity color for Discord embed
 */
function getSeverityColor(severity) {
  const colors = {
    0: 0x808080, // Gray for info
    1: 0xFFFF00, // Yellow for low
    2: 0xFF8C00, // Orange for medium
    3: 0xFF0000, // Red for high
  };
  
  return colors[severity] || colors[0];
}

/**
 * Get action color for Discord embed
 */
function getActionColor(action) {
  const colors = {
    allow: 0x00FF00,  // Green
    warn: 0xFFFF00,   // Yellow
    remove: 0xFF8C00, // Orange
    ban: 0xFF0000,    // Red
  };
  
  return colors[action] || 0x808080;
}

/**
 * Redact user ID for display (show first 6 chars)
 */
function redactId(id) {
  if (!id) return '[unknown]';
  if (id.length <= 6) return id;
  return id.substring(0, 6) + '...';
}

/**
 * Send new report alert to Discord
 * @param {object} report - Report object
 */
export async function sendNewReportAlert(report) {
  if (!areDiscordAlertsEnabled()) {
    return;
  }
  
  const webhookUrl = process.env.MODERATION_ALERT_CHANNEL_ID;
  
  const embed = {
    title: '🚨 New Moderation Report',
    color: getSeverityColor(report.severity),
    fields: [
      {
        name: 'Report ID',
        value: report.id,
        inline: true,
      },
      {
        name: 'Reporter',
        value: redactId(report.reporterId),
        inline: true,
      },
      {
        name: 'Category',
        value: report.category,
        inline: true,
      },
      {
        name: 'Target',
        value: `${report.targetType}: ${redactId(report.targetId)}`,
        inline: false,
      },
      {
        name: 'Severity',
        value: ['Info', 'Low', 'Medium', 'High'][report.severity] || 'Unknown',
        inline: true,
      },
      {
        name: 'Status',
        value: report.status,
        inline: true,
      },
    ],
    timestamp: new Date(report.createdAt).toISOString(),
  };
  
  if (report.description) {
    embed.fields.push({
      name: 'Description',
      value: report.description.substring(0, 1000), // Limit to 1000 chars
      inline: false,
    });
  }
  
  if (report.evidenceUrls && report.evidenceUrls.length > 0) {
    embed.fields.push({
      name: 'Evidence URLs',
      value: report.evidenceUrls.slice(0, 3).join('\n'), // Max 3 URLs
      inline: false,
    });
  }
  
  await sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  });
}

/**
 * Send moderation action alert to Discord
 * @param {object} action - Action object
 * @param {object} report - Report object
 */
export async function sendActionAlert(action, report) {
  if (!areDiscordAlertsEnabled()) {
    return;
  }
  
  const webhookUrl = process.env.MODERATION_ALERT_CHANNEL_ID;
  
  const embed = {
    title: '⚖️ Moderation Action Taken',
    color: getActionColor(action.action),
    fields: [
      {
        name: 'Action',
        value: action.action.toUpperCase(),
        inline: true,
      },
      {
        name: 'Actor',
        value: redactId(action.actorId),
        inline: true,
      },
      {
        name: 'Report ID',
        value: report.id,
        inline: true,
      },
      {
        name: 'Target',
        value: `${report.targetType}: ${redactId(report.targetId)}`,
        inline: false,
      },
      {
        name: 'Category',
        value: report.category,
        inline: true,
      },
      {
        name: 'New Status',
        value: report.status,
        inline: true,
      },
    ],
    timestamp: new Date(action.createdAt).toISOString(),
  };
  
  if (action.reason) {
    embed.fields.push({
      name: 'Reason',
      value: action.reason.substring(0, 1000), // Limit to 1000 chars
      inline: false,
    });
  }
  
  await sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  });
}

/**
 * Send webhook to Discord
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} payload - Webhook payload
 */
async function sendDiscordWebhook(webhookUrl, payload) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error('[Discord] Webhook failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[Discord] Failed to send webhook:', err);
  }
}
