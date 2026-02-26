#!/usr/bin/env bash
# VPS deploy arşivi (macOS/Linux). node_modules ve dist hariç — sunucuda npm ci && npm run build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/dist-deploy"
TS=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="super-reasoning_${TS}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

mkdir -p "$OUT_DIR"
cd "$ROOT"

zip -r "$ZIP_PATH" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "dist-ssr/*" \
  -x "dist-deploy/*" \
  -x "dist-prod/*" \
  -x "dist2/*" \
  -x ".git/*" \
  -x ".env" \
  -x ".env.*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "nul" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.suo"

echo "Oluşturuldu: $ZIP_PATH"
echo "VPS: ZIP'i yükleyin, unzip, sonra DOMAIN=... bash deploy/setup-vps-no-git.sh"
