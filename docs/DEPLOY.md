# Deployment — COSMOS KIDS + Nova

Production deployment procedure for the static SPA and the Nova API server behind a Caddy reverse proxy.

## Prerequisites

- **Local machine**: Node.js 22.13+, npm 11+, SSH access to the VPS
- **VPS**: Ubuntu 24.04+, Caddy 2+, Node.js 22+, systemd
- **System user**: `cosmoskids` (no shell, runs the Nova service)
- **Secrets file**: `/etc/cosmos-kids/nova.env` (owner root, group cosmoskids, mode 640)

## Architecture

```
Client (browser)
    |
    v
Caddy (443/80)
    |-- /assets/*           --> static files (dist/)
    |-- /api/nova           --> reverse_proxy 127.0.0.1:3001 (SSE, no buffering)
    |-- /*                  --> SPA fallback (index.html)
    v
cosmos-kids-nova.service (Node.js, 127.0.0.1:3001)
    |
    +--> Mistral API (api.mistral.ai)
    +--> Exa Search  (api.exa.ai, optional)
```

## Directory layout

```
/var/www/cosmoskids/
  releases/
    <YYYYMMDD-HHMM>-<tag>/    # static dist/ per version
  current -> releases/<latest> # symlink, Caddy root

/opt/cosmos-kids/nova/
  <tag>/index.mjs              # server bundle per version
  current -> <tag>/            # symlink, systemd WorkingDirectory

/etc/cosmos-kids/
  nova.env                     # secrets (MISTRAL_API_KEY, EXA_API_KEY, NOVA_*)
```

## Secrets (nova.env)

The file must contain at minimum:

```bash
MISTRAL_API_KEY=<value>
EXA_API_KEY=<value>
NOVA_CORS_ORIGIN=https://<DOMAIN>
# Optional overrides:
# NOVA_MAX_QUESTIONS_PER_HOUR=20
# NOVA_TIMEOUT_MS=30000
# NOVA_HOST=127.0.0.1
# NOVA_PORT=3001
```

Never commit secrets. Never place secrets under `/var/www/`.

## Build (on a local machine, not the VPS)

```bash
# From a clean worktree of the target tag
git worktree add /tmp/cosmos-build <TAG>
cd /tmp/cosmos-build
npm ci
npm run build           # produces dist/
npm run build:server    # produces dist-server/index.mjs
```

The server bundle (`dist-server/index.mjs`) is a single self-contained ESM file. It imports only `node:` built-in modules and requires no `node_modules` at runtime.

## Deploy

Use the automated script:

```bash
bash scripts/deploy.sh <TAG> <VPS_USER>@<VPS_HOST> <SSH_KEY>
```

Or manually:

### 1. Upload

```bash
RELEASE="$(date +%Y%m%d-%H%M)-<TAG>"
ssh <VPS> "mkdir -p /var/www/cosmoskids/releases/$RELEASE"
scp -r dist/* <VPS>:/var/www/cosmoskids/releases/$RELEASE/
ssh <VPS> "mkdir -p /opt/cosmos-kids/nova/<TAG>"
scp dist-server/index.mjs <VPS>:/opt/cosmos-kids/nova/<TAG>/
```

### 2. Switch Nova server

```bash
ssh <VPS> "ln -sfn /opt/cosmos-kids/nova/<TAG> /opt/cosmos-kids/nova/current"
ssh <VPS> "sudo systemctl restart cosmos-kids-nova"
ssh <VPS> "curl -sf http://127.0.0.1:3001/health"
```

### 3. Switch static site

```bash
ssh <VPS> "ln -sfn /var/www/cosmoskids/releases/$RELEASE /var/www/cosmoskids/current"
```

### 4. Reload Caddy (only if config changed)

```bash
ssh <VPS> "caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy"
```

## Rollback

### Quick rollback (previous version)

```bash
# Find the previous release
ssh <VPS> "ls -lt /var/www/cosmoskids/releases/ | head -5"

# Switch symlinks back
ssh <VPS> "ln -sfn /var/www/cosmoskids/releases/<PREVIOUS> /var/www/cosmoskids/current"
ssh <VPS> "ln -sfn /opt/cosmos-kids/nova/<PREVIOUS_TAG> /opt/cosmos-kids/nova/current"
ssh <VPS> "sudo systemctl restart cosmos-kids-nova"
```

If the Caddy config was changed, restore the backup:

```bash
ssh <VPS> "cp /etc/caddy/Caddyfile.bak.<TIMESTAMP> /etc/caddy/Caddyfile"
ssh <VPS> "caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy"
```

## Health checks

- **Nova health**: `curl http://127.0.0.1:3001/health` (from VPS)
- **Nova API**: `curl -X POST https://<DOMAIN>/api/nova -H 'Content-Type: application/json' -d '{"question":"test","locale":"fr"}'`
- **Static site**: `curl -sf -o /dev/null -w '%{http_code}' https://<DOMAIN>/`
- **Deep routes**: `/trajets/earth-to-moon`, `/carnet`, `/parents`

## Cleanup

The deploy script keeps the 3 most recent static releases and the 3 most recent server bundles. To clean manually:

```bash
# List releases by date
ls -lt /var/www/cosmoskids/releases/
# Remove old ones (never remove the current symlink target)
rm -rf /var/www/cosmoskids/releases/<OLD>
```

## Monitoring

- **Service logs**: `journalctl -u cosmos-kids-nova -f`
- **Certificate renewal**: automatic via Caddy (check `caddy certificates` or Caddy logs)
- **Disk space**: `df -h /` (keep below 85%)
- **Mistral/Exa costs**: track via their respective dashboards
- **Rate limit**: default 20 questions/hour/IP (configurable via `NOVA_MAX_QUESTIONS_PER_HOUR`)
