# APXNET Account — Account Service

Central account store + authentication for all APXNET apps.

## Services (short names)

| Service | Container | URL (LAN) | URL (Tailscale/global) |
|---|---|---|---|
| Backend API | `acct-backend` | http://192.168.0.127:5101 | http://100.108.126.45:5101 |
| User portal | `acct-user` | http://192.168.0.127:3102 | http://100.108.126.45:3102 |
| Admin console | `acct-admin` | http://192.168.0.127:3103 | http://100.108.126.45:3103 |
| Postgres | `acct-db` | internal only | — |

Frontends = 31xx series, backend = 51xx series (per convention).

## Quick start (Ubuntu + Docker)

```bash
cd /mnt/storage_2/apps/APXNET-ACCOUNT-AND-MAIL-PROJECT
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Default admin (from `.env`) — THE single admin for profile-admin + nas-admin:
- email: `control@apxnet.lab`
- password: `control`

## Short container names

Project name is `acct` (via `COMPOSE_PROJECT_NAME` in `.env`), containers are
fixed: `acct-db`, `acct-backend`, `acct-user`, `acct-admin`. Use short service
names too:

```bash
docker compose logs -f backend
docker compose logs -f user
docker compose logs -f admin
docker compose logs -f db
docker compose restart backend
```

## Live UI editing (no rebuild)

Both frontends run `npm run dev` inside Docker (NOT `npm run build`), and
`app/`, `lib/`, `next.config.js` are bind-mounted. Edit any file on the host —
the browser refreshes instantly. If you change `package.json`, rebuild:

```bash
docker compose up -d --build user admin
```

## Switch between LAN and Tailscale URL

Browsers need the backend address baked into the frontend. `.env` has:

```
NEXT_PUBLIC_API_URL=http://192.168.0.127:5101
```

For Tailscale clients, change it to `http://100.108.126.45:5101` then:

```bash
docker compose up -d user admin
```

(Backend itself binds `0.0.0.0:5101` so it answers on both IPs regardless.)

## API

Auth is **cookie-based**: login/register/refresh set two `httpOnly` cookies — `apx_access` (short-lived JWT, path `/api`) and `apx_refresh` (session token, path `/api/auth`). Nothing is stored in `localStorage`; the frontends send `credentials: 'include'` and transparently call `/api/auth/refresh` when the access token expires, so a user stays logged in until they log out (or their password changes / they are suspended). `Authorization: Bearer <token>` is still accepted for scripts/CI. The frontends derive the API host from the page's own host (protocol/port from `NEXT_PUBLIC_API_URL`), so opening the UI via LAN IP, Tailscale IP, `localhost` or a DNS name all keep cookies same-host — set `NEXT_PUBLIC_API_SAME_HOST=0` to pin the host instead. The backend rejects state-changing requests from foreign *sites* (same-site cross-origin is fine; extend with `ALLOWED_ORIGINS` in `.env`).

- `POST /api/auth/register` {email,password,name} → sets cookies
- `POST /api/auth/login` {email,password} → sets cookies
- `POST /api/auth/refresh` (cookie or {refreshToken}) → rotates + re-sets cookies
- `POST /api/auth/logout` → revokes session, clears cookies
- `GET /api/me/me` (cookie or Bearer access)
- `PATCH /api/me/me` {name}
- `POST /api/me/change-password` {currentPassword,newPassword} (revokes all sessions)
- Admin (admin cookie or Bearer): `GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`, `DELETE /api/admin/users/:id`
- Internal (service key `x-service-key`, for NAS backend): `POST /api/internal/verify` {identifier,password}, `GET /api/internal/user?email=`, `POST /api/internal/upsert` {email,password?,name?,role?,status?}
- `GET /health`

## NAS central auth (HOME-LAB/NAS delegates here)

NAS (`apxnet-nas-backend` :5100) does **not** own passwords anymore:

- `POST /api/auth/login` → verifies against `POST /api/internal/verify` here.
  `admin` maps to `control@apxnet.lab`; `agni` → `agni@apxnet.lab`, etc.
- `POST /api/auth/register` → creates the user here first (`/api/internal/upsert`), then mirrors a NAS-local row (shares/SMB key off the numeric NAS id; local password is an unusable placeholder).
- `POST /api/auth/change-password` → verified + updated here.
- `POST /api/storage/admin/users` → creates centrally first, then the NAS row.
- Legacy NAS-local bcrypt still works as fallback (pre-migration accounts) and self-migrates the password centrally on success.
- Suspend centrally (`status=suspended` via acct-admin or internal upsert) → NAS login blocked immediately.

NAS usernames were migrated to central emails (`backend/migrate-central-auth.sql`, idempotent — already applied):
`admin` → `control@apxnet.lab`, `agni` → `agni@apxnet.lab`, etc. Shares/SMB/permissions untouched (keyed by id).

Config: `ACCOUNT_API_URL` + `ACCOUNT_SERVICE_KEY` in `HOME-LAB/NAS/.env` must match `ACCOUNT_SERVICE_KEY` here. After changing NAS `.env`, recreate (not just restart) the backend: `docker compose up -d backend`.

## Useful commands

```bash
docker compose logs -f                    # all logs
docker compose restart backend
docker compose down                       # stop (keeps DB volume)
docker compose down -v                    # stop + wipe DB
```

