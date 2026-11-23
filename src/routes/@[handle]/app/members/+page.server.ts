import { fail, isHttpError } from '@sveltejs/kit';
import { BandRole, type Band } from '$lib/dbEntities/band';
import { bandAppUrl } from '$lib/misc';
import { herdSettings, Registrations } from '$lib/server/herdSettings';
import { oneOf } from '$lib/server/input';
import { bandLink, createLink, inputDay, revokeLink, updateLink, validUntilRange } from '$lib/server/inviteLinks';
import { inviteUser, listInvites, listMembers, removeMember, revokeInvite, setInviteRole, setRole } from '$lib/server/members';
import { memberSeats, roomLeft } from '$lib/server/quotas';
import { requireBandPermission } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
    const { band } = requireBandPermission(locals, 'band.read');
    const manages = locals.brontoSession!.permissions.includes('members.manage');
    return {
        breadcrumb: [{ title: "Members", href: bandAppUrl(band.handle, "/members") }],
        members: (await listMembers(band)).map(({ id, role, joinedDate, user }) => ({ id, role, joinedDate, userId: user.id, name: user.name, handle: user.handle })),
        ...(manages && await ownerView(band, url.origin)),
    };
}) satisfies PageServerLoad;

/** What owners see besides: pending invites, seats and the invite link */
async function ownerView(band: Band, origin: string) {
    const link = await bandLink(band);
    const { taken, limit } = await memberSeats(band);
    return {
        invites: (await listInvites(band)).map(({ id, role, user }) => ({ id, role, name: user.name, handle: user.handle })),
        seats: { taken, limit, left: roomLeft(limit, taken) },
        link: link && { url: `${origin}/join/${link.token}`, places: link.places, joined: link.joined, until: inputDay(link.expiresDate) },
        validUntil: validUntilRange(),
        herdMembersOnly: herdSettings().registrations == Registrations.CLOSED, // the link can't sign people up
    };
}

/** Runs an owner's change; its expected errors (an only owner, a missing row) reach the page as a message */
async function asOwner<T extends object>(locals: App.Locals, request: Request, change: (band: Band, form: FormData) => Promise<T | void>) {
    const { band } = requireBandPermission(locals, 'members.manage');
    try {
        return await change(band, await request.formData()) ?? {};
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

const linkInput = (form: FormData) => ({ places: form.get('places'), until: form.get('until') });

export const actions = {
    setRole: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        setRole(band, Number(form.get('member')), oneOf(form.get('role'), BandRole, 'role'))),
    remove: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        removeMember(band, Number(form.get('member')))),
    invite: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        inviteUser(band, oneOf(form.get('role'), BandRole, 'role'), locals.brontoSession!.user, form.get('handle')).then(() => {})),
    setInviteRole: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        setInviteRole(band, Number(form.get('invite')), oneOf(form.get('role'), BandRole, 'role'))),
    revokeInvite: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        revokeInvite(band, Number(form.get('invite')))),
    createLink: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        createLink(band, locals.brontoSession!.user, linkInput(form))),
    updateLink: async ({ request, locals }) => asOwner(locals, request, (band, form) =>
        updateLink(band, linkInput(form))),
    revokeLink: async ({ request, locals }) => asOwner(locals, request, band => revokeLink(band)),
} satisfies Actions;
