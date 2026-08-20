import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';
import type { SendEmail } from './handler';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;

/**
 * Fails closed. If the two settings are absent the send throws before a client
 * is constructed, the Function turns that into a 502, and the caller is told
 * only that delivery failed — never that the service is misconfigured.
 *
 * Both settings are supplied as Static Web Apps application settings at deploy
 * time and never exist in this repository. See docs/deployment.md.
 */
export const sendViaAcs: SendEmail = async (msg) => {
  const connectionString = process.env.ACS_CONNECTION_STRING;
  const senderAddress = process.env.ACS_SENDER_ADDRESS;
  if (!connectionString || !senderAddress) throw new Error('ACS is not configured');

  const client = new EmailClient(connectionString);
  const poller = await client.beginSend({
    senderAddress,
    replyTo: [{ address: msg.replyTo }],
    recipients: { to: [{ address: msg.to }] },
    content: { subject: msg.subject, plainText: msg.text },
  });

  for (let i = 0; i < MAX_POLLS && !poller.isDone(); i++) {
    await poller.poll();
    if (poller.isDone()) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const result = poller.getResult();
  if (!result || result.status !== KnownEmailSendStatus.Succeeded) {
    throw new Error(`ACS send did not succeed: ${result?.status ?? 'timed out'}`);
  }
};
