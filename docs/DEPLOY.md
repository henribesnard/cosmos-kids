# Deployment — COSMOS KIDS + Nova

Production deployment procedure for the static SPA and the Nova API server behind a Caddy reverse proxy.

## Prerequisites

- **Local machine**: Node.js 22.13+, npm 11+, SSH access to the VPS, bash (Git Bash or WSL on Windows)
- **VPS**: Ubuntu 24.04+, Caddy 2+, Node.js 22+, systemd
- **System user**: `cosmoskids` (no shell, runs the Nova service)
- **Secrets file**: `/etc/cosmos-kids/nova.env` (owner root, group cosmoskids, mode 640)

The deploy script assumes the VPS is already set up: `cosmoskids` user, `/etc/cosmos-kids/nova.env`, `cosmos-kids-nova.service`, and the Caddy block for the domain (with `/api/nova` proxy). The first deployment follows the manual procedure below; subsequent deployments use the script.

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

All release files are owned by **root** (directories 755, files 644). The `cosmoskids` service user reads them without write access.

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

## First deployment (manual)

Before the script can be used, set up the VPS:

1. Create the system user: `useradd --system --no-create-home --shell /usr/sbin/nologin cosmoskids`
2. Create directories: `mkdir -p /var/www/cosmoskids/releases /opt/cosmos-kids/nova /etc/cosmos-kids`
3. Create the secrets file: `touch /etc/cosmos-kids/nova.env && chown root:cosmoskids /etc/cosmos-kids/nova.env && chmod 640 /etc/cosmos-kids/nova.env`
4. Fill in the secrets (manually edit `/etc/cosmos-kids/nova.env`)
5. Install the systemd unit `cosmos-kids-nova.service`
6. Configure the Caddy block for the domain (with `/api/nova` proxy, `flush_interval -1`, security headers)
7. Upload the first build, create symlinks, start the service, reload Caddy
8. Verify via the public domain

Subsequent deployments use the script.

## Deploy (script)

```bash
bash scripts/deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN>
```

The script:
1. Saves the current symlink targets (`readlink -f`) for exact rollback
2. Checks out the tag, runs `npm ci`, `npm run build`, `npm run build:server`
3. Uploads `dist/` and `dist-server/index.mjs` to the VPS (owned by root, 755/644)
4. Switches the Nova server symlink, restarts the service, checks `/health` locally
5. Switches the static site symlink
6. Verifies via the public domain: `https://<DOMAIN>/` (200), `https://<DOMAIN>/trajets/earth-to-moon` (200), `POST https://<DOMAIN>/api/nova` with `{}` (400)
7. On any check failure: automatic rollback to the saved targets
8. Lists existing versions and their sizes

### --prune N

By default, old versions are **not** deleted. To clean up after a successful deploy:

```bash
bash scripts/deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN> --prune 3
```

This keeps the N most recent releases. The current version and the previous version (rollback target) are never deleted, even if N is small.

Without `--prune`, the script lists all versions and their sizes so you can decide.

## Rollback

### Automatic rollback

The deploy script saves the exact symlink targets before deploying. If any check fails, it restores those exact targets. If there was no previous server version (first deployment), it stops the Nova service and restores only the static site.

### Manual rollback

```bash
# 1. Find the previous targets
ls -lt /var/www/cosmoskids/releases/
ls -lt /opt/cosmos-kids/nova/

# 2. Switch symlinks back to exact paths
ln -sfn /var/www/cosmoskids/releases/<PREVIOUS> /var/www/cosmoskids/current
ln -sfn /opt/cosmos-kids/nova/<PREVIOUS_TAG> /opt/cosmos-kids/nova/current
systemctl restart cosmos-kids-nova
```

If the Caddy config was changed, restore the backup:

```bash
cp /etc/caddy/Caddyfile.bak.<TIMESTAMP> /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

## Health checks

- **Nova health**: `curl http://127.0.0.1:3001/health` (from VPS)
- **Nova via domain**: `curl -X POST https://<DOMAIN>/api/nova -H 'Content-Type: application/json' -d '{"question":"test","locale":"fr"}'`
- **Static site**: `curl -sf -o /dev/null -w '%{http_code}' https://<DOMAIN>/`
- **Deep routes**: `/trajets/earth-to-moon`, `/carnet`, `/parents`

## Monitoring

- **Service logs**: `journalctl -u cosmos-kids-nova -f`
- **Certificate renewal**: automatic via Caddy (check Caddy logs)
- **Disk space**: `df -h /` (keep below 85%)
- **Mistral/Exa costs**: track via their respective dashboards
- **Rate limit**: default 20 questions/hour/IP (configurable via `NOVA_MAX_QUESTIONS_PER_HOUR`)
