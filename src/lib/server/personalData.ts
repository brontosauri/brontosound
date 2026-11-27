import TypeOrm from '$lib/db';
import { Invite, Membership } from '$lib/dbEntities/band';
import { BacklineLink } from '$lib/dbEntities/backline';
import { LiveGig, LiveGigInteraction, LiveVenue } from '$lib/dbEntities/live';
import { ProfileReport } from '$lib/dbEntities/report';
import { User } from '$lib/dbEntities/user';
import { herdSettings } from './herdSettings';

// "Download your data" (/me/data): what the herd keeps about a person, as JSON (GDPR art. 15, 20). Their bands'
// content is the bands': owners export it (bandExport.ts). Secrets (password hash, two-step key, tokens) stay out

export async function personalData(userId: number) {
    const db = await TypeOrm.getDb();
    const byUser = { where: { createdBy: { id: userId } }, relations: { band: true } };
    const [user, memberships, invites, backlineLinks, venues, gigs, gigNotes, reports] = await Promise.all([
        db.getRepository(User).findOneOrFail({ where: { id: userId }, relations: { accounts: true } }),
        db.getRepository(Membership).find({ where: { user: { id: userId } }, relations: { band: true } }),
        db.getRepository(Invite).find({ where: { user: { id: userId } }, relations: { band: true } }),
        db.getRepository(BacklineLink).find(byUser),
        db.getRepository(LiveVenue).find(byUser),
        db.getRepository(LiveGig).find(byUser),
        db.getRepository(LiveGigInteraction).find({ where: { createdBy: { id: userId } }, relations: { gig: { band: true } } }),
        db.getRepository(ProfileReport).find({ where: { reporter: { id: userId } } }),
    ]);
    return {
        herd: herdSettings().herdName,
        downloaded: new Date(),
        account: {
            name: user.name, handle: user.handle, email: user.email, herdRole: user.herdRole, language: user.locale,
            picture: user.avatar, created: user.creationDate, twoStepVerification: user.totpEnabled,
            termsAccepted: user.termsAcceptedAt, termsVersion: user.termsVersion,
        },
        profile: {
            about: user.about, instruments: user.instruments, city: user.city, website: user.website,
            visibility: user.visibility, showBands: user.showBands,
        },
        signInWith: (user.accounts ?? []).map(({ provider, email, linkedDate }) => ({ provider, email, linked: linkedDate })),
        bands: memberships.map(({ band, role, joinedDate }) => ({ band: band.name, handle: band.handle, role, joined: joinedDate })),
        invites: invites.map(({ band, role, creationDate }) => ({ band: band.name, role, sent: creationDate })),
        backlineLinks: backlineLinks.map(({ band, creationDate }) => ({ band: band.name, linked: creationDate })),
        youAdded: {
            venues: venues.map(({ band, name, creationDate }) => ({ band: band.name, name, added: creationDate })),
            gigs: gigs.map(({ band, name, date, creationDate }) => ({ band: band.name, name, date, added: creationDate })),
            gigNotes: gigNotes.map(({ gig, date, note }) => ({ band: gig.band.name, gig: gig.name, date, note })),
        },
        reportsYouSent: reports.map(({ handle, reason, date }) => ({ profile: handle, reason, sent: date })),
    };
}
