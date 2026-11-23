import { redirect } from '@sveltejs/kit';
import { confirmEmail } from '$lib/server/passwordLinks';
import type { PageServerLoad } from './$types';

// The link a new account's confirmation email carries
export const load = (async ({ params }) => {
    await confirmEmail(params.token);
    redirect(303, '/signin?confirmed');
}) satisfies PageServerLoad;
