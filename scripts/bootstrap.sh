#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null || { echo "Node.js is required."; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is required. Enable Corepack and install the packageManager version from package.json."; exit 1; }
command -v docker >/dev/null || { echo "Docker is required for local Supabase."; exit 1; }
pnpm install --frozen-lockfile
cp -n .env.example .env.local || true
pnpm repo:check
printf "\nNext: pnpm db:start && pnpm dev\n"
