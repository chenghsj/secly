#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"

cd "$REPO_ROOT"

node --import tsx "$REPO_ROOT/src/cli/run-cli.ts" uninstall "$@"