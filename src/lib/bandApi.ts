import { page } from '$app/state';
import { bandApiUrl } from '$lib/misc';

/** The current band's API, for code in the browser (or in a component while it renders): the band is in the URL */
export function bandApi(path: string): string {
    return bandApiUrl(page.params.handle ?? '', path);
}
