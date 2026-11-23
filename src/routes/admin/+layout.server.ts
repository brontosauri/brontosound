import { requireHerdAdmin } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

export const load = (({ locals }) => {
    requireHerdAdmin(locals);
}) satisfies LayoutServerLoad;
