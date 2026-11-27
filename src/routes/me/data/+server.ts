import { redirect } from '@sveltejs/kit';
import { personalData } from '$lib/server/personalData';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.brontoSession) redirect(303, '/signin');
    const { user } = locals.brontoSession;
    return new Response(JSON.stringify(await personalData(user.id), null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${user.handle ?? 'your'}-data.json"`,
        },
    });
};
