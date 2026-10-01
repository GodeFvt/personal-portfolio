# Ubuntu production guide

This path is an alternative to Vercel. It runs the same Nitro server as a non-root user behind Nginx. PostgreSQL is always external to the production Compose stack.

## Initial setup

1. Install Docker Engine with the Compose plugin, Nginx-compatible TLS certificates, and a maintained Ubuntu LTS host. Allow inbound TCP 80/443; do not expose PostgreSQL.
2. Point the chosen DNS name to the host.
3. Copy `ops/production.env.example` to `.env.production`, replace every placeholder, set `NUXT_PUBLIC_SITE_URL` to the final HTTPS origin, then restrict the file to the operator account.
4. Set `DATABASE_URL` and `DIRECT_URL` to the existing managed PostgreSQL service. `compose.prod.yml` intentionally does not create, expose, migrate, or back up a database container.
5. Obtain the initial certificate while ports 80/443 are free, for example `sudo certbot certonly --standalone -d portfolio.example.com`, then set `NGINX_CERTS_DIR=/etc/letsencrypt`. Nginx mounts this directory read-only.
6. Use `STORAGE_PROVIDER=local` only with the `portfolio_media` volume and off-host backups. Vercel Blob can be used instead by setting its server-only credentials.

## Release procedure

Build without embedding secrets:

```sh
docker compose --env-file .env.production -f compose.prod.yml build app
```

Run the one-off migration from the checked-out release before replacing the app:

```sh
npm ci
set -a && . ./.env.production && set +a
npm run db:deploy
```

The runtime image intentionally contains only the built Nitro output, so Prisma CLI and migration sources are not shipped in the app layer. `db:deploy` uses `DIRECT_URL`. After migration:

```sh
docker compose --env-file .env.production -f compose.prod.yml up -d
docker compose --env-file .env.production -f compose.prod.yml ps
curl --fail https://your-domain.example/api/site
```

Compose waits for the app health check before starting Nginx. Nginx redirects HTTP to HTTPS, terminates TLS, forwards the canonical scheme/IP/host headers, supports upgrades, limits uploads to 11 MB, and exposes `/nginx-health`. Containers restart unless stopped and logs remain on stdout/stderr without environment values.

Renew certificates on the host with Certbot, then reload the proxy without restarting the app:

```sh
sudo certbot renew
docker compose --env-file .env.production -f compose.prod.yml exec nginx nginx -s reload
```

## Backup and restore

Back up PostgreSQL plus the local-media directory at the same logical point. `ops/backup.sh` requires `pg_dump`; set `BACKUP_DIR`, `DATABASE_URL`, and `LOCAL_STORAGE_DIR`. Copy the resulting timestamped directory off-host and retain the OAuth keyring in a separate secret backup.

Test restores into a new empty database before relying on them:

```sh
BACKUP_DIR=/srv/portfolio-backups DATABASE_URL="$DIRECT_URL" LOCAL_STORAGE_DIR=/srv/portfolio-media ./ops/backup.sh
RESTORE_DIR=/srv/portfolio-backups/20261002T000000Z DATABASE_URL="$EMPTY_RESTORE_URL" LOCAL_STORAGE_DIR=/srv/portfolio-restore-media ./ops/restore.sh
```

After restore, start an isolated app against the restored database, verify `/api/site`, sign in, check an uploaded image and résumé, and confirm an encrypted provider config can be read with the restored keyring. Never restore over the only production database as a test.

For rollback, retain the previous image tag and switch the app back after checking schema compatibility. Database changes use forward fixes unless a complete, tested disaster-recovery restore is required.
