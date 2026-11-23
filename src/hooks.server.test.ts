import { describe, expect, it, vi } from 'vitest';
import { isHttpError, isRedirect, type RequestEvent } from '@sveltejs/kit';

vi.mock('./auth', () => ({ handle: vi.fn() }));
vi.mock('$lib/server/users', () => ({ ensureDefaultAdmin: vi.fn(), findActiveUser: vi.fn(async (id: number) => ({ id, herdRole: 'admin' })) }));
// User 1 is in band `the-ammonites`
vi.mock('$lib/server/bands', () => ({
    findMembership: vi.fn(async (handle: string, userId: number) => handle == 'the-ammonites' && userId == 1 ? { role: 'viewer', band: { handle } } : null),
}));

import { authorizationHandle, handleError } from './hooks.server';

/** What the guard does for a visitor (no session), or user `userId`, on `path`: SvelteKit matched it to route `routeId` */
async function visit(path: string, routeId: string | null, userId?: number, params: Record<string, string> = {}): Promise<number> {
    const auth = async () => userId ? { user: { id: String(userId) } } : null;
    const event = { url: new URL(`http://localhost${path}`), route: { id: routeId }, params, locals: { auth } };
    try {
        await authorizationHandle({ event: event as unknown as RequestEvent, resolve: async () => new Response('ok') });
        return 200;
    } catch (e) {
        if (isHttpError(e) || isRedirect(e)) return e.status;
        throw e;
    }
}

describe('authorization guard', () => {
    it('turns visitors away from API and app routes, also when the path is percent-encoded', async () => {
        expect(await visit('/@band/api/song/1/folder', '/@[handle]/api/song/[songId]/folder')).toBe(401);
        expect(await visit('/@band/%61pi/song/1/folder', '/@[handle]/api/song/[songId]/folder')).toBe(401);
        expect(await visit('/api/user', '/api/user')).toBe(401);
        expect(await visit('/@band/%61pp/settings', '/@[handle]/app/settings')).toBe(303);
        expect(await visit('/me', '/me')).toBe(303);
    });

    it('lets visitors into public routes and 404s', async () => {
        for (const route of ['/', '/signin', '/signout', '/backline', '/backline/client']) {
            expect(await visit(route, route)).toBe(200);
        }
        expect(await visit('/nowhere', null)).toBe(200);
    });

    it('turns visitors away from routes that are not listed as public', async () => {
        expect(await visit('/backlineish', '/backlineish')).toBe(303);
    });

    it("opens a band's pages to its members only, not to herd admins", async () => {
        const settings = (handle: string, userId: number) => visit(`/@${handle}/app/settings`, '/@[handle]/app/settings', userId, { handle });
        expect(await settings('the-ammonites', 1)).toBe(200);
        expect(await settings('the-ammonites', 2)).toBe(404);
        expect(await settings('velvet-ferns', 1)).toBe(404);
    });
});

describe('error handler', () => {
    const handle = (status: number, error: unknown) =>
        handleError({ error, status, message: status == 404 ? 'Not Found' : 'Internal Error', event: {} as RequestEvent });

    it('keeps unexpected error details out of responses', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = handle(500, new Error("ENOENT: no such file, open '/app/data/x'"));
        expect(response).toEqual({ message: expect.stringMatching(/^Something went wrong \(error [0-9a-f]{8}\)$/) });
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error '), expect.any(Error));
    });

    it('passes 4xx messages through', () => {
        expect(handle(404, new Error('Not found: /nowhere'))).toEqual({ message: 'Not Found' });
    });
});
