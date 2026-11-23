import { createTransport } from 'nodemailer';
import { error } from '@sveltejs/kit';
import { herdSettings, type HerdSettingsData } from './herdSettings';

// Outgoing email (SMTP, in herd settings): invites, password links, address checks. Without it, people pass links on

export type SmtpSettings = Pick<HerdSettingsData, 'smtpHost' | 'smtpPort' | 'smtpUsername' | 'smtpPassword' | 'smtpFrom'>;

export function emailReady(): boolean {
    const { smtpHost, smtpFrom } = herdSettings();
    return !!smtpHost && !!smtpFrom;
}

function transportFor({ smtpHost, smtpPort, smtpUsername, smtpPassword }: SmtpSettings) {
    return createTransport({
        host: smtpHost, port: smtpPort,
        secure: smtpPort == 465, // else STARTTLS when the server offers it
        auth: smtpUsername ? { user: smtpUsername, pass: smtpPassword ?? '' } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
    });
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!emailReady()) error(503, "This herd's outgoing email isn't set up");
    const settings = herdSettings();
    try {
        await transportFor(settings).sendMail({ from: settings.smtpFrom, to, subject, text });
    } catch (e) {
        console.error('Sending email failed:', e);
        error(502, "Couldn't send the email: check the herd's outgoing email settings");
    }
}

/** Connects and signs in with `settings`, saved or not; with `to`, also sends a test email. Fails with the server's answer */
export async function testSmtp(settings: SmtpSettings, to: string): Promise<void> {
    if (!settings.smtpHost) error(400, 'Fill in the SMTP server first');
    if (to && !settings.smtpFrom) error(400, 'Fill in From first: test emails are sent from it');
    const transport = transportFor(settings);
    try {
        await transport.verify();
        if (to) await transport.sendMail({ from: settings.smtpFrom, to, subject: `A test from ${herdSettings().herdName}`, text: 'Outgoing email works.' });
    } catch (e) {
        error(502, `It doesn't work: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        transport.close();
    }
}

/** Sends a link, signed by the herd: what it's for, then the link */
export async function sendLink(to: string, subject: string, why: string, url: string): Promise<void> {
    await sendEmail(to, subject, `${why}\n\n${url}\n\n${herdSettings().herdName}`);
}
