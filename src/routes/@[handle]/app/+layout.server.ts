import { instanceConfig } from '$lib/server/instanceConfig';
import { error } from '@sveltejs/kit';
import { safeHerdSettings } from '$lib/server/herdSettings';
import { authSecretWarning } from '$lib/server/authSecret';
import { bandSummary, listMemberships } from '$lib/server/bands';
import { can } from '$lib/permissions';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
    const { brontoSession, membership } = locals;
    if (!brontoSession || membership?.band.handle !== params.handle) error(404, 'Not found'); // checked by the hook: this load reruns per band
    return {
        band: bandSummary(membership),
        bands: (await listMemberships(brontoSession.user.id)).map(bandSummary), // to switch to
        brontoSession, // with this band's permissions
        safeHerdSettings: safeHerdSettings(),
        // Configuration problems, for the admins who can fix them
        configWarnings: can(brontoSession, 'herd.admin') ? [authSecretWarning(instanceConfig().authSecret)].filter(Boolean) : [],
    };
}) satisfies LayoutServerLoad;
