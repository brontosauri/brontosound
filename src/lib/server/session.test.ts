import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { BandRole, permissionsFromBandRole, type Membership } from '$lib/dbEntities/band';
import { HerdRole, permissionsFromHerdRole } from '$lib/dbEntities/user';
import { isBandRoute, requireBandPermission, requirePermission } from './session';

/** A signed-in user's locals, inside a band with `role`, or outside bands */
function localsOf(herdRole: HerdRole, role?: BandRole): App.Locals {
    const band = { id: 7, handle: 'the-ammonites' };
    return {
        brontoSession: { user: { id: 1 }, permissions: [...permissionsFromHerdRole[herdRole], ...(role ? permissionsFromBandRole[role] : [])] },
        membership: role ? { role, band } as Membership : null,
    } as App.Locals;
}

function statusOf(check: () => unknown): number {
    try {
        check();
        return 200;
    } catch (e) {
        if (isHttpError(e)) return e.status;
        throw e;
    }
}

describe('requireBandPermission', () => {
    it('lets viewers read, not write', () => {
        expect(statusOf(() => requireBandPermission(localsOf(HerdRole.USER, BandRole.VIEWER), 'songbook.read'))).toBe(200);
        for (const permission of ['songbook.write', 'live.write', 'band.manage', 'members.manage']) {
            expect(statusOf(() => requireBandPermission(localsOf(HerdRole.USER, BandRole.VIEWER), permission))).toBe(403);
        }
    });

    it('lets editors write songs and gigs, not band settings', () => {
        expect(statusOf(() => requireBandPermission(localsOf(HerdRole.USER, BandRole.EDITOR), 'songbook.write'))).toBe(200);
        expect(statusOf(() => requireBandPermission(localsOf(HerdRole.USER, BandRole.EDITOR), 'live.write'))).toBe(200);
        expect(statusOf(() => requireBandPermission(localsOf(HerdRole.USER, BandRole.EDITOR), 'band.manage'))).toBe(403);
    });

    it('gives the band of the request', () => {
        expect(requireBandPermission(localsOf(HerdRole.USER, BandRole.OWNER), 'members.manage').band.handle).toBe('the-ammonites');
    });

    it("doesn't open band content to herd admins", () => {
        expect(statusOf(() => requireBandPermission(localsOf(HerdRole.ADMIN), 'songbook.read'))).toBe(403);
        expect(statusOf(() => requirePermission(localsOf(HerdRole.ADMIN), 'herd.admin'))).toBe(200);
        expect(statusOf(() => requirePermission(localsOf(HerdRole.USER, BandRole.OWNER), 'herd.admin'))).toBe(403);
    });
});

describe('band routes', () => {
    it("are the band's pages and API, not its public profile", () => {
        expect(isBandRoute('/@[handle]/app')).toBe(true);
        expect(isBandRoute('/@[handle]/app/songbook/[songId]/[songSlug]')).toBe(true);
        expect(isBandRoute('/@[handle]/api/song/[songId]/file')).toBe(true);
        expect(isBandRoute('/@[handle]')).toBe(false);
        expect(isBandRoute('/@[handle]/apps')).toBe(false);
    });
});
