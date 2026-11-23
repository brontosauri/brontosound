# Authentication

Auth.js, configured in [src/auth.ts](../src/auth.ts). Two ways in:

- **Email or handle + password** — Credentials provider (the built-in admin signs in as `admin`, a handle nobody can take). Passwords are scrypt-hashed ([password.ts](../src/lib/server/password.ts)). New passwords need 12 characters and, with `breachedPasswordCheck` (default), must not appear in data breaches: only the first 5 characters of the password's SHA-1 go to Have I Been Pwned; when it can't be reached, the password is allowed. Throttled ([loginThrottle.ts](../src/lib/server/loginThrottle.ts)): 10 attempts per login and client address per 15 minutes; after 5 failures of a login from anywhere, each try waits 1 s, 2 s, 4 s… up to a minute; 50 failures per address, whatever the login.
- **Google SSO** — allowed if the Google account is already linked to a user, or its verified email matches a user (it then gets linked), or the herd lets new people join with Google (it then creates the account, without a handle: they pick it in `/me`).

The session JWT carries `userId` and `sessionVersion`, signed with `authSecret` from `config/config.json`: without it, pages only show how to set up (`npm run init` generates it); the server won't start with a placeholder, and shows admins a warning bar in the app when it is under 32 characters. The `jwt` callback drops the session when the user is removed or their `sessionVersion` has changed.

Users change their profile and password at `/me` (header avatar). Changing the password signs them out everywhere, and so does **Sign out everywhere**. Users who only have Google can set a password there.

## Two-step verification

Users with a password can turn it on in their profile: password sign-in then also asks for a 6-digit code from an authenticator app (TOTP, [totp.ts](../src/lib/server/totp.ts), [twoStep.ts](../src/lib/server/twoStep.ts)). Each code works once; wrong codes count as failed sign-ins. Turning it on signs the user out everywhere. Google sign-in doesn't ask: Google has its own.

Lost device: a herd admin resets it in **Admin → Users**. For the default admin, changing `adminPasswordHash` resets it.

## Joining

Herd settings › Registrations ([registration.ts](../src/lib/server/registration.ts)): **open** (anyone signs up at `/join`), **invite only** (a band's invite link, `/join?invite=<token>`, lets someone sign up; a cookie keeps it, for Google and for joining once signed in), or **closed** (only admins invite). Sign-ups are throttled per address. With "New accounts confirm their email", sign-in waits for the link emailed to them (`/confirm/<token>`).

Whatever the registrations, herd admins invite people in **Admin → Users** ([herdInvites.ts](../src/lib/server/herdInvites.ts)), with a herd role, for 14 days. Whoever accepts picks their display name, handle and password at `/welcome/<token>`:

- **By email**: the account gets that address, since the link only reaches its owner. If sending fails (or there's no email set up), the invitation waits in the list as not sent, to send again.
- **A link** the admin passes on: no email, since anyone could hold it. They sign in with their handle.

## Links instead of passwords

Admins give users a one-time link to set their password (`/set-password/<token>`, 7 days, [passwordLinks.ts](../src/lib/server/passwordLinks.ts)), for forgotten passwords. With outgoing email (herd settings, [mail.ts](../src/lib/server/mail.ts)) the links are emailed (shown to the admin if that fails), and anyone gets one at `/forgot` (which never says whether the account exists). **Test connection** in herd settings checks the outgoing email fields as typed, saved or not.

## Default admin

User `admin` (no email) is created at startup. Its password hash is `adminPasswordHash` in `config/config.json`, required: the server won't start without it (`npm run hash-password`). Changing it takes effect on restart and signs admin out everywhere. Once other herd admins exist, turn off `adminPasswordSignIn` (herd settings): the built-in admin then can't sign in (it has no other way in), its sessions end, and the hash is no longer required.

## Roles

A herd role (`admin`, `user`) and a role in each band (`owner`, `editor`, `viewer`): see [herd.md](herd.md). Herd admins add and remove users in **Admin → Users**. Every load, endpoint and form action checks with `requirePermission()` or, inside a band, `requireBandPermission()`; the UI hides what the role can't do (`can()`). Profile, player preferences and Backline links are the user's own.

Removing a user deletes their password, linked accounts, memberships and Backline links (cutting off their Backline if live), signs them out everywhere, and sets `removedDate`; the last owner of a band can't be removed. The row is kept so their content keeps its author; adding the same email again restores it.

## Linked accounts

`UserAccount` maps (`provider`, `providerAccountId`) to a `User`, many per user. Linking a provider for API access (Spotify, Apple Music, …) will also need token columns on `UserAccount`, and a callback that reads the current session: without a DB adapter, Auth.js ignores it on OAuth sign-in.
