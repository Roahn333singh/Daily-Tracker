## App Platform (this screen)

### Why “No components detected”?

Auto-detect only looks at the **repo root**. Files used to live only under `backend/` and `frontend/`, so DO saw nothing.

**Fixed:** a root [`Dockerfile`](../Dockerfile) is now in `main` (push if you haven’t).

### What to enter on that form

| Field | Value |
|--------|--------|
| Git provider | GitHub |
| Repository | `Roahn333singh/Daily-Tracker` |
| Branch | `main` |
| **Source directory** | **leave blank** |
| Autodeploy | checked |

Then **Next**. You should see a **Dockerfile** resource.

### After resources appear

1. HTTP port: **8080** (matches the root image)
2. Environment variables → add secret:
   - `GEMINI_API_KEY` = your key  
   - optional: `VISION_MODEL=gemini-2.5-flash`, `VISION_PROVIDER=gemini`
3. Create resources / launch app
4. Open the app URL DO gives you (`https://….ondigitalocean.app`)

If it still says no components: hard-refresh after `git pull` on GitHub confirms `Dockerfile` is at the root of `main`.

---

## Droplet path (Docker Compose)

## 1. Create a Droplet

1. DigitalOcean → Create → Droplets
2. Image: **Ubuntu 24.04 LTS**
3. Plan: Basic, Regular, **1GB RAM** minimum (2GB recommended)
4. Auth: SSH key (recommended)
5. Enable: Monitoring optional
6. Create droplet → note its **public IP**

Optional: attach a domain (A record → droplet IP) in DO Networking → Domains.

## 2. Point DNS (optional)

```
A    @       YOUR_DROPLET_IP
A    www     YOUR_DROPLET_IP
```

## 3. SSH in and install Docker

```bash
ssh root@YOUR_DROPLET_IP

# Docker Engine + Compose plugin
apt-get update
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 4. Clone the app

```bash
cd /opt
git clone YOUR_REPO_URL daily-tracker
# Or scp / rsync from your laptop:
# rsync -avz --exclude node_modules --exclude .venv --exclude frontend/dist \
#   ./ user@YOUR_IP:/opt/daily-tracker/

cd /opt/daily-tracker
```

## 5. Configure secrets

```bash
# On the droplet
nano /opt/daily-tracker/backend/.env
```

Minimum:

```env
GEMINI_API_KEY=your-gemini-key
VISION_MODEL=gemini-2.5-flash
VISION_PROVIDER=gemini
```

Never commit this file. `docker-compose` loads `backend/.env` into the API container.

## 6. Build and run

```bash
cd /opt/daily-tracker
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1/api/health
```

Open in browser: **http://YOUR_DROPLET_IP**

- App UI: `/`
- API health: `/api/health`
- Swagger: `/docs`
- SQLite + meal photos persist in Docker volume `tracker_data`

## 7. HTTPS with Caddy (recommended after DNS)

```bash
# Install Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Stop publishing host :80 from compose — use Caddy as frontend
# Edit docker-compose.yml web ports to "127.0.0.1:8080:80" then:
docker compose up -d

cat >/etc/caddy/Caddyfile <<'EOF'
your.domain.com {
    reverse_proxy 127.0.0.1:8080
}
EOF

systemctl reload caddy
```

## 8. Updates

```bash
cd /opt/daily-tracker
git pull
docker compose up -d --build
```

## 9. Logs & backup

```bash
docker compose logs -f api
docker compose logs -f web

# Backup SQLite + uploads
docker run --rm -v daily-tracker_tracker_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/tracker-backup-$(date +%F).tgz -C /data .
```

## Architecture

```
Internet → nginx (web:80)
              ├─ /            React SPA
              ├─ /api/*       → FastAPI (api:8000)
              ├─ /uploads/*   → FastAPI static
              └─ /docs        → FastAPI Swagger

api container:
  DATA_DIR=/data  (volume)
  tracker.db + uploads/meals
```

## App Platform alternative

If you prefer DO App Platform (managed, no SSH):

1. Push this repo to GitHub
2. Create App from repo
3. Two components:
   - **Service**: Dockerfile path `backend/Dockerfile`, HTTP port 8000, env `GEMINI_API_KEY`, attach volume `/data`
   - **Static site**: build `npm run build` in `frontend`, output `dist`, catch-all routes to `index.html`
4. Set frontend to use relative `/api` only works if you put an **Ingress** or **nginx** unit in front; App Platform often needs a dedicated reverse proxy component or a single Dockerfile that serves both.

**Droplet + Compose is the path this repo targets** for the simplest full-stack + Gemini + SQLite deploy.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `vision_configured: false` | Check `backend/.env` on the droplet and `docker compose restart api` |
| Photo upload fails | Ensure `client_max_body_size` in nginx; 8MB default |
| Blank UI after refresh on route | nginx SPA `try_files` is configured; rebuild web image |
| DB reset after rebuild | Data is in named volume `tracker_data`, not the image — don't `docker compose down -v` |
| Out of memory during build | Use 2GB droplet or build images on your laptop and `docker save` / push to DO registry |
