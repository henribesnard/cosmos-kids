#!/usr/bin/env bash
#
# Deploy COSMOS KIDS + Nova to the VPS.
#
# Prerequisites:
#   - The VPS already has: cosmoskids user, /etc/cosmos-kids/nova.env,
#     cosmos-kids-nova.service, Caddy config with /api/nova proxy.
#     (First deployment follows the manual procedure in docs/DEPLOY.md.)
#   - Run from Git Bash or WSL on Windows, or any bash on Linux/macOS.
#
# Usage:
#   bash scripts/deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN>
#
# Options:
#   --prune N   After a successful deploy, remove old releases keeping
#               the N most recent (plus current and previous). Without
#               this flag, the script only lists existing versions and
#               their sizes at the end.
#
# Example:
#   bash scripts/deploy.sh nova-v1.1.1 root@10.0.0.1 ~/.ssh/key cosmoskids.example.com
#   bash scripts/deploy.sh nova-v1.2.0 root@10.0.0.1 ~/.ssh/key cosmoskids.example.com --prune 3
#
# No secrets or hostnames are hardcoded in this script.

set -euo pipefail

# ------------------------------------------------------------------
#  Parse arguments
# ------------------------------------------------------------------

PRUNE_KEEP=""

positional=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prune)
      PRUNE_KEEP="${2:?--prune requires a number}"
      shift 2
      ;;
    *)
      positional+=("$1")
      shift
      ;;
  esac
done

TAG="${positional[0]:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN> [--prune N]}"
VPS="${positional[1]:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN> [--prune N]}"
SSH_KEY="${positional[2]:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN> [--prune N]}"
DOMAIN="${positional[3]:?Usage: deploy.sh <TAG> <USER@HOST> <SSH_KEY> <DOMAIN> [--prune N]}"

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
#  Save current symlink targets (for rollback)
# ------------------------------------------------------------------

PREV_STATIC_TARGET=$($SSH "$VPS" "[ -L $STATIC_LINK ] && readlink -f $STATIC_LINK || echo ''" || true)
PREV_SERVER_TARGET=$($SSH "$VPS" "[ -L $SERVER_LINK ] && readlink -f $SERVER_LINK || echo ''" || true)

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

  # Restore static site
  if [ -n "$PREV_STATIC_TARGET" ] && [ "$PREV_STATIC_TARGET" != "" ]; then
    info "Rolling back static site to $PREV_STATIC_TARGET"
    $SSH "$VPS" "ln -sfn $PREV_STATIC_TARGET $STATIC_LINK"
  fi

  # Restore server (or stop it if there was no previous version)
  if [ -n "$PREV_SERVER_TARGET" ] && [ "$PREV_SERVER_TARGET" != "" ]; then
    info "Rolling back server to $PREV_SERVER_TARGET"
    $SSH "$VPS" "ln -sfn $PREV_SERVER_TARGET $SERVER_LINK && systemctl restart $SERVICE"
  else
    info "No previous server version — stopping $SERVICE"
    $SSH "$VPS" "systemctl stop $SERVICE 2>/dev/null || true"
  fi

  fail "Deployment failed. Rolled back to previous version."
}

# ------------------------------------------------------------------
#  Display saved state
# ------------------------------------------------------------------

info "Previous static target: ${PREV_STATIC_TARGET:-<none>}"
info "Previous server target: ${PREV_SERVER_TARGET:-<none>}"

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
#  Step 2: Upload
# ------------------------------------------------------------------

info "Creating directories on VPS"
$SSH "$VPS" "mkdir -p $STATIC_DIR $SERVER_DIR"

