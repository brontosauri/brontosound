# The herd

A Brontosound instance is a **herd**: a community of people and their bands. One built-in admin to start; people join and create bands, or are invited into them.

## Roles

- **Herd**: `admin` or `user` (`User.herdRole`). Admins run the instance: users, herd settings, bands' metadata. They never see a band's content unless they're in it.
- **Band**: `owner`, `editor`, `viewer` (`Membership.role`). Viewers read and play along; editors change songs, gigs, venues and contacts; owners also run members and band settings. A band always keeps an owner: the last one can't leave, be demoted or be removed.

Permissions: `permissionsFromHerdRole` ([user.ts](../src/lib/dbEntities/user.ts)) and `permissionsFromBandRole` ([band.ts](../src/lib/dbEntities/band.ts)).

## Handles

Users and bands share one namespace of handles (`/@lucia`, `/@the-ammonites`), checked by [handles.ts](../src/lib/server/handles.ts). People sign in with theirs, so every new account picks one (except with Google: then in `/me`). A band picks its handle when created; it's permanent (later it identifies the band across herds), except that herd admins can rename one, freeing the old one.

## Herd admin

`/admin` ([admin.ts](../src/lib/server/admin.ts), `requireHerdAdmin()`, which also enforces "admins must use two-step"):

- **Users** ([userAdmin.ts](../src/lib/server/userAdmin.ts)): invite, by email or with a link ([herdInvites.ts](../src/lib/server/herdInvites.ts), see [authentication.md](authentication.md#joining)), set herd role, rename handle, suspend (can't sign in; their bands keep working), remove (not a band's only owner), give a set-password link ([passwordLinks.ts](../src/lib/server/passwordLinks.ts)).
- **Bands** ([bandAdmin.ts](../src/lib/server/bandAdmin.ts)): metadata only. Suspend (locked for members, Backline session ended), rename, delete with its herd storage, confirmed by typing the handle.
- **Quotas** ([quotas.ts](../src/lib/server/quotas.ts), [$lib/quotas.ts](../src/lib/quotas.ts)): herd defaults in herd settings, overrides in `quotaOverrides` on the `User` or `Band`. Checked when creating a band, inviting, uploading to herd storage (own WebDAV isn't counted) and seating Backline guests.
- **Herd settings**: one form, saved with only what differs from the defaults.
- **Legal texts** ([legal/documents.ts](../src/lib/server/legal/documents.ts)): the Terms and Privacy Policy, drafted and published with an effective date; see [operating.md](operating.md).

## Band routes

A band's pages are at `/@<handle>/app/…` and its API at `/@<handle>/api/…`. [hooks.server.ts](../src/hooks.server.ts) finds the user's membership (404 for anyone else, herd admins included) and adds its permissions to the session; endpoints get the band from `requireBandPermission()` and scope every query to it. `/app` sends you to your band, or to `/me` if you have several.

Every band-owned row (songs, tags, song folders, venues, gigs, contacts, Backline links) has a `band`; deleting a band cascades.

## Members and invites

Owners invite by @handle: the invite waits in that person's `/me` and in the band's members table ([members.ts](../src/lib/server/members.ts)). Or with the band's one invite link, `/join/<token>`, for viewers ([inviteLinks.ts](../src/lib/server/inviteLinks.ts)): its places and day (14 days ahead at most) can change while it works; it ends when full, expired or revoked, and then says why. Its token is kept as is, so owners can copy it again. Whoever opens it signs up or in (a cookie remembers the link) and joins, landing on `/me`. Seats against the members quota: members, pending invites and the link's places left.

## Public pages

- `/`: the herd's home: name, tagline, how to join, its public bands.
- `/@handle` ([publicProfiles.ts](../src/lib/server/publicProfiles.ts)): a band's profile (about, links, confirmed gigs to come, members whose profile allows it) or a person's (about, instruments, bands). Public, or hidden: then only bandmates see it. Signed-in people report profiles to admins ([reports.ts](../src/lib/server/reports.ts)).
- `/rules`: the herd's rules. `/terms` and `/privacy`: its legal texts, past versions at `/terms/<date>`. Pictures (avatars, logos) are served at `/pictures/<id>` ([pictures.ts](../src/lib/server/pictures.ts)): PNG, JPEG or WebP, checked by their bytes.

## Settings

- **Herd settings** (admins): in the database, read at startup and cached ([herdSettings.ts](../src/lib/server/herdSettings.ts)). Send the browser `safeHerdSettings()` only.
- **Band settings** (owners): on the `Band`.
- **`config/config.json`** (operator): `authSecret`, Google credentials and `adminPasswordHash`, the built-in admin's password; written by `npm run init`, from [config.template.json](../config/config.template.json).

## Storage

Each band has its own ([bands.ts](../src/lib/server/bands.ts), `bandStorage()`): a folder of herd storage, `data/files/<herd storage folder>/<handle>`, fixed when the band is created; or its own WebDAV server and songs folder, set by owners in Band › Settings ([bandSettings.ts](../src/lib/server/bandSettings.ts)). WebDAV servers on the herd's own network are refused unless admins allow them ([publicAddress.ts](../src/lib/server/publicAddress.ts)).
