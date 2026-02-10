#!/usr/bin/env bash
set -euo pipefail

# 镜像部署脚本（生产环境推荐，无需 Git）
#
# 用法：
#   首次部署：  bash deploy-image.sh
#   更新版本：  bash deploy-image.sh update
#   回滚版本：  bash deploy-image.sh rollback <tag>
#   查看状态：  bash deploy-image.sh status
#   查看日志：  bash deploy-image.sh logs [service]
#
# 一键远程执行（服务器上无需克隆仓库）：
#   curl -fsSL https://raw.githubusercontent.com/zhuanggenhua/BoardGame/main/scripts/deploy/deploy-image.sh | bash
#
# 环境变量（可选，用于非交互环境）：
#   JWT_SECRET=xxx WEB_ORIGINS=https://example.com bash deploy-image.sh
#
# 文档：docs/deploy.md

LOG_PREFIX="[镜像部署]"

log() {
  echo "${LOG_PREFIX} $*"
}

die() {
  echo "${LOG_PREFIX} 错误: $*" >&2
  exit 1
}

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_URL="https://raw.githubusercontent.com/zhuanggenhua/BoardGame/main/docker-compose.prod.yml"

# 检查 Docker
if ! command -v docker &>/dev/null; then
  die "Docker 未安装，请先安装 Docker"
fi

# 检查 compose 文件
ensure_compose_file() {
  if [ ! -f "$COMPOSE_FILE" ]; then
    log "下载 $COMPOSE_FILE"
    curl -fsSL "$COMPOSE_URL" -o "$COMPOSE_FILE"
  fi
}

# 生成 JWT_SECRET
generate_jwt_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    date +%s | sha256sum | awk '{print $1}'
  fi
}

# 交互式生成 .env（终端可交互时引导用户填写）
prompt_env_interactive() {
  echo ""
  echo "=========================================="
  echo "  🎲 桌游平台 - 环境配置向导"
  echo "=========================================="
  echo ""

  # --- JWT_SECRET ---
  local jwt_secret
  echo -n "${LOG_PREFIX} JWT_SECRET（回车自动生成安全密钥）："
  read -r jwt_secret || jwt_secret=""
  if [ -z "$jwt_secret" ]; then
    jwt_secret="$(generate_jwt_secret)"
    log "✅ 已自动生成 JWT_SECRET"
  fi

  # --- WEB_ORIGINS ---
  local web_origins=""
  echo ""
  echo "${LOG_PREFIX} WEB_ORIGINS 用于跨域白名单，填写你的前端访问域名。"
  echo "${LOG_PREFIX} 示例: https://easyboardgame.top,https://boardgame-e6c.pages.dev"
  echo "${LOG_PREFIX} 多个域名用英文逗号分隔，留空则自动检测公网 IP。"
  echo -n "${LOG_PREFIX} WEB_ORIGINS："
  read -r web_origins || web_origins=""
  if [ -z "$web_origins" ]; then
    local public_ip=""
    if command -v curl &>/dev/null; then
      public_ip=$(curl -fsSL --connect-timeout 5 ifconfig.me 2>/dev/null || true)
    fi
    if [ -n "$public_ip" ]; then
      web_origins="http://${public_ip}"
      log "✅ 已自动检测公网 IP: ${public_ip}"
    else
      web_origins="http://localhost"
      log "⚠️  无法检测公网 IP，默认使用 http://localhost，请稍后修改 .env"
    fi
  fi

  # --- SMTP（可选） ---
  local smtp_host="" smtp_port="" smtp_user="" smtp_pass=""
  echo ""
  echo "${LOG_PREFIX} SMTP 邮件服务用于邮箱验证码功能（可选）。"
  echo -n "${LOG_PREFIX} 是否配置 SMTP？[y/N] "
  local smtp_choice
  read -r smtp_choice || smtp_choice="n"
  if [[ "$smtp_choice" =~ ^[yY] ]]; then
    echo -n "${LOG_PREFIX}   SMTP_HOST（如 smtp.qq.com）："
    read -r smtp_host || smtp_host=""
    echo -n "${LOG_PREFIX}   SMTP_PORT（如 465）："
    read -r smtp_port || smtp_port=""
    echo -n "${LOG_PREFIX}   SMTP_USER（发件邮箱）："
    read -r smtp_user || smtp_user=""
    echo -n "${LOG_PREFIX}   SMTP_PASS（授权码，非密码）："
    read -r smtp_pass || smtp_pass=""
  else
    log "跳过 SMTP 配置（邮箱验证码功能不可用）"
  fi

  # --- SENTRY_DSN（可选） ---
  local sentry_dsn=""
  echo ""
  echo -n "${LOG_PREFIX} Sentry DSN（错误监控，可选，回车跳过）："
  read -r sentry_dsn || sentry_dsn=""

  # --- 写入 .env ---
  cat > .env << EOF
# ===== 密钥（必填） =====
JWT_SECRET=${jwt_secret}

# ===== 跨域白名单（必填） =====
WEB_ORIGINS=${web_origins}
EOF

  if [ -n "$smtp_host" ]; then
    cat >> .env << EOF

# ===== 邮件服务（可选） =====
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
EOF
  fi

  if [ -n "$sentry_dsn" ]; then
    cat >> .env << EOF

# ===== 错误监控（可选） =====
SENTRY_DSN=${sentry_dsn}
EOF
  fi

  cat >> .env << EOF

# ===== 以下由 docker-compose.prod.yml 自动覆盖，无需修改 =====
# MONGO_URI → mongodb://mongodb:27017/boardgame
# REDIS_HOST → redis
# REDIS_PORT → 6379
# GAME_SERVER_PORT → 18000
# API_SERVER_PORT → 80
# GAME_SERVER_PROXY_TARGET → http://game-server:18000
EOF

  echo ""
  log "✅ .env 已生成"
  log "如需修改，直接编辑 .env 文件即可"
}

