#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

printf '\n🚀 Installing production API system...\n'
node scripts/install-api.js "$@"
printf '\n✅ Installer complete. Start the API with: npm run api:start\n'
