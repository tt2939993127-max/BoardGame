#!/usr/bin/env bash
set -euo pipefail

echo "[迁移到镜像部署] 该脚本已移动到 scripts/deploy/deploy-migrate-image.sh"
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/deploy/deploy-migrate-image.sh" "$@"
