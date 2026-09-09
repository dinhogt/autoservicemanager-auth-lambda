import type { SNSEvent, SNSHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

export type NotifyPayload = {
  type: 'os_status' | 'orcamento';
  to?: string | null;
  clienteNome?: string;
  ordemServicoId: string;
  subject: string;
  text: string;
};

function parseMessage(raw: string): NotifyPayload | null {
  try {
    const parsed = JSON.parse(raw) as NotifyPayload;
    if (!parsed?.ordemServicoId || !parsed?.subject || !parsed?.text) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  const from = process.env.EMAIL_FROM || 'noreply@autoservicemanager.local';

  for (const record of event.Records) {
    const payload = parseMessage(record.Sns.Message);
    if (!payload) {
      console.log(
        JSON.stringify({
          event: 'os_notification',
          level: 'warn',
          message: 'payload inválido',
        }),
      );
      continue;
    }

    const to = (payload.to ?? '').trim();
    if (!to || !to.includes('@')) {
      console.log(
        JSON.stringify({
          event: 'os_notification',
          level: 'info',
          message: 'sem destinatário e-mail — skip SES',
          ordemServicoId: payload.ordemServicoId,
          type: payload.type,
        }),
      );
      continue;
    }

    await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: { Text: { Data: payload.text, Charset: 'UTF-8' } },
        },
      }),
    );

    console.log(
      JSON.stringify({
        event: 'os_notification',
        level: 'info',
        message: `e-mail enviado via SES (${payload.type})`,
        ordemServicoId: payload.ordemServicoId,
        type: payload.type,
        toMasked: `${to.slice(0, 2)}***`,
      }),
    );
  }
};
