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
- `NEXT_PUBLIC_APP_URL` → `https://your-domain.com`
- `BETTER_AUTH_SECRET` → long random string
- Stripe / email / AI keys as you use them

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

## What is NOT uploaded from local

| Path | Why |
|---|---|
| `.env` / `.env.local` | Secrets — create on the VPS |
| `node_modules/` | Run `npm ci` on the server |
| `.next/` | Run `npm run build` on the server |

## Updates later

```bash
cd ~/Avonix-AI
git pull
cd apps/web
npm ci
SKIP_TYPECHECK=1 npm run build
pm2 restart avonix
```
