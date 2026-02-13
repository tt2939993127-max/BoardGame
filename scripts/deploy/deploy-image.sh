#!/usr/bin/env bash
set -euo pipefail

# 镜像部署脚本（一键部署，生产环境推荐，无需 Git）
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
#   JWT_SECRET=xxx bash deploy-image.sh
#
# 架构：Cloudflare CDN (HTTPS) → 服务器 80 端口 → Docker web 容器 (NestJS monolith) → 内部 game-server
# 同域部署，无 CORS 问题。Cloudflare 自动缓存静态资源，服务器只承担 API 和 WebSocket 带宽。
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

# sudo 检测
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo &>/dev/null; then
    SUDO="sudo"
  else
    die "需要 root 或 sudo 权限"
  fi
fi

# ============================================================
# Docker 镜像加速
# ============================================================

configure_docker_mirror() {
  if [ "${SKIP_MIRROR:-0}" = "1" ]; then
    log "已跳过镜像源配置（SKIP_MIRROR=1）"
    return
  fi

  local daemon_file="/etc/docker/daemon.json"

  if [ -f "$daemon_file" ]; then
    if grep -q "registry-mirrors" "$daemon_file" 2>/dev/null; then
      log "检测到已有镜像配置，跳过"
      return
    fi
  fi

  log "⚠️  未检测到 Docker 镜像加速配置"

  # 非交互环境自动配置
  if [ ! -t 0 ]; then
    log "非交互终端，自动配置镜像加速"
    apply_docker_mirror
    return
  fi

  echo -n "${LOG_PREFIX} 是否配置镜像加速？[Y/n] "
  local choice
  read -r choice || choice="y"
  if [[ ! "$choice" =~ ^[nN] ]]; then
    apply_docker_mirror
  else
    log "跳过镜像配置"
  fi
}

apply_docker_mirror() {
  local daemon_file="/etc/docker/daemon.json"
  local mirrors_json='["https://mirror.aliyuncs.com","https://docker.mirrors.ustc.edu.cn","https://docker.mirrors.sjtug.sjtu.edu.cn","https://docker.m.daocloud.io","https://dockerproxy.com"]'

  log "配置 Docker 镜像源"
  $SUDO mkdir -p /etc/docker

  if [ -f "$daemon_file" ]; then
    $SUDO cp "$daemon_file" "${daemon_file}.bak.$(date +%s)"
  fi

  echo "{\"registry-mirrors\": ${mirrors_json}}" | $SUDO tee "$daemon_file" > /dev/null
  $SUDO systemctl daemon-reload
  $SUDO systemctl restart docker
  log "✅ 镜像加速配置完成"
}

# ============================================================
# Compose 文件
# ============================================================

ensure_compose_file() {
  if [ ! -f "$COMPOSE_FILE" ]; then
    log "下载 $COMPOSE_FILE"
    curl -fsSL "$COMPOSE_URL" -o "$COMPOSE_FILE"
  fi
}

generate_jwt_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    date +%s | sha256sum | awk '{print $1}'
  fi
}

# ============================================================
# .env 配置向导
# ============================================================

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
# MONGO_URI / REDIS_HOST / REDIS_PORT / GAME_SERVER_PORT / API_SERVER_PORT
EOF

  echo ""
  log "✅ .env 已生成"
  log "如需修改，直接编辑 .env 文件即可"
}

ensure_env_file() {
  if [ -f ".env" ]; then
    log "检测到 .env，跳过生成"
    return
  fi

  if [ -f ".env.server" ]; then
    log "检测到 .env.server，执行生成 .env"
    bash .env.server "$(pwd)"
    return
  fi

  if [ -t 0 ]; then
    prompt_env_interactive
    return
  fi

  # 非交互环境
  log "非交互终端，自动生成最小 .env"
  local jwt_secret="${JWT_SECRET:-$(generate_jwt_secret)}"

  cat > .env << EOF
# 自动生成 — 请检查并按需修改
JWT_SECRET=${jwt_secret}
EOF

  log "⚠️  .env 已自动生成，建议检查配置"
}

# ============================================================
# 端口冲突检测与清理
# ============================================================

ensure_port_available() {
  local port=80

  # 检查是否有进程占用 80 端口
  if command -v ss &>/dev/null; then
    local pid
    pid=$(ss -tlnp "sport = :${port}" 2>/dev/null | grep -oP 'pid=\K\d+' | head -1 || true)
    if [ -n "$pid" ]; then
      local proc_name
      proc_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
      log "⚠️  端口 ${port} 被占用（PID=${pid}, ${proc_name}）"

      # 如果是 Nginx，停止并禁用它
      if [[ "$proc_name" == "nginx" ]]; then
        log "检测到宿主机 Nginx 占用 80 端口，正在停止..."
        $SUDO systemctl stop nginx 2>/dev/null || true
        $SUDO systemctl disable nginx 2>/dev/null || true
        log "✅ 已停止并禁用宿主机 Nginx（不再需要，web 容器直接监听 80）"
      else
        die "端口 ${port} 被 ${proc_name}(PID=${pid}) 占用，请先释放"
      fi
    fi
  fi
}

# ============================================================
# 部署操作
# ============================================================

deploy() {
  ensure_compose_file
  ensure_env_file
  configure_docker_mirror
  ensure_port_available

  log "拉取最新镜像"
  docker compose -f "$COMPOSE_FILE" pull

  log "停止旧服务"
  docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

  log "启动服务"
  docker compose -f "$COMPOSE_FILE" up -d

  echo ""
  log "=========================================="
  log "  ✅ 部署完成"
  log "=========================================="
  docker compose -f "$COMPOSE_FILE" ps
  echo ""
  log "架构: Cloudflare (HTTPS + CDN) → 服务器 :80 → web 容器 (NestJS) → game-server (内部)"
  log ""
  log "部署后配置 Cloudflare："
  log "  1. DNS: 域名 A 记录 → 服务器 IP（开启代理/橙色云朵）"
  log "  2. SSL/TLS: 模式选 Flexible（源站 HTTP）"
  log "  3. 不需要 api 子域名，前后端同域，无 CORS"
}

rollback() {
  local tag="${1:-}"
  if [ -z "$tag" ]; then
    die "请指定要回滚的版本 tag，例如：bash deploy-image.sh rollback v1.2.3"
  fi

  ensure_compose_file

  log "回滚到版本 ${tag}"

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

status() {
  ensure_compose_file
  docker compose -f "$COMPOSE_FILE" ps
}

logs() {
  ensure_compose_file
  docker compose -f "$COMPOSE_FILE" logs -f "${1:-}"
}

# ============================================================
# 主入口
# ============================================================

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
