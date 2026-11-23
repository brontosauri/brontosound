import { fail, isHttpError } from '@sveltejs/kit';
import { HerdRole } from '$lib/dbEntities/user';
import { requireHerdAdmin } from '$lib/server/admin';
import { oneOf } from '$lib/server/input';
import TypeOrm from '$lib/db';
import { User } from '$lib/dbEntities/user';
import { passwordLinkFor } from '$lib/server/emailLinks';
import { emailReady } from '$lib/server/mail';
import { resetTwoStep } from '$lib/server/twoStep';
import { createInviteLink, type Delivery, inviteByEmail, listHerdInvites, newInviteLink, sendAgain, withdrawInvite } from '$lib/server/herdInvites';
import { listUsers, removeUser, renameUserHandle, restoreUser, setHerdRole, suspendUser } from '$lib/server/userAdmin';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    return {
        pageTitle: "Users",
        breadcrumb: [{ title: "Users" }],
        users: await listUsers(),
        invites: await listHerdInvites(),
        emailReady: emailReady(),
    };
}) satisfies PageServerLoad;

/** Runs an admin's change to user `user`; its expected errors reach the page as a message, under `errorKey` */
async function asAdmin<T extends object, K extends string = 'error'>(
    locals: App.Locals, request: Request, change: (form: FormData, id: number, by: App.Locals['brontoSession'] & object) => Promise<T>, errorKey = 'error' as K,
) {
    const session = requireHerdAdmin(locals);
    const form = await request.formData();
    try {
        return await change(form, Number(form.get('user')), session);
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { [errorKey]: e.body.message } as Record<K, string>);
        throw e;
    }
}

/** A set-password link for the user: emailed, or shown for the admin to pass on */
async function passwordLink(user: User, url: URL) {
    const link = await passwordLinkFor(user, url.origin);
    return 'url' in link ? { passwordLink: { name: user.name, url: link.url, notSent: link.notSent } } : { emailed: user.name };
}

const invited = ({ email, sent }: Delivery) => sent ? { invited: email } : { inviteNotSent: email };

export const actions = {
    invite: async ({ request, locals, url }) => asAdmin(locals, request, async (form, _, { user }) => {
        return invited(await inviteByEmail(form.get('email'), oneOf(form.get('herdRole'), HerdRole, 'herd role'), user, url.origin));
    }, 'inviteError'),
    inviteLink: async ({ request, locals, url }) => asAdmin(locals, request, async (form, _, { user }) => {
        return { inviteLink: await createInviteLink(oneOf(form.get('herdRole'), HerdRole, 'herd role'), user, url.origin) };
    }, 'inviteError'),
    sendAgain: async ({ request, locals, url }) => asAdmin(locals, request, async form => {
        return invited(await sendAgain(Number(form.get('invite')), url.origin));
    }, 'inviteError'),
    newInviteLink: async ({ request, locals, url }) => asAdmin(locals, request, async form => {
        return { inviteLink: await newInviteLink(Number(form.get('invite')), url.origin) };
    }, 'inviteError'),
    withdrawInvite: async ({ request, locals }) => asAdmin(locals, request, async form => {
        await withdrawInvite(Number(form.get('invite')));
        return {};
    }, 'inviteError'),
    setHerdRole: async ({ request, locals }) => asAdmin(locals, request, async (form, id, { user }) => {
        await setHerdRole(id, oneOf(form.get('herdRole'), HerdRole, 'herd role'), user);
        return {};
    }),
    suspend: async ({ request, locals }) => asAdmin(locals, request, async (_, id, { user }) => {
        await suspendUser(id, user);
        return {};
    }),
    restore: async ({ request, locals }) => asAdmin(locals, request, async (_, id) => {
        await restoreUser(id);
        return {};
    }),
    rename: async ({ request, locals }) => asAdmin(locals, request, async (form, id) => {
        await renameUserHandle(id, form.get('handle'));
        return {};
    }),
    passwordLink: async ({ request, locals, url }) => asAdmin(locals, request, async (_, id) => {
        return passwordLink(await (await TypeOrm.getRepository(User)).findOneByOrFail({ id }), url);
    }),
    resetTwoStep: async ({ request, locals }) => asAdmin(locals, request, async (_, id) => {
        await resetTwoStep(id);
        return {};
    }),
    remove: async ({ request, locals }) => asAdmin(locals, request, async (_, id, { user }) => {
        await removeUser(id, user);
        return {};
    }),
} satisfies Actions;
