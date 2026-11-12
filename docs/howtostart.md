# How to start Packd

Choose Docker for running the app and database together, or local development for editing code with automatic reloads. Run commands from the repository root unless a step says otherwise.

## 1. Configure your environment

Install and start Docker Desktop (with Docker Compose). Local development also needs Node.js 24 and npm.

Create your environment file only if it does not already exist:

```sh
# From the repository root; preserves an existing .env file.
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
fi
openssl rand -base64 32
```

Edit `frontend/.env`, using the generated value for `AUTH_SECRET`:

```dotenv
DATABASE_URL=postgresql://packd:packd_local_only@localhost:54329/packd
AUTH_SECRET=your-generated-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_URL=http://localhost:3002
AUTH_TRUST_HOST=true
```

These instructions use **port 3002** for both startup methods. Register this exact authorized redirect URI in your Google OAuth web application:

```text
http://localhost:3002/api/auth/callback/google
```

For AI suggestions, also configure these server-only values:

```dotenv
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-3.6-flash
TAVILY_API_KEY=your-tavily-key
AI_DAILY_REQUEST_LIMIT=100
```

Both provider keys are required for suggestions. Manual activity creation works without them. Keep `frontend/.env` private; it is ignored by Git. Vercel environment variables are configured separately and are not automatically downloaded into this file.

## 2A. Run everything in Docker

From the repository root:

```sh
PACKD_PORT=3002 docker compose up --build -d
```

The first build can take several minutes. Compose starts PostgreSQL, applies committed migrations, and starts the production app. It overrides `DATABASE_URL` to use the database container and sets `AUTH_URL` to the selected local port. If you previously exported `PACKD_PUBLIC_URL`, unset it before starting locally so it does not override the local address.

Open **http://localhost:3002** and sign in with Google. The development demo login is disabled in this production container.

Check startup and health:

```sh
PACKD_PORT=3002 docker compose ps
PACKD_PORT=3002 docker compose logs --tail=100 app
curl --fail http://localhost:3002/api/health
```

Follow logs while reproducing a problem (Ctrl+C stops following logs, not the app):

```sh
PACKD_PORT=3002 docker compose logs -f app
```

After changing application code, rebuild:

```sh
PACKD_PORT=3002 docker compose up --build -d app
```

After changing only `frontend/.env`, recreate the app so it reads the new values:

```sh
PACKD_PORT=3002 docker compose up -d --force-recreate app
```

Stop the containers while keeping your database:

```sh
PACKD_PORT=3002 docker compose stop
```

Do not use `docker compose down -v` unless you intend to delete the local database volume.

## 2B. Run the app locally, with PostgreSQL in Docker

Stop the Docker app first if it is running, then start only the database:

```sh
# From the repository root.
PACKD_PORT=3002 docker compose stop app
docker compose up -d db
cd frontend
npm ci
npm run db:generate
npm run db:migrate
npm run dev -- --port 3002
```

Keep this terminal open and visit **http://localhost:3002**. Changes to application code reload automatically. Ctrl+C stops the development server.

For this mode, `frontend/.env` must use the host database address:

```dotenv
DATABASE_URL=postgresql://packd:packd_local_only@localhost:54329/packd
AUTH_URL=http://localhost:3002
```

If Google OAuth is not configured, you can optionally set `ALLOW_DEV_LOGIN=true` in `frontend/.env`, restart the development server, and use the local demo account button. This creates a separate demo account; it does not sign in as your Google account. It is available only in development mode on localhost.

On subsequent starts, you usually only need:

```sh
# From the repository root.
docker compose up -d db
cd frontend
npm run dev -- --port 3002
```

Run `npm ci` when dependencies change, and `npm run db:generate` plus `npm run db:migrate` when pulling schema or migration changes. Restart the development server after changing environment variables.

## Troubleshooting

- **Port 3002 is occupied:** stop the other app, or choose another port consistently in the startup command, `AUTH_URL`, and Google redirect URI. Docker uses `PACKD_PORT`; the local dev server uses `--port`.
- **Google redirect mismatch:** check the exact scheme, hostname, port, and `/api/auth/callback/google` path registered in Google.
- **Database connection fails locally:** check that `docker compose ps` shows a healthy database. The host uses `localhost:54329`; the app container uses `db:5432`. Neither local setup requires Supabase.
- **Suggestions are unavailable:** verify both provider keys and the model setting, then restart/recreate the app. Provider capacity, quota, credentials, or response-validation failures can produce this generic message; it does not identify the underlying cause by itself.
- **Old database migration errors:** inspect the error before changing data. Do not reset an existing database or mark migrations applied merely to bypass an error.

Both modes use the same persistent local PostgreSQL volume, so existing trips remain when switching between them. For test database commands, see [README verification](../README.md#verification).
