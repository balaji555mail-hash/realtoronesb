# Haven Realty

A responsive property catalog with search, price/type filters, saved homes, property inquiry forms, and a password-protected admin portal with search and CSV export. Inquiries persist in SQLite under `.local/haven.db`.

## Run

Requires Node.js 24 or newer. No dependency installation is needed.

```sh
npm start
```

The server uses port 3000 (override with `PORT`). Open `/` for listings and `/admin` for inquiries. For local development the admin password is `change-me-local`. Set `ADMIN_PASSWORD` to your own strong password before sharing the application. Production mode requires it and uses Secure session cookies, so serve behind HTTPS:

```sh
NODE_ENV=production ADMIN_PASSWORD='your-own-strong-password' npm start
```

Do not commit passwords or the SQLite database. Back up `.local/haven.db`; sessions are in memory and signing in is required again after a server restart. `DB_PATH` can specify a separate persistent SQLite file.

## Validate

```sh
npm test
```

The integration tests use a temporary database and test listing retrieval, inquiry validation and persistence, protected admin access, login, and logout.

## Customize

Replace the sample property records in `server.js` with the realtor’s real inventory and licensed photos. Replace the placeholder `hello@haven.example` contact links. Sample properties and external Unsplash photos are illustrative. The site uses Google Fonts with local sans-serif fallbacks.

This initial version supports viewing inquiries, not editing property inventory in the browser. Interest is stored for admin follow-up; it does not send notification emails or SMS. Before a public launch, configure HTTPS, a strong admin password, backups, your privacy policy, and abuse protection appropriate to your traffic.
