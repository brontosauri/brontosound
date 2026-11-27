import { bandExport } from '$lib/server/bandExport';
import { requireBandPermission } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    const { band } = requireBandPermission(locals, 'band.manage');
    return new Response(await bandExport(band), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${band.handle}-${new Date().toISOString().slice(0, 10)}.zip"`,
        },
    });
};
