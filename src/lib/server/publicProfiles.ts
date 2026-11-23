import { IsNull, MoreThanOrEqual } from 'typeorm';
import TypeOrm from '$lib/db';
import { Band, BandRole, Membership } from '$lib/dbEntities/band';
import { LiveGig, LiveGigStatus } from '$lib/dbEntities/live';
import { User, Visibility } from '$lib/dbEntities/user';
import { listMemberships } from './bands';

// What `/@handle` shows the herd and the web: a band's or a person's public profile, as they chose to show it.
// Songs, gigs in pursuit, venues' details and contacts are never shown

export interface BandProfile {
    kind: 'band';
    name: string; handle: string; logo: string | null;
    about: string; genres: string[]; city: string; publicEmail: string; links: string[]; since: Date;
    gigs: { date: Date, venue: string, city: string }[];
    members: PersonCard[];
    hiddenMembers: number;
}

export interface UserProfile {
    kind: 'user';
    name: string; handle: string; avatar: string | null;
    about: string; instruments: string[]; city: string; website: string; since: Date;
    bands: { name: string, handle: string, logo: string | null }[];
    invitableBands: { value: number, name: string }[]; // the viewer's bands this person may be invited to
}

type PersonCard = { name: string, handle: string | null, avatar: string | null, instruments: string };

const list = (text: string) => text.split(',').map(item => item.trim()).filter(Boolean);
const isShown = (user: User) => user.visibility == Visibility.PUBLIC && user.showBands && !user.removedDate && !user.suspendedDate;

/** The profile at `handle`, as `viewer` may see it; null when there's none, or it's hidden from them */
export async function findProfile(handle: string, viewer: User | null): Promise<BandProfile | UserProfile | null> {
    const db = await TypeOrm.getDb();
    const band = await db.getRepository(Band).findOneBy({ handle });
    if (band) return bandProfile(band, viewer);
    const user = await db.getRepository(User).findOneBy({ handle, removedDate: IsNull(), suspendedDate: IsNull() });
    return user ? userProfile(user, viewer) : null;
}

async function bandProfile(band: Band, viewer: User | null): Promise<BandProfile | null> {
    const db = await TypeOrm.getDb();
    const members = await db.getRepository(Membership).find({ where: { band: { id: band.id } }, relations: { user: true }, order: { user: { name: 'ASC' } } });
    const viewerIsMember = !!viewer && members.some(({ user }) => user.id === viewer.id);
    if (band.suspendedDate || (band.visibility != Visibility.PUBLIC && !viewerIsMember)) return null;

    const gigs = band.showGigs ? await db.getRepository(LiveGig).find({
        where: { band: { id: band.id }, status: LiveGigStatus.CONFIRMED, date: MoreThanOrEqual(new Date(new Date().toDateString())) },
        relations: { venue: true },
        order: { date: 'ASC' },
    }) : [];
    const shown = band.showMembers ? members.filter(({ user }) => isShown(user)) : [];
    return {
        kind: 'band',
        name: band.name, handle: band.handle, logo: band.logo,
        about: band.about, genres: list(band.genres), city: band.city, publicEmail: band.publicEmail, links: band.links, since: band.creationDate,
        gigs: gigs.map(gig => ({ date: gig.date, venue: gig.venue?.name ?? '', city: gig.venue?.location?.city ?? '' })),
        members: shown.map(({ user }) => ({ name: user.name, handle: user.handle, avatar: user.avatar, instruments: user.instruments })),
        hiddenMembers: band.showMembers ? members.length - shown.length : 0,
    };
}

async function userProfile(user: User, viewer: User | null): Promise<UserProfile | null> {
    const memberships = await listMemberships(user.id);
    const viewerMemberships = viewer ? await listMemberships(viewer.id) : [];
    const sharesBand = viewerMemberships.some(({ band }) => memberships.some(membership => membership.band.id === band.id));
    if (user.visibility != Visibility.PUBLIC && viewer?.id !== user.id && !sharesBand) return null;
    return {
        kind: 'user',
        name: user.name, handle: user.handle!, avatar: user.avatar,
        about: user.about, instruments: list(user.instruments), city: user.city, website: user.website, since: user.creationDate,
        bands: user.showBands ? memberships.map(({ band }) => band)
            .filter(band => band.visibility == Visibility.PUBLIC && !band.suspendedDate)
            .map(({ name, handle, logo }) => ({ name, handle, logo })) : [],
        invitableBands: viewerMemberships
            .filter(({ role, band }) => role == BandRole.OWNER && !memberships.some(membership => membership.band.id === band.id))
            .map(({ band }) => ({ value: band.id, name: band.name })),
    };
}
