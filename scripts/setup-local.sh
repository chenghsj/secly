#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"

cd "$REPO_ROOT"

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
  npm install
fi

node --import tsx "$REPO_ROOT/src/cli/run-cli.ts" install "$@"