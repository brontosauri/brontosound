import { changePassword, countLoginAttempt, verifyCurrentPassword, getProfile, MAX_LOGIN_ATTEMPTS, newPasswordProblem, signOutEverywhere, TooManyLoginAttempts } from '$lib/server/users';
import { confirmTwoStep, resetTwoStep, startTwoStepSetup, twoStepSetupUri, useTwoStepCode } from '$lib/server/twoStep';
import QRCode from 'qrcode';
import { listLinks, removeLink } from '$lib/server/backline/links';
import { listMemberships } from '$lib/server/bands';
import { acceptUserInvite, bandsOnlyOwnedBy, declineInvite, invitesFor, removeMember } from '$lib/server/members';
import { pickHandle, saveAvatar, saveDetails, saveProfile } from '$lib/server/profile';
import { deleteOwnAccount } from '$lib/server/userAdmin';
import { bandAppUrl } from '$lib/misc';
import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
    const profile = await getProfile(locals.brontoSession!.user.id);
    const onlyOwned = new Set((await bandsOnlyOwnedBy(locals.brontoSession!.user.id)).map(band => band.id));
    return {
        pageTitle: "Your profile",
        breadcrumb: [{title: "Your profile"}],
        profile,
        // the layout's bands, with whether the user may leave them
        onlyOwnedBandIds: [...onlyOwned],
        invites: (await invitesFor(locals.brontoSession!.user)).map(({ id, role, expiresDate, band, createdBy }) =>
            ({ id, role, expiresDate, bandName: band.name, by: createdBy?.name ?? null })),
        twoStepSetup: await twoStepSetupView(locals.brontoSession!.user.id, profile.login),
        backlineLinks: await listLinks(locals.brontoSession!.user.id),
    };
}) satisfies PageServerLoad;

/** While two-step is being set up: the QR code and key for the authenticator app */
async function twoStepSetupView(userId: number, login: string) {
    const uri = await twoStepSetupUri(userId, login);
    return uri ? { qr: await QRCode.toDataURL(uri, { margin: 1, width: 180 }), secret: new URL(uri).searchParams.get('secret')! } : null;
}

const WRONG_CODE = 'Wrong code. Enter the one your app shows now.';
const tooManyCodes = (userId: number) => countLoginAttempt(`two-step:${userId}`) > MAX_LOGIN_ATTEMPTS;

export const actions = {
    leaveBand: async ({ request, locals }) => {
        const bandId = Number((await request.formData()).get('band'));
        const membership = (await listMemberships(locals.brontoSession!.user.id)).find(({ band }) => band.id === bandId);
        if (!membership) {
            return fail(404, { bandError: "You're not in this band" });
        }
        await removeMember(membership.band, membership.id);
        return { leftBand: membership.band.name };
    },
    acceptInvite: async ({ request, locals }) => {
        const band = await acceptUserInvite(locals.brontoSession!.user, Number((await request.formData()).get('invite')));
        redirect(303, bandAppUrl(band.handle));
    },
    declineInvite: async ({ request, locals }) => {
        await declineInvite(locals.brontoSession!.user, Number((await request.formData()).get('invite')));
        return {};
    },
    saveDetails: async ({ request, locals }) => asSelf(async () => {
        const form = await request.formData();
        if (form.get('handle')) await pickHandle(locals.brontoSession!.user, form.get('handle'));
        await saveDetails(locals.brontoSession!.user, form);
        return {};
    }),
    saveProfile: async ({ request, locals }) => asSelf(async () => {
        await saveProfile(locals.brontoSession!.user, await request.formData());
        return {};
    }),
    uploadAvatar: async ({ request, locals }) => asSelf(async () => {
        await saveAvatar(locals.brontoSession!.user, (await request.formData()).get('picture'));
        return {};
    }),
    deleteAccount: async ({ request, locals }) => {
        const result = await asSelf(async () => {
            if ((await request.formData()).get('confirmation') !== 'delete') return fail(400, { deleteError: 'Type "delete" to confirm' });
            await deleteOwnAccount(locals.brontoSession!.user);
            return { deleted: true };
        }, 'deleteError');
        if ('deleted' in result) redirect(303, '/');
        return result;
    },

    changePassword: async ({ request, locals }) => {
        const data = await request.formData();
        const { user } = locals.brontoSession!;
        const profile = await getProfile(user.id);
        if (profile.isDefaultAdmin) {
            return fail(400, { error: 'This password is set in config.json' });
        }
        // Users who only signed in with Google have no password to confirm yet
        if (profile.hasPassword) {
            try {
                if (!await verifyCurrentPassword(user.id, String(data.get('currentPassword') ?? ''))) {
                    return fail(400, { error: 'Current password is wrong' });
                }
            } catch (e) {
                if (e instanceof TooManyLoginAttempts) {
                    return fail(429, { error: 'Too many attempts. Try again in 15 minutes.' });
                }
                throw e;
            }
        }
        const newPassword = String(data.get('newPassword') ?? '');
        if (newPassword !== data.get('confirmPassword')) {
            return fail(400, { error: "New passwords don't match" });
        }
        const problem = await newPasswordProblem(newPassword);
        if (problem) {
            return fail(400, { error: problem });
        }
        await changePassword(user.id, newPassword);
        redirect(303, '/signin?passwordChanged');
    },

    signOutEverywhere: async ({ locals }) => {
        await signOutEverywhere(locals.brontoSession!.user.id);
        redirect(303, '/signin');
    },

    startTwoStep: async ({ locals }) => {
        const { user } = locals.brontoSession!;
        if (!(await getProfile(user.id)).hasPassword) {
            return fail(400, { twoStepError: 'Set a password first: two-step verification is for password sign-in' });
        }
        await startTwoStepSetup(user.id);
    },

    confirmTwoStep: async ({ request, locals }) => {
        const { user } = locals.brontoSession!;
        if (tooManyCodes(user.id)) {
            return fail(429, { twoStepError: 'Too many attempts. Try again in 15 minutes.' });
        }
        if (!await confirmTwoStep(user.id, String((await request.formData()).get('code') ?? ''))) {
            return fail(400, { twoStepError: WRONG_CODE });
        }
        await signOutEverywhere(user.id); // the other sessions never gave a code
        redirect(303, '/signin?twoStepOn');
    },

    // Turns two-step off with a code, or cancels setting it up
    turnOffTwoStep: async ({ request, locals }) => {
        const { user } = locals.brontoSession!;
        if ((await getProfile(user.id)).twoStepEnabled) {
            if (tooManyCodes(user.id)) {
                return fail(429, { twoStepError: 'Too many attempts. Try again in 15 minutes.' });
            }
            if (!await useTwoStepCode(user.id, String((await request.formData()).get('code') ?? ''))) {
                return fail(400, { twoStepError: WRONG_CODE });
            }
        }
        await resetTwoStep(user.id);
    },

    unlinkBackline: async ({ request, locals }) => {
        await removeLink(locals.brontoSession!.user.id, Number((await request.formData()).get('id')));
    },
} satisfies Actions;

/** Runs a change of the user's own; its expected errors reach the page, as `errorKey` */
async function asSelf<T extends object>(change: () => Promise<T>, errorKey: 'error' | 'deleteError' = 'error') {
    try {
        return await change();
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { [errorKey]: e.body.message } as Record<typeof errorKey, string>);
        throw e;
    }
}
