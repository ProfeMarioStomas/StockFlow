#!/usr/bin/env bash
# deploy-frontend.sh — Build and deploy the frontend to Cloudflare Pages (production).
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# Prerequisites:
#   - wrangler authenticated (wrangler login)
#   - Run from the repo root
#
# Architecture note:
#   The API base URL is NOT needed at build time. All /api/* requests are
#   proxied server-to-server by the Pages Function in functions/api/[[path]].js,
#   keeping cookies same-site and avoiding third-party cookie blocking.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$REPO_ROOT/apps/frontend"
DIST="$FRONTEND/dist"

PAGES_PROJECT="stockflow"

echo "==> Building frontend..."
pnpm -F frontend build

echo "==> Deploying to Cloudflare Pages (production)..."
# Run from apps/frontend so wrangler picks up the functions/ directory.
# Use wrangler from apps/backend (it lives there as a dev dependency).
cd "$FRONTEND"
"$REPO_ROOT/apps/backend/node_modules/.bin/wrangler" pages deploy "$DIST" \
  --project-name "$PAGES_PROJECT" \
  --branch=main \
  --commit-dirty=true

echo ""
echo "Done. Production URL: https://${PAGES_PROJECT}-2gy.pages.dev"
