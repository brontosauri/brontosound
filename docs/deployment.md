# Deployment

Serve Brontosound only behind an HTTPS reverse proxy, with the app's port not reachable directly.

- **`ORIGIN` and `AUTH_URL`**: the public https origin, e.g. `https://band.example`. Without `AUTH_URL`, Auth.js builds its URLs from the `Host` header (`trustHost` in [src/auth.ts](../src/auth.ts)).
- **`ADDRESS_HEADER` and `XFF_DEPTH`**: the header the proxy puts the client address in, and how many proxies there are (e.g. `X-Forwarded-For` and `1`). Sign-in attempts are throttled per address: without these, every visitor shares the proxy's, and anyone can lock `admin` out for everyone. With them and the app port public, anyone can fake the header.
- **`config/`**: `npm run init` creates `config/config.json` (`authSecret`, `googleClientId`, `googleClientSecret`, `adminPasswordHash`). Keep it private and back it up; with Docker, mount it at `/app/config`. Generate a secret by hand with `openssl rand -base64 32`.
- **Map keys** reach browsers by design: restrict each to your domain (HTTP referrer) in its provider's console. See [maps.md](maps.md).
- **Uploads**: `BODY_SIZE_LIMIT` caps request bodies (the Dockerfile sets 200M). Cap request size and connections at the proxy too.
- **`data/`**: create it with `npm run init` (until then, every page says so), and back it up. `data/files/` holds bands' files on herd storage, one folder per band; mount it from elsewhere if you like. The rest is Brontosound's own (database, soundfonts) and shouldn't be shared.
