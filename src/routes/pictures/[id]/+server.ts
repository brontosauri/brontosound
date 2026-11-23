import { error, type RequestHandler } from '@sveltejs/kit';
import { findPicture } from '$lib/server/pictures';

// A picture, by its random id: public, like the profiles that show it. A picture never changes: new ones get new ids
export const GET: RequestHandler = async ({ params }) => {
    const picture = await findPicture(params.id ?? '');
    if (!picture) error(404, 'No such picture');
    return new Response(new Uint8Array(picture.data), {
        headers: {
            'Content-Type': picture.mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Security-Policy': "default-src 'none'",
        },
    });
};