info "Uploading static files"
$SCP -r dist/* "$VPS:$STATIC_DIR/"

info "Uploading server bundle"
$SCP dist-server/index.mjs "$VPS:$SERVER_DIR/"

# Ownership: root owns everything, cosmoskids reads only
$SSH "$VPS" "chown -R root:root $STATIC_DIR $SERVER_DIR && chmod -R u=rwX,go=rX $STATIC_DIR $SERVER_DIR"

# ------------------------------------------------------------------
#  Step 3: Switch Nova server + local health check
# ------------------------------------------------------------------

info "Switching Nova server symlink to $TAG"
$SSH "$VPS" "ln -sfn $SERVER_DIR $SERVER_LINK"

info "Restarting $SERVICE"
$SSH "$VPS" "systemctl restart $SERVICE"
sleep 2

info "Checking Nova /health (local)"
HEALTH=$($SSH "$VPS" "curl -sf http://127.0.0.1:3001/health" 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  info "Nova local health check passed"
else
  echo "Local health check failed: $HEALTH"
  rollback
fi

# ------------------------------------------------------------------
#  Step 4: Switch static site
# ------------------------------------------------------------------

info "Switching static site symlink to $RELEASE"
$SSH "$VPS" "ln -sfn $STATIC_DIR $STATIC_LINK"

# ------------------------------------------------------------------
#  Step 5: Public checks via DOMAIN
# ------------------------------------------------------------------

info "Checking https://$DOMAIN/ (expect 200)"
HTTP_ROOT=$(curl -sf -o /dev/null -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null || echo "000")
if [ "$HTTP_ROOT" = "200" ]; then
  info "Homepage: 200 OK"
else
  echo "Homepage returned $HTTP_ROOT (expected 200)"
  rollback
fi

info "Checking https://$DOMAIN/trajets/earth-to-moon (expect 200)"
HTTP_ROUTE=$(curl -sf -o /dev/null -w '%{http_code}' "https://$DOMAIN/trajets/earth-to-moon" 2>/dev/null || echo "000")
if [ "$HTTP_ROUTE" = "200" ]; then
  info "Deep route: 200 OK"
else
  echo "Deep route returned $HTTP_ROUTE (expected 200)"
  rollback
fi

info "Checking POST https://$DOMAIN/api/nova with empty body (expect 400)"
HTTP_NOVA=$(curl -s -o /dev/null -w '%{http_code}' -X POST "https://$DOMAIN/api/nova" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo "000")
if [ "$HTTP_NOVA" = "400" ]; then
  info "Nova via Caddy: 400 on empty body (route works)"
else
  echo "Nova via domain returned $HTTP_NOVA (expected 400)"
  rollback
fi

info "Checking that assets referenced in index.html are served correctly"
INDEX_HTML=$(curl -sf "https://$DOMAIN/" 2>/dev/null || true)
ASSET_PATHS=$(echo "$INDEX_HTML" | grep -oE '/assets/[^"'"'"' ]+\.(js|css)' | sort -u)
ASSET_FAIL=0
for asset in $ASSET_PATHS; do
  RESP=$(curl -sf -o /dev/null -w '%{http_code} %{content_type}' "https://$DOMAIN$asset" 2>/dev/null || echo "000 ")
  HTTP_CODE="${RESP%% *}"
  CTYPE="${RESP#* }"
  if [ "$HTTP_CODE" != "200" ]; then
    echo "  FAIL: $asset returned $HTTP_CODE (expected 200)"
    ASSET_FAIL=1
  elif echo "$asset" | grep -q '\.js$' && ! echo "$CTYPE" | grep -q 'javascript'; then
    echo "  FAIL: $asset has Content-Type $CTYPE (expected javascript)"
    ASSET_FAIL=1
  elif echo "$asset" | grep -q '\.css$' && ! echo "$CTYPE" | grep -q 'text/css'; then
    echo "  FAIL: $asset has Content-Type $CTYPE (expected text/css)"
    ASSET_FAIL=1
  else
    info "  OK: $asset ($HTTP_CODE, $CTYPE)"
  fi
done
if [ "$ASSET_FAIL" = "1" ]; then
  echo "Asset integrity check failed — assets are missing or served with wrong Content-Type"
  rollback
fi

# ------------------------------------------------------------------
#  Step 6: Version listing / optional prune
# ------------------------------------------------------------------

echo ""
info "Existing static releases:"
$SSH "$VPS" "du -sh /var/www/cosmoskids/releases/*/ 2>/dev/null || echo '  (none)'"

info "Existing server bundles:"
$SSH "$VPS" "du -sh /opt/cosmos-kids/nova/*/ 2>/dev/null | grep -v current || echo '  (none)'"

if [ -n "$PRUNE_KEEP" ]; then
  info "Pruning old releases (keeping $PRUNE_KEEP plus current and previous)..."

  # Build a list of protected paths (current + previous, deduplicated)
  PROTECT_STATIC="$STATIC_DIR"
  [ -n "$PREV_STATIC_TARGET" ] && PROTECT_STATIC="$PROTECT_STATIC $PREV_STATIC_TARGET"
  PROTECT_SERVER="$SERVER_DIR"
  [ -n "$PREV_SERVER_TARGET" ] && PROTECT_SERVER="$PROTECT_SERVER $PREV_SERVER_TARGET"

  # Prune static releases
  $SSH "$VPS" "
    cd /var/www/cosmoskids/releases
    for d in \$(ls -t | tail -n +\$(($PRUNE_KEEP + 1))); do
      full=\"/var/www/cosmoskids/releases/\$d\"
      case \" $PROTECT_STATIC \" in
        *\" \$full \"*) echo \"  keeping (protected): \$d\" ;;
        *) echo \"  removing: \$d\"; rm -rf \"\$full\" ;;
      esac
    done
  "

  # Prune server bundles
  $SSH "$VPS" "
    cd /opt/cosmos-kids/nova
    for d in \$(ls -t | grep -v current | tail -n +\$(($PRUNE_KEEP + 1))); do
      full=\"/opt/cosmos-kids/nova/\$d\"
      case \" $PROTECT_SERVER \" in
        *\" \$full \"*) echo \"  keeping (protected): \$d\" ;;
        *) echo \"  removing: \$d\"; rm -rf \"\$full\" ;;
      esac
    done
  "
else
  info "(Use --prune N to remove old versions)"
fi

# ------------------------------------------------------------------
#  Done
# ------------------------------------------------------------------

echo ""
info "Deployment of $TAG complete."
info "  Static:  $STATIC_LINK -> $STATIC_DIR"
info "  Server:  $SERVER_LINK -> $SERVER_DIR"
info "  Domain:  https://$DOMAIN/"
echo ""
info "Manual rollback:"
if [ -n "$PREV_STATIC_TARGET" ]; then
  info "  ln -sfn $PREV_STATIC_TARGET $STATIC_LINK"
else
  info "  (no previous static version)"
fi
if [ -n "$PREV_SERVER_TARGET" ]; then
  info "  ln -sfn $PREV_SERVER_TARGET $SERVER_LINK && systemctl restart $SERVICE"
else
  info "  systemctl stop $SERVICE   # (no previous server version)"
fi
