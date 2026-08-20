import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const beginSend = vi.hoisted(() => vi.fn());
const clientCtor = vi.hoisted(() => vi.fn());

vi.mock('@azure/communication-email', () => ({
  EmailClient: class {
    beginSend = beginSend;
    constructor(connectionString: string) {
      clientCtor(connectionString);
    }
  },
  KnownEmailSendStatus: { Succeeded: 'Succeeded' },
}));

// Imported statically: the two settings are read inside the function at call
// time, not at module load, so each test can vary them without reloading it.
import { sendViaAcs } from '../../api/src/email';

const msg = {
  to: 'rourke9001@gmail.com',
  replyTo: 'jane@acme.com',
  subject: 'CV request: Jane Doe',
  text: 'Name: Jane Doe',
};

const poller = (status: string) => ({
  isDone: () => true,
  poll: vi.fn(),
  getResult: () => ({ status }),
});

describe('sendViaAcs', () => {
  beforeEach(() => {
    beginSend.mockReset();
    clientCtor.mockReset();
    delete process.env.ACS_CONNECTION_STRING;
    delete process.env.ACS_SENDER_ADDRESS;
  });
  afterEach(() => {
    delete process.env.ACS_CONNECTION_STRING;
    delete process.env.ACS_SENDER_ADDRESS;
  });

  it('fails closed when the connection string is absent, before constructing a client', async () => {
    process.env.ACS_SENDER_ADDRESS = 'donotreply@example.azurecomm.net';
    await expect(sendViaAcs(msg)).rejects.toThrow('ACS is not configured');
    expect(clientCtor).not.toHaveBeenCalled();
    expect(beginSend).not.toHaveBeenCalled();
  });

  it('fails closed when the sender address is absent', async () => {
    process.env.ACS_CONNECTION_STRING = 'endpoint=https://x;accesskey=y';
    await expect(sendViaAcs(msg)).rejects.toThrow('ACS is not configured');
    expect(clientCtor).not.toHaveBeenCalled();
    expect(beginSend).not.toHaveBeenCalled();
  });

  it('sends with the sender from configuration and the recipient and reply-to from the message', async () => {
    process.env.ACS_CONNECTION_STRING = 'endpoint=https://x;accesskey=y';
    process.env.ACS_SENDER_ADDRESS = 'donotreply@example.azurecomm.net';
    beginSend.mockResolvedValue(poller('Succeeded'));

    await sendViaAcs(msg);

    expect(clientCtor).toHaveBeenCalledWith('endpoint=https://x;accesskey=y');
    const sent = beginSend.mock.calls[0][0];
    expect(sent.senderAddress).toBe('donotreply@example.azurecomm.net');
    expect(sent.recipients.to).toEqual([{ address: 'rourke9001@gmail.com' }]);
    expect(sent.replyTo).toEqual([{ address: 'jane@acme.com' }]);
    expect(sent.content.subject).toBe('CV request: Jane Doe');
    expect(sent.content.plainText).toBe('Name: Jane Doe');
  });

  it('throws when the send does not reach Succeeded', async () => {
    process.env.ACS_CONNECTION_STRING = 'endpoint=https://x;accesskey=y';
    process.env.ACS_SENDER_ADDRESS = 'donotreply@example.azurecomm.net';
    beginSend.mockResolvedValue(poller('Failed'));
    await expect(sendViaAcs(msg)).rejects.toThrow('ACS send did not succeed: Failed');
  });
});
