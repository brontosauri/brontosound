import { error } from '@sveltejs/kit';
import { IsNull, MoreThan } from 'typeorm';
import TypeOrm from '$lib/db';
import { LinkPurpose, PasswordLink, User } from '$lib/dbEntities/user';
import { hashToken, newToken } from './tokens';
import { changePassword, newPasswordProblem } from './users';

// Links a user follows once, within a week: to set their password (herd admins hand them out, or email them, and
// people who forgot theirs get one by email), or to confirm their email after signing up

const LINK_DAYS = 7;

const links = () => TypeOrm.getRepository(PasswordLink);

/** A new link's token; the user's earlier links for the same purpose stop working */
export async function createPasswordLink(userId: number, purpose = LinkPurpose.PASSWORD): Promise<string> {
    const token = newToken();
    await (await links()).delete({ user: { id: userId }, purpose });
    await (await links()).insert({ user: { id: userId }, purpose, tokenHash: hashToken(token), expiresDate: new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000) });
    return token;
}

/** The link a token is for, with its user, while it works */
export async function findPasswordLink(token: string, purpose = LinkPurpose.PASSWORD): Promise<PasswordLink | null> {
    return (await links()).findOne({
        where: { tokenHash: hashToken(token), purpose, expiresDate: MoreThan(new Date()), user: { removedDate: IsNull(), suspendedDate: IsNull() } },
        relations: { user: true },
    });
}

/** Sets the password (signing the user out everywhere), and the link stops working */
export async function setPasswordWithLink(token: string, password: string): Promise<void> {
    const link = await findPasswordLink(token);
    if (!link) error(404, 'This link has expired, or was used already');
    const problem = await newPasswordProblem(password);
    if (problem) error(400, problem);
    await changePassword(link.user.id, password);
    await (await TypeOrm.getRepository(User)).update(link.user.id, { unconfirmedEmail: false }); // the link came to their email
    await (await links()).delete(link.id);
}

/** The user's email is theirs: they can sign in */
export async function confirmEmail(token: string): Promise<void> {
    const link = await findPasswordLink(token, LinkPurpose.CONFIRM);
    if (!link) error(404, 'This link has expired, or was used already');
    await (await TypeOrm.getRepository(User)).update(link.user.id, { unconfirmedEmail: false });
    await (await links()).delete(link.id);
}
