import { fail, isHttpError, redirect } from '@sveltejs/kit';
import { BandStorage, type Band } from '$lib/dbEntities/band';
import { bandAppUrl } from '$lib/misc';
import { deleteBand } from '$lib/server/bandAdmin';
import { renameBand, saveBandProfile, saveBandStorage, saveLogo, testWebdav } from '$lib/server/bandSettings';
import { herdSettings } from '$lib/server/herdSettings';
import { herdStorage } from '$lib/server/quotas';
import { requireBandPermission } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
    const { band } = requireBandPermission(locals, 'band.read');
    return {
        pageTitle: "Settings",
        breadcrumb: [{ title: "Settings", href: bandAppUrl(band.handle, "/settings") }],
        settings: {
            name: band.name,
            storage: band.storage,
            webdavServer: band.webdavServer ?? '',
            webdavUsername: band.webdavUsername ?? '',
            webdavSongsFolder: band.webdavSongsFolder ?? 'Songs',
        },
        profile: {
            visibility: band.visibility, about: band.about, genres: band.genres, city: band.city,
            publicEmail: band.publicEmail, links: band.links, showGigs: band.showGigs, showMembers: band.showMembers,
        },
        herdStorage: band.storage == BandStorage.HERD ? await herdStorage(band) : null,
        webdavAllowed: herdSettings().webdavAllowed || band.storage == BandStorage.WEBDAV,
    };
}) satisfies PageServerLoad;

/** Runs an owner's change; its expected errors reach the page as a message */
async function asOwner<T extends object>(locals: App.Locals, request: Request, change: (band: Band, form: FormData) => Promise<T>) {
    const { band } = requireBandPermission(locals, 'band.manage');
    const form = await request.formData();
    try {
        return await change(band, form);
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

export const actions = {
    rename: async ({ request, locals }) => asOwner(locals, request, async (band, form) => {
        await renameBand(band, form.get('name'));
        return { saved: 'general' };
    }),
    uploadLogo: async ({ request, locals }) => asOwner(locals, request, async (band, form) => {
        await saveLogo(band, form.get('picture'));
        return { saved: 'general' };
    }),
    saveProfile: async ({ request, locals }) => asOwner(locals, request, async (band, form) => {
        await saveBandProfile(band, form);
        return { saved: 'profile' };
    }),
    saveStorage: async ({ request, locals }) => asOwner(locals, request, async (band, form) => {
        await saveBandStorage(band, form);
        return { saved: 'storage' };
    }),
    testStorage: async ({ request, locals }) => asOwner(locals, request, async (band, form) => ({ test: await testWebdav(band, form) })),
    delete: async ({ request, locals }) => {
        const { band } = requireBandPermission(locals, 'band.manage');
        try {
            await deleteBand(band.id, (await request.formData()).get('confirmation'));
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { deleteError: e.body.message });
            throw e;
        }
        redirect(303, '/me');
    },
} satisfies Actions;
