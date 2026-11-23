import { BandStorage } from '$lib/dbEntities/band';
import { HerdRole } from '$lib/dbEntities/user';
import { requireHerdAdmin } from '$lib/server/admin';
import { listBands } from '$lib/server/bandAdmin';
import { herdSettings } from '$lib/server/herdSettings';
import { listUsers } from '$lib/server/userAdmin';
import { emailReady } from '$lib/server/mail';
import { dismissReport, hideReportedProfile, listReports } from '$lib/server/reports';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';

const RECENT = 8;

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    const [users, bands] = await Promise.all([listUsers(), listBands()]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonth = (date: Date) => new Date(date) >= monthStart;
    // What happened lately, from when people joined and bands were created
    const recent = [
        ...users.filter(user => !user.builtIn).map(user => ({ date: user.creationDate, what: `${user.name} joined the herd` })),
        ...bands.map(band => ({ date: band.creationDate, what: `${band.name} was created` })),
    ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, RECENT);

    return {
        pageTitle: herdSettings().herdName,
        breadcrumb: [],
        people: {
            users: users.length,
            admins: users.filter(user => user.herdRole == HerdRole.ADMIN).length,
            joinedThisMonth: users.filter(user => thisMonth(user.creationDate)).length,
            suspended: users.filter(user => user.suspended).length,
        },
        bands: {
            bands: bands.length,
            createdThisMonth: bands.filter(band => thisMonth(band.creationDate)).length,
            onWebdav: bands.filter(band => band.storage == BandStorage.WEBDAV).length,
            suspended: bands.filter(band => band.suspended).length,
        },
        recent,
        reports: await listReports(),
        emailReady: emailReady(),
    };
}) satisfies PageServerLoad;

export const actions = {
    dismissReport: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        await dismissReport(Number((await request.formData()).get('report')));
    },
    hideProfile: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        await hideReportedProfile(Number((await request.formData()).get('report')));
    },
} satisfies Actions;
