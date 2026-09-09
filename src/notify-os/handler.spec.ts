import type { SNSEvent } from 'aws-lambda';
import { handler } from './handler';

jest.mock('@aws-sdk/client-ses', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    SESClient: jest.fn().mockImplementation(() => ({ send })),
    SendEmailCommand: jest.fn().mockImplementation((input) => input),
    __send: send,
  };
});

const { __send: sesSend } = jest.requireMock('@aws-sdk/client-ses') as {
  __send: jest.Mock;
};

function snsEvent(message: unknown): SNSEvent {
  return {
    Records: [
      {
        EventSource: 'aws:sns',
        EventVersion: '1.0',
        EventSubscriptionArn: 'arn:aws:sns:us-east-1:1:t:sub',
        Sns: {
          Type: 'Notification',
          MessageId: '1',
          TopicArn: 'arn:aws:sns:us-east-1:1:t',
          Subject: undefined,
          Message: JSON.stringify(message),
          Timestamp: new Date().toISOString(),
          SignatureVersion: '1',
          Signature: 'x',
          SigningCertUrl: 'https://example.com',
          UnsubscribeUrl: 'https://example.com',
          MessageAttributes: {},
        },
      },
    ],
  };
}

describe('notify-os handler', () => {
  beforeEach(() => {
    sesSend.mockClear();
    process.env.EMAIL_FROM = 'from@test.com';
  });

  it('envia SES quando há e-mail válido', async () => {
    await handler(
      snsEvent({
        type: 'os_status',
        to: 'cliente@test.com',
        ordemServicoId: 'os-1',
        subject: 'OS atualizada',
        text: 'Olá',
      }),
      {} as never,
      () => undefined,
    );
    expect(sesSend).toHaveBeenCalledTimes(1);
  });

  it('não chama SES sem destinatário', async () => {
    await handler(
      snsEvent({
        type: 'os_status',
        to: null,
        ordemServicoId: 'os-1',
        subject: 'OS',
        text: 'x',
      }),
      {} as never,
      () => undefined,
    );
    expect(sesSend).not.toHaveBeenCalled();
  });
});
