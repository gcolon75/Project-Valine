import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-west-2' });
const FROM = process.env.SES_FROM_EMAIL || 'hello@joint-networking.com';
const ENABLED = process.env.SES_ENABLED !== 'false';

export async function sendEmail({ to, subject, html, text }) {
  if (!ENABLED) {
    console.log(`[email] SES disabled — would send to ${to}: ${subject}`);
    return;
  }
  const command = new SendEmailCommand({
    Source: `Joint Networking <${FROM}>`,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' },
      },
    },
  });
  await ses.send(command);
}
