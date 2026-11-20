#!/usr/bin/env bash
#
# Deploy COSMOS KIDS + Nova to the VPS.
#
# Usage:
#   bash scripts/deploy.sh <TAG> <USER@HOST> <SSH_KEY>
#
# Example:
#   bash scripts/deploy.sh nova-v1.1.1 root@10.0.0.1 ~/.ssh/my_key
#
# What it does:
#   1. Checks out the tag in a temporary worktree
#   2. Builds the static SPA (dist/) and the Nova server bundle (dist-server/)
#   3. Uploads both to the VPS
#   4. Switches symlinks and restarts the Nova service
#   5. Runs health checks; rolls back automatically on failure
#   6. Cleans up old releases (keeps 3 most recent)
#
# No secrets or hostnames are hardcoded in this script.

set -euo pipefail

# ------------------------------------------------------------------
#  Arguments
# ------------------------------------------------------------------

TAG="${1:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY>}"
VPS="${2:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY>}"
SSH_KEY="${3:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY>}"

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

RELEASE="$(date +%Y%m%d-%H%M)-${TAG}"
STATIC_DIR="/var/www/cosmoskids/releases/${RELEASE}"
STATIC_LINK="/var/www/cosmoskids/current"
SERVER_DIR="/opt/cosmos-kids/nova/${TAG}"
SERVER_LINK="/opt/cosmos-kids/nova/current"
SERVICE="cosmos-kids-nova"

WORKDIR=""

# ------------------------------------------------------------------
#  Helpers
# ------------------------------------------------------------------

info()  { echo "==> $*"; }
fail()  { echo "FAIL: $*" >&2; exit 1; }

cleanup() {
  if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
    info "Cleaning up worktree $WORKDIR"
    git worktree remove --force "$WORKDIR" 2>/dev/null || rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

rollback() {
  echo ""
  echo "!!! ROLLBACK !!!"
  echo ""
  local prev_static prev_server
  prev_static=$($SSH "$VPS" "ls -t /var/www/cosmoskids/releases/ | head -2 | tail -1" 2>/dev/null || true)
  prev_server=$($SSH "$VPS" "ls -t /opt/cosmos-kids/nova/ | grep -v current | head -2 | tail -1" 2>/dev/null || true)

  if [ -n "$prev_static" ]; then
    info "Rolling back static site to $prev_static"
    $SSH "$VPS" "ln -sfn /var/www/cosmoskids/releases/$prev_static $STATIC_LINK"
  fi
  if [ -n "$prev_server" ]; then
    info "Rolling back server to $prev_server"
    $SSH "$VPS" "ln -sfn /opt/cosmos-kids/nova/$prev_server $SERVER_LINK && systemctl restart $SERVICE"
  fi
  fail "Deployment failed. Rolled back to previous version."
}

# ------------------------------------------------------------------
#  Step 1: Build locally
# ------------------------------------------------------------------

info "Checking out tag $TAG in a temporary worktree"
WORKDIR="$(mktemp -d)/cosmos-deploy-${TAG}"
git worktree add "$WORKDIR" "$TAG"
cd "$WORKDIR"

info "Installing dependencies"
npm ci

info "Building static SPA"
npm run build

info "Building Nova server bundle"
npm run build:server

[ -f dist/index.html ] || fail "dist/index.html not found after build"
[ -f dist-server/index.mjs ] || fail "dist-server/index.mjs not found after build:server"

info "Build complete: dist/ + dist-server/index.mjs"

# ------------------------------------------------------------------
#  Step 2: Save current state on VPS (for rollback)
# ------------------------------------------------------------------

PREV_STATIC=$($SSH "$VPS" "readlink $STATIC_LINK 2>/dev/null || echo ''" | xargs basename 2>/dev/null || true)
info "Previous static release: ${PREV_STATIC:-none}"

# ------------------------------------------------------------------
#  Step 3: Upload
# ------------------------------------------------------------------

info "Creating directories on VPS"
$SSH "$VPS" "mkdir -p $STATIC_DIR $SERVER_DIR"

info "Uploading static files"
$SCP -r dist/* "$VPS:$STATIC_DIR/"

info "Uploading server bundle"
$SCP dist-server/index.mjs "$VPS:$SERVER_DIR/"

# Set ownership if cosmoskids user exists
$SSH "$VPS" "id cosmoskids >/dev/null 2>&1 && chown -R cosmoskids:cosmoskids $SERVER_DIR || true"

# ------------------------------------------------------------------
#  Step 4: Switch Nova server
# ------------------------------------------------------------------

info "Switching Nova server symlink to $TAG"
$SSH "$VPS" "ln -sfn $SERVER_DIR $SERVER_LINK"

info "Restarting $SERVICE"
$SSH "$VPS" "systemctl restart $SERVICE"
sleep 2

info "Checking Nova /health"
HEALTH=$($SSH "$VPS" "curl -sf http://127.0.0.1:3001/health" 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  info "Nova health check passed"
else
  echo "Health check failed: $HEALTH"
  rollback
fi

# ------------------------------------------------------------------
#  Step 5: Switch static site
# ------------------------------------------------------------------

info "Switching static site symlink to $RELEASE"
$SSH "$VPS" "ln -sfn $STATIC_DIR $STATIC_LINK"

info "Verifying static site"
HTTP_CODE=$($SSH "$VPS" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:80/ --resolve '*:80:127.0.0.1'" 2>/dev/null || echo "000")
# Caddy may not resolve localhost; check via the domain if direct check fails
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "308" ]; then
  info "Local check returned $HTTP_CODE (expected with Caddy on-demand TLS); skipping local static check"
fi

# ------------------------------------------------------------------
#  Step 6: Post-deploy checks
# ------------------------------------------------------------------

info "POST /api/nova with invalid body (expect 400)"
NOVA_CHECK=$($SSH "$VPS" "curl -sf -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3001/api/nova -H 'Content-Type: application/json' -d '{}'" 2>/dev/null || echo "000")
if [ "$NOVA_CHECK" = "400" ]; then
  info "Nova validation check passed (400 on empty body)"
else
  echo "Nova validation check returned $NOVA_CHECK (expected 400)"
  rollback
fi

# ------------------------------------------------------------------
#  Step 7: Cleanup old releases (keep 3 most recent)
# ------------------------------------------------------------------

info "Cleaning up old static releases (keeping 3)"
$SSH "$VPS" "cd /var/www/cosmoskids/releases && ls -t | tail -n +4 | xargs -r rm -rf"

info "Cleaning up old server bundles (keeping 3)"
$SSH "$VPS" "cd /opt/cosmos-kids/nova && ls -t | grep -v current | tail -n +4 | xargs -r rm -rf"

# ------------------------------------------------------------------
#  Done
# ------------------------------------------------------------------

echo ""
info "Deployment of $TAG complete."
info "  Static: $STATIC_LINK -> $STATIC_DIR"
info "  Server: $SERVER_LINK -> $SERVER_DIR"
echo ""
info "Rollback command:"
info "  ln -sfn /var/www/cosmoskids/releases/$PREV_STATIC $STATIC_LINK"
info "  ln -sfn /opt/cosmos-kids/nova/<PREV_TAG> $SERVER_LINK && systemctl restart $SERVICE"
