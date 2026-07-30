# Hostinger VPS — Avonix AI (`apps/web`)

Next.js needs **Node.js** (not shared cPanel PHP hosting). Use a Hostinger **VPS**.

## 1. Server setup (once)

```bash
# Ubuntu example
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
```

Install Postgres (or use Hostinger managed DB). Create a database and user.

## 2. Clone & configure

```bash
git clone <YOUR_GITHUB_REPO_URL> Avonix-AI
cd Avonix-AI/apps/web
cp .env.example .env
nano .env   # fill real values — never commit .env
```

Required env (see `.env.example`):

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL` → `https://your-domain.com` (must match the public URL; verification links use this)
- `BETTER_AUTH_SECRET` → long random string
- **Email:** `EMAIL_FROM` + either **SMTP_*** (Gmail App Password / any SMTP) or **`RESEND_API_KEY`** (see §6)
- **Google sign-in (optional):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (see §7)
- Stripe / AI keys as you use them

## 3. Build & run

```bash
npm ci
npm run db:migrate   # or your migration command once DB is ready
SKIP_TYPECHECK=1 npm run build
pm2 start npm --name avonix -- start
pm2 save
pm2 startup
```

App listens on **port 3000** by default.

## 4. Nginx reverse proxy

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then enable SSL (Hostinger panel or Certbot).

## 5. WordPress connector

Zip/install `apps/wp-connector` on each client WordPress site. Point it at `https://your-domain.com`.

## 6. Live email — SMTP (Gmail) or Resend

Without a live transport, production signup will **error** instead of writing to `.mail/`.

### Option A — Gmail / Google Workspace SMTP (recommended if you already use Google)

1. Google Account → **Security** → enable 2-Step Verification.
2. Create an **App Password** (Search “App passwords”).
3. On the VPS `.env`:

```bash
EMAIL_FROM=Avonix AI <you@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Prefer a Workspace address with SPF/DKIM on your domain for better deliverability.

### Option B — Resend

1. [resend.com](https://resend.com) → API key + verify domain DNS.
2. On the VPS `.env`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=Avonix AI <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

If both SMTP and Resend are set, **SMTP wins**.

### Restart after env changes

```bash
cd ~/Avonix-AI/apps/web
SKIP_TYPECHECK=1 npm run build   # needed if NEXT_PUBLIC_* changed
pm2 restart avonix
pm2 logs avonix --lines 80
```

## 7. Social login — Google + Microsoft

Sign-in / Sign-up show **Verify with Google** and **Verify with Microsoft** when
the matching env vars are set. Paste live Client ID + Secret into `.env` and rebuild.

### Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client (Web).
2. Redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (local)
3. Env:

```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### Microsoft (Entra ID)

1. [Azure Portal](https://portal.azure.com) → App registrations → New registration.
2. Redirect URI (Web):
   - `https://your-domain.com/api/auth/callback/microsoft`
   - `http://localhost:3000/api/auth/callback/microsoft`
3. Certificates & secrets → New client secret.
4. Env:

```bash
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_TENANT_ID=common
```

`MICROSOFT_TENANT_ID`: `common` (any Microsoft account), `organizations` (work/school only), `consumers` (personal only), or your directory GUID.

5. Rebuild + restart (`NEXT_PUBLIC_*` requires rebuild):

```bash
SKIP_TYPECHECK=1 npm run build && pm2 restart avonix
```

## 9. Automation cron (follow-ups, missed chat, uptime)

Set in `.env`:

```bash
CRON_SECRET=long-random-string
# Optional SMS:
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Every 5 minutes (crontab as root or deploy user):

```bash
*/5 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/automation >/dev/null 2>&1
```

On Vercel, `apps/web/vercel.json` already schedules `*/5 * * * *` — set the same `CRON_SECRET` in project env.

## What is NOT uploaded from local

| Path | Why |
|---|---|
| `.env` / `.env.local` | Secrets — create on the VPS |
| `node_modules/` | Run `npm ci` on the server |
| `.next/` | Run `npm run build` on the server |

## Updates later (copy-paste every deploy)

Production app: **PM2 `avonix-web` on port `3002`** · code: `/root/Avonix-AI` · proxy: Apache → `127.0.0.1:3002`.

```bash
# 1) App (avonixai.com)
cd /root/Avonix-AI
git pull
cd apps/web
SKIP_TYPECHECK=1 npm run build
pm2 delete avonix-web
pm2 start npm --name avonix-web --cwd /root/Avonix-AI/apps/web -- start -- -p 3002
pm2 save
curl -sI http://127.0.0.1:3002 | head -3
```

```bash
# 2) WP connector zip (only when plugin version changed)
cd /root/Avonix-AI
zip -r /tmp/avonix-connector.zip apps/wp-connector -x '*.DS_Store'
# Download /tmp/avonix-connector.zip → WP Admin → Plugins → upload/replace
# Or: Avonix → connector download (after app deploy)
```

Check: `pm2 list` · `ss -tlnp | grep 3002` · `https://avonixai.com`