# 检查 .env 文件
ensure_env_file() {
  if [ -f ".env" ]; then
    log "检测到 .env，跳过生成"
    return
  fi

  # 优先使用 .env.server 脚本生成
  if [ -f ".env.server" ]; then
    log "检测到 .env.server，执行生成 .env"
    bash .env.server "$(pwd)"
    return
  fi

  # 终端可交互时走引导流程
  if [ -t 0 ]; then
    prompt_env_interactive
    return
  fi

  # 非交互环境：优先使用环境变量，否则自动生成
  log "非交互终端，自动生成最小 .env"
  local jwt_secret="${JWT_SECRET:-}"
  if [ -z "$jwt_secret" ]; then
    jwt_secret="$(generate_jwt_secret)"
  fi
  local web_origins="${WEB_ORIGINS:-}"
  if [ -z "$web_origins" ]; then
    local public_ip=""
    if command -v curl &>/dev/null; then
      public_ip=$(curl -fsSL --connect-timeout 5 ifconfig.me 2>/dev/null || true)
    fi
    if [ -n "$public_ip" ]; then
      web_origins="http://${public_ip}"
    else
      web_origins="http://localhost"
    fi
  fi

  cat > .env << EOF
# 自动生成 — 请检查并按需修改
JWT_SECRET=${jwt_secret}
WEB_ORIGINS=${web_origins}

# 以下由 docker-compose.prod.yml 自动覆盖，无需修改
# MONGO_URI / REDIS_HOST / REDIS_PORT / GAME_SERVER_PORT / API_SERVER_PORT
EOF
  log "⚠️  .env 已自动生成，建议检查 WEB_ORIGINS 是否正确"
  log "⚠️  如需邮件功能，请手动添加 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS"
}

# 部署/更新
deploy() {
  ensure_compose_file
  ensure_env_file

  log "拉取最新镜像"
  docker compose -f "$COMPOSE_FILE" pull

  log "启动服务"
  docker compose -f "$COMPOSE_FILE" up -d

  log "部署完成"
  docker compose -f "$COMPOSE_FILE" ps
}

# 回滚到指定版本
rollback() {
  local tag="${1:-}"
  if [ -z "$tag" ]; then
    die "请指定要回滚的版本 tag，例如：bash deploy-image.sh rollback v1.2.3"
  fi

  ensure_compose_file

  log "回滚到版本 ${tag}"

  # 修改 compose 文件中的镜像 tag
  sed -i.bak \
    -e "s|ghcr.io/zhuanggenhua/boardgame-game:.*|ghcr.io/zhuanggenhua/boardgame-game:${tag}|g" \
    -e "s|ghcr.io/zhuanggenhua/boardgame-web:.*|ghcr.io/zhuanggenhua/boardgame-web:${tag}|g" \
    "$COMPOSE_FILE"

  log "拉取指定版本镜像"
  docker compose -f "$COMPOSE_FILE" pull

  log "重启服务"
  docker compose -f "$COMPOSE_FILE" up -d

  log "回滚完成"
  docker compose -f "$COMPOSE_FILE" ps
}

# 查看状态
status() {
  ensure_compose_file
  docker compose -f "$COMPOSE_FILE" ps
}

# 查看日志
logs() {
  ensure_compose_file
  docker compose -f "$COMPOSE_FILE" logs -f "${1:-}"
}

# 主入口
case "${1:-deploy}" in
  deploy|update)
    deploy
    ;;
  rollback)
    rollback "${2:-}"
    ;;
  status)
    status
    ;;
  logs)
    logs "${2:-}"
    ;;
  *)
    echo "用法: $0 [deploy|update|rollback <tag>|status|logs [service]]"
    exit 1
    ;;
esac
