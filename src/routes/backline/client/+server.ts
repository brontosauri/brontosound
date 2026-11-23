import { error, json, type Cookies, type RequestHandler } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band } from '$lib/dbEntities/band';
import { isMember } from '$lib/server/bands';
import { quotaFor } from '$lib/server/quotas';
import { clientFor, join, mayEnter, toHost } from '$lib/server/backline/liveSession';
import { GUEST_COOKIE } from '../guestCookie';

// A browser's end of a band's live session (docs/backline.md): its mailbox to and from Backline.

/** Whether the browser is the band's member, after checking it may enter the band's live session */
async function enter(band: number, locals: App.Locals, cookies: Cookies): Promise<boolean> {
    const member = !!locals.brontoSession && await isMember(locals.brontoSession.user.id, band);
    if (!mayEnter(band, member, cookies.get(GUEST_COOKIE))) {
        error(403, 'Not allowed');
    }
    return member;
}

// Pull: without `id`, takes a seat in the session of band `band`; with it, waits for Backline's messages after number `after`
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
    const id = url.searchParams.get('id');
    if (!id) {
        const band = Number(url.searchParams.get('band'));
        const member = await enter(band, locals, cookies);
        const guestSeats = quotaFor('backlineGuests', await (await TypeOrm.getRepository(Band)).findOneByOrFail({ id: band }));
        const seat = join(band, locals.brontoSession?.user.name ?? 'Guest', !member, guestSeats);
        if (!seat) {
            error(503, 'The live session is full');
        }
        return json({ id: seat, next: 0, items: [] });
    }
    const client = clientFor(id);
    await enter(client.band, locals, cookies);
    return json(await client.inbox.pull(Number(url.searchParams.get('after')) || 0));
};

// Push: messages for Backline
export const POST: RequestHandler = async ({ url, request, locals, cookies }) => {
    const id = url.searchParams.get('id') ?? '';
    await enter(clientFor(id).band, locals, cookies);
    const { items } = await request.json();
    if (Array.isArray(items)) {
        toHost(id, items.filter(item => typeof item === 'string').slice(0, 64));
    }
    return new Response(null, { status: 204 });
};
