import TypeOrm from '$lib/db';
import { LinkPurpose, User } from '$lib/dbEntities/user';
import { IsNull } from 'typeorm';
import { herdSettings } from './herdSettings';
import { isHttpError } from '@sveltejs/kit';
import { emailReady, sendLink } from './mail';
import { createPasswordLink } from './passwordLinks';
import { isBuiltInAdmin, normalizeEmail } from './users';

// The links Brontosound emails, built on the address the request came to (`origin`)

/** A set-password link for the user: emailed when the herd can, else (or if that fails) returned for an admin to pass on */
export async function passwordLinkFor(user: User, origin: string): Promise<{ emailed: true } | { url: string, notSent: boolean }> {
    const url = `${origin}/set-password/${await createPasswordLink(user.id)}`;
    if (!emailReady() || !user.email) return { url, notSent: false };
    try {
        await sendLink(user.email, `Your password for ${herdSettings().herdName}`, `Set your password for ${herdSettings().herdName} with this link, within a week:`, url);
        return { emailed: true };
    } catch (e) {
        if (isHttpError(e)) return { url, notSent: true };
        throw e;
    }
}

/** "Forgot your password?": emails a link if there's such an account. Says nothing either way */
export async function sendPasswordReset(email: string, origin: string): Promise<void> {
    const user = await (await TypeOrm.getRepository(User)).findOneBy({ email: normalizeEmail(email), removedDate: IsNull(), suspendedDate: IsNull() });
    if (user && !isBuiltInAdmin(user)) await passwordLinkFor(user, origin);
}

export async function sendEmailConfirmation(user: User, origin: string): Promise<void> {
    const url = `${origin}/confirm/${await createPasswordLink(user.id, LinkPurpose.CONFIRM)}`;
    await sendLink(user.email!, `Confirm your email for ${herdSettings().herdName}`, `Welcome to ${herdSettings().herdName}! Confirm your email with this link, then sign in:`, url);
}

export async function sendHerdInvite(email: string, url: string): Promise<void> {
    const { herdName } = herdSettings();
    await sendLink(email, `You're invited to ${herdName}`, `You're invited to join ${herdName}. Pick your handle and password with this link, within 14 days:`, url);
}
