import twilio from 'twilio';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';

/**
 * Send an SMS message via Twilio.
 * In dev mode (SMS_ENABLED=false), logs to console instead.
 * @param {string} to - E.164 phone number (e.g. "+15551234567")
 * @param {string} body - Message text
 * @returns {Promise<{ sid: string }>}
 */
export async function sendSMS(to, body) {
  if (!SMS_ENABLED) {
    console.log(`[SMS DEV] To: ${to} | Message: ${body}`);
    return { sid: `dev-${Date.now()}` };
  }

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    throw new Error('Twilio credentials are not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  const message = await client.messages.create({ from: FROM_NUMBER, to, body });
  return { sid: message.sid };
}
