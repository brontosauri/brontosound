import { herdSettings } from '$lib/server/herdSettings';
import type { PageServerLoad } from './$types';

export const load = (() => ({ rules: herdSettings().rules })) satisfies PageServerLoad;
