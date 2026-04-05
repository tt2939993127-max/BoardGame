#!/usr/bin/env bash
set -euo pipefail

# 模拟生产环境依赖验证
# 用途：在本地验证生产 bundle 在仅安装生产依赖时不会静态引用缺失包
# 原理：先构建生产 bundle，再在临时目录安装 --omit=dev 依赖，检查 bundle 的静态 bare import 是否都能解析
#
# 用法：bash scripts/deploy/verify-prod-deps.sh

LOG_PREFIX="[生产依赖验证]"
TEMP_DIR=".tmp/prod-deps-check"

log() { echo "${LOG_PREFIX} $*"; }
die() { echo "${LOG_PREFIX} 错误: $*" >&2; exit 1; }

NODE_BIN="$(command -v node || command -v node.exe || true)"
if [ -z "$NODE_BIN" ]; then
  die "未找到 node / node.exe"
fi

cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log "清理临时目录..."
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

log "创建临时目录 ${TEMP_DIR}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

log "复制依赖清单"
cp package.json package-lock.json "$TEMP_DIR/"

log "安装生产依赖（--omit=dev）..."
cd "$TEMP_DIR"
npm ci --omit=dev --ignore-scripts 2>&1 | tail -3
cd - > /dev/null

log "构建生产 bundle..."
npm run build:api:bundle >/dev/null
npm run build:game:bundle >/dev/null

log "验证生产 bundle 的静态 bare import 是否都能解析..."

"$NODE_BIN" --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const tempDir = path.resolve('.tmp/prod-deps-check');
const bundles = [
  path.resolve('temp/prod-bundles/api/main.mjs'),
  path.resolve('temp/prod-bundles/game/server.mjs'),
];

const staticImportRegex = /(?:^|\n)\s*import\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const missing = new Map();
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => name.replace(/^node:/, '')),
]);

function packageDirFor(specifier) {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return path.join(tempDir, 'node_modules', scope, name ?? '');
  }
  const [name] = specifier.split('/');
  return path.join(tempDir, 'node_modules', name);
}

for (const bundlePath of bundles) {
  const source = fs.readFileSync(bundlePath, 'utf8');
  const imports = new Set();
  for (const match of source.matchAll(staticImportRegex)) {
    const specifier = match[1];
    if (
      specifier.startsWith('.') ||
      specifier.startsWith('/') ||
      builtins.has(specifier) ||
      specifier.startsWith('node:')
    ) {
      continue;
    }
    imports.add(specifier);
  }

  for (const specifier of imports) {
    const pkgDir = packageDirFor(specifier);
    if (!fs.existsSync(pkgDir)) {
      const bundleLabel = path.relative(process.cwd(), bundlePath);
      missing.set(`${bundleLabel} -> ${specifier}`, true);
    }
  }
}

if (missing.size > 0) {
  console.error('[生产依赖验证] ❌ 发现生产 bundle 静态依赖缺失：');
  for (const key of missing.keys()) {
    console.error(`   - ${key}`);
  }
  process.exit(1);
}

console.log('[生产依赖验证] ✅ 生产 bundle 的静态 bare import 均可由生产依赖解析');
NODE
