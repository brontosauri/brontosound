import { error, json, type RequestHandler } from '@sveltejs/kit';
import { findLink } from '$lib/server/backline/links';
import { hashToken } from '$lib/server/tokens';
import { announce, hostFor, toClients } from '$lib/server/backline/liveSession';

// The Backline app's end of its band's live session (docs/backline.md). It signs in with the token of its link, which
// says the band, and names itself with `instance`, so that a second Backline taking over is told apart from the first
// one reconnecting.

/** The link a request's token belongs to, with its band */
async function linkOf(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
    if (!token) {
        error(401, 'Missing token');
    }
    const link = await findLink(token);
    if (!link) {
        error(401, 'Unknown token');
    }
    return { ...link, tokenHash: hashToken(token) };
}

const instanceOf = (url: URL) => url.searchParams.get('instance') ?? '';

// Announce: become the band's live Backline, say who gets in and hand over the page browsers will show
export const PUT: RequestHandler = async ({ request, url }) => {
    const { band, tokenHash } = await linkOf(request);
    const body = await request.json();
    return json(announce({
        band: band.id,
        instance: instanceOf(url),
        tokenHash,
        public: body.public === true,
        pin: String(body.pin ?? ''),
        page: String(body.page ?? ''),
    }));
};

// Pull: what browsers did since message `after`. Waits until there is something
export const GET: RequestHandler = async ({ request, url }) => {
    const { band, tokenHash } = await linkOf(request);
    const host = hostFor(band.id, instanceOf(url), tokenHash);
    return json(await host.inbox.pull(Number(url.searchParams.get('after')) || 0));
};

// Push: messages for browsers
export const POST: RequestHandler = async ({ request, url }) => {
    const { band, tokenHash } = await linkOf(request);
    const host = hostFor(band.id, instanceOf(url), tokenHash);
    const { items } = await request.json();
    if (Array.isArray(items)) {
        toClients(host, items.filter(item => typeof item?.c === 'string' && typeof item?.m === 'string'));
    }
    return new Response(null, { status: 204 });
};
