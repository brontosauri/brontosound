import slugify from "slugify";
import type { LiveGig, LiveVenue } from "./dbEntities/live";

export function arrayEquals<T>(a: Array<T>, b: Array<T>) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function pathJoin(...pathComponents){
    const separator = '/';
    var replace = new RegExp(separator+'{1,}', 'g');
    return pathComponents.join(separator).replace(replace, separator);
 }

/** A band's pages: `/@<handle>/app…` */
export function bandAppUrl(handle: string, path = ''): string {
    return `/@${handle}/app${path}`;
}

/** A band's API: `/@<handle>/api…` */
export function bandApiUrl(handle: string, path: string): string {
    return `/@${handle}/api${path}`;
}

export function buildVenueUrl(handle: string, venue: LiveVenue): string {
    const slug = slugify(venue.name, { lower: true });
    return bandAppUrl(handle, `/live/venues/${venue.id}/${slug}`);
}

export function buildGigUrl(handle: string, gig: LiveGig, venue: LiveVenue): string {
    return bandAppUrl(handle, `/live/venues/${venue.id}/${slugify(venue.name)}/gig/${gig.id}/${slugify(gig.name)}`);
}
