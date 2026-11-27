import { error } from '@sveltejs/kit';
import { herdSettings } from './herdSettings';
import { text } from './input';
import { emailReady, sendEmail } from './mail';

// Suspending a user or band says why (DSA art. 17): admins give a reason, which is emailed and shown in the app

/** An admin's reason, required */
export function suspensionReason(value: unknown): string {
    const reason = text(value ?? '', 'reason').trim().slice(0, 500);
    if (!reason) error(400, "Say why: they're told");
    return reason;
}

/** Tells `to` that `what` ("your account", a band's name) is suspended, and why, when the herd has outgoing email */
export async function emailSuspension(to: (string | null)[], what: string, reason: string): Promise<void> {
    if (!emailReady()) return;
    const { herdName, contactEmail } = herdSettings();
    const body = [
        `${herdName}'s admins suspended ${what}.`,
        `Why: ${reason}`,
        `If you disagree, ${contactEmail ? `write to ${contactEmail}` : 'reply to this email'}: a person looks at it again.`,
        herdName,
    ].join('\n\n');
    for (const address of to.filter(Boolean) as string[]) {
        await sendEmail(address, `${what[0].toUpperCase()}${what.slice(1)} on ${herdName} is suspended`, body)
            .catch(e => console.error('Emailing a suspension failed:', e));
    }
}
