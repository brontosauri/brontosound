# Brontosound

Band management web app for a herd of bands (SvelteKit 2 + Svelte 5, TypeScript, Tailwind + Flowbite, TypeORM/SQLite).

## Commands

```bash
npm run dev          # vite dev server
npm run build        # adapter-node build
npm run check        # svelte-check (type checking)
npm run lint         # eslint
npm run test:unit    # vitest
npm run test:integration  # playwright
npm run release      # standard-version: bump, changelog, tag
npm run release:dry  # preview the release
npm run init         # create config/config.json (authSecret, admin password) and data/; until then pages show how
npm run -s hash-password  # hash for adminPasswordHash in config/config.json
npm run fetch-soundfont   # download FluidR3_GM into data/soundfonts (MIDI playback)
```

Docker build/run instructions: see [README.md](README.md).

## Writing (this matters)

**Be as concise as you can be.** Every extra word costs the reader time. Say the thing
once, then stop — no restating the task back, no summarising what the diff already shows,
no caveats nobody asked for. This applies to chat replies, commit messages, docs and this
file.

In-depth explanation goes in [docs/](docs/), not in README or chat — and short there too.

## Coding

Keep the code elegant, minimal, modular and readable. Your edits should be straightforward to understand and code review for human reviwers, minimize cognitive overload. If you need to add complex logic, factor it in components or libraries so that the abstract implementation remains clear. So no infinite blobs or obscure logic; yes: short functions, carefully named entities, reusable components with clear responsibilities.

## Commits & releases

Conventional Commits (`feat:`, `fix:`, `refactor:`, …) — `standard-version` builds
[CHANGELOG.md](CHANGELOG.md) from them. Release: `npm run release`, see
[docs/releasing.md](docs/releasing.md). `src/lib/version.json` is generated; never edit it.

## Architecture

- A herd of bands, see [docs/herd.md](docs/herd.md). `src/routes/@[handle]/app/**` — a band's UI, `src/routes/@[handle]/api/**` — its JSON endpoints (POST entity, save via TypeORM, return `instanceToPlain`); `/me` your profile and bands, `/admin` the herd's. Never save client JSON as is: build what you save field by field with [input.ts](src/lib/server/input.ts) (see [liveInput.ts](src/lib/server/liveInput.ts)); ids, authorship, band and relations are the server's.
- `src/lib/dbEntities/*.ts` — TypeORM entities. Registered in the `entities` array in [src/lib/db.ts](src/lib/db.ts) — new entities must be added there. `synchronize: true`, no migrations. DB at `data/database/database.sqlite`.
- Most entities extend `UserCreatedEntity` (id, createdBy, lastModifiedBy, creationDate).
- [src/lib/db.ts](src/lib/db.ts) — `TypeOrm.getDb()/getRepository()` singleton; `saveEntityViaApi()` is the client-side helper that POSTs to an `/api` endpoint.
- Entities cross the server/client boundary as plain objects: `instanceToPlain` in `+page.server.ts` load, `plainToClass` on the way back in.
- Auth: email/password or Google SSO, see [docs/authentication.md](docs/authentication.md). [src/hooks.server.ts](src/hooks.server.ts) loads the `User` from the JWT's `userId`, guards every non-public route, and on a band's routes its membership (`event.locals.membership`, 404 for non-members). Session is `event.locals.brontoSession` (`user`, `auth`, `permissions`: the herd role's, plus the band role's inside a band). Inside a band, get the band with `requireBandPermission()`, and scope every query to it; elsewhere `requirePermission()` ([src/lib/server/session.ts](src/lib/server/session.ts)). Check in every load, endpoint and action, and hide the UI controls with `can()` ([src/lib/permissions.ts](src/lib/permissions.ts)).
- `data/files/` holds bands' files (herd storage), which may be mounted from elsewhere. The rest of `data/` is Brontosound's own: never expose it.
- Outgoing email, when herd admins set SMTP: [mail.ts](src/lib/server/mail.ts); flows that need it fall back to links people pass on.
- Herd settings: in the database, cached by [src/lib/server/herdSettings.ts](src/lib/server/herdSettings.ts); never send them raw to the client — use `safeHerdSettings()`. `config/config.json`, from [config/config.template.json](config/config.template.json) (operator-only, read by [instanceConfig.ts](src/lib/server/instanceConfig.ts)) holds `authSecret`, `googleClientId`, `googleClientSecret` and the built-in admin's `adminPasswordHash`; `ORIGIN` and `AUTH_URL` stay env vars. Band settings are on the `Band`.
- Backline (the band's companion app for playing live) integrates here: links to user accounts, and its Live page at `/backline`. See [docs/backline.md](docs/backline.md); code in `src/lib/server/backline/` and `src/routes/backline/` (a public route: it checks access itself).
- Song files (readme, chordpro) live in file storage, not the DB: `PersistedStorage` in [src/lib/server/storage.ts](src/lib/server/storage.ts), per band via `bandStorage()` ([bands.ts](src/lib/server/bands.ts)): a folder of `data/files/` or the band's own WebDAV. Storage refuses paths outside the songs folder; never build paths from client input without `isFolderName()` or the song-scoped helpers in [songFolder.ts](src/lib/server/songFolder.ts).
- Song page: folder browser, viewer (chord chart formats, PDF…) and practice player, see [docs/songPage.md](docs/songPage.md).
- Venue maps: the provider (OpenStreetMap, Mapbox, HERE, Google) is chosen by `mapsProvider` in herd settings, see [docs/maps.md](docs/maps.md); code in `src/lib/maps/` and `src/lib/components/maps/`.
- Legal: Terms and Privacy Policy, versioned, from CC0 templates (`src/lib/server/legal/`); new accounts accept the Terms. What operators do: [docs/operating.md](docs/operating.md).
- `+page.server.ts` loads conventionally return `pageTitle` and `breadcrumb` alongside data.
- Dates in the UI go through `formatDate()` ([dates.ts](src/lib/dates.ts)): the person's language, else the herd's.
- URLs are `/<id>/<slug>`, under the band's: build them with `bandAppUrl`/`buildVenueUrl`/`buildGigUrl` in [src/lib/misc.ts](src/lib/misc.ts); in the browser, call the band's API through `bandApi()` ([bandApi.ts](src/lib/bandApi.ts)).
- UI follows the design system in [docs/design-system/](docs/design-system/README.md): read it before building or restyling a page.

## Notes

- No `.env`: secrets live in `config/config.json`, created by `npm run init`.
- Test suites are still the create-svelte placeholders.
