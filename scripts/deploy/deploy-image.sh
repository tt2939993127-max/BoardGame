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
#   JWT_SECRET=xxx WEB_ORIGINS=https://example.com bash deploy-image.sh
#
# 架构：Nginx (80) → Docker web 容器 (3000) → 内部 game-server (18000)
# 脚本自动安装/配置 Nginx，管理 /etc/nginx/conf.d/boardgame.conf
#
# 文档：docs/deploy.md

LOG_PREFIX="[镜像部署]"
NGINX_MANAGED_CONF="boardgame.conf"
WEB_CONTAINER_PORT=3000

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
  local web_origins="${WEB_ORIGINS:-}"
  if [ -z "$web_origins" ]; then
    local public_ip=""
    if command -v curl &>/dev/null; then
      public_ip=$(curl -fsSL --connect-timeout 5 ifconfig.me 2>/dev/null || true)
    fi
    web_origins="${public_ip:+http://${public_ip}}"
    web_origins="${web_origins:-http://localhost}"
  fi

  cat > .env << EOF
# 自动生成 — 请检查并按需修改
JWT_SECRET=${jwt_secret}
WEB_ORIGINS=${web_origins}
EOF

  log "⚠️  .env 已自动生成，建议检查 WEB_ORIGINS 是否正确"
}

# ============================================================
# Nginx 自动管理
# ============================================================

# 期望的 Nginx 配置内容
expected_nginx_conf() {
  cat << 'NGINX_EOF'
# BoardGame 反向代理（由 deploy-image.sh 自动管理，勿手动编辑）
# 如需自定义，请创建独立的 .conf 文件，本文件会被脚本覆盖。
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
NGINX_EOF
}

# 检测包管理器
detect_pkg_manager() {
  if command -v apt-get &>/dev/null; then echo "apt"
  elif command -v dnf &>/dev/null; then echo "dnf"
  elif command -v yum &>/dev/null; then echo "yum"
  else echo ""
  fi
}

# 安装 Nginx
install_nginx() {
  if command -v nginx &>/dev/null; then
    return 0
  fi

  local pkg_mgr
  pkg_mgr=$(detect_pkg_manager)

  case "$pkg_mgr" in
    apt)
      log "安装 Nginx（apt）"
      $SUDO apt-get update -y && $SUDO apt-get install -y nginx
      ;;
    dnf)
      log "安装 Nginx（dnf）"
      $SUDO dnf install -y nginx
      ;;
    yum)
      log "安装 Nginx（yum）"
      if [ ! -f /etc/yum.repos.d/nginx.repo ]; then
        $SUDO tee /etc/yum.repos.d/nginx.repo << 'REPO_EOF' > /dev/null
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/8/$basearch/
gpgcheck=0
enabled=1
REPO_EOF
      fi
      $SUDO yum install -y nginx --disableexcludes=all
      ;;
    *)
      die "无法自动安装 Nginx（未识别包管理器），请手动安装后重试"
      ;;
  esac

  log "✅ Nginx 安装完成"
}

# 配置 Nginx（幂等）
configure_nginx() {
  local conf_dir="/etc/nginx/conf.d"
  local managed_conf="${conf_dir}/${NGINX_MANAGED_CONF}"
  local expected
  expected=$(expected_nginx_conf)

  # 1. 检查我们管理的配置是否已是最新
  if [ -f "$managed_conf" ]; then
    local current
    current=$(cat "$managed_conf")
    if [ "$current" = "$expected" ]; then
      log "Nginx 配置已是最新，跳过"
      return 0
    fi
    # 配置过时，备份后覆盖
    log "更新 Nginx 配置（检测到变更）"
    $SUDO cp "$managed_conf" "${managed_conf}.bak.$(date +%s)"
  else
    log "创建 Nginx 配置: ${managed_conf}"
  fi

  # 2. 禁用冲突的默认配置
  local default_conf="${conf_dir}/default.conf"
  if [ -f "$default_conf" ]; then
    log "禁用默认 Nginx 配置（避免端口冲突）"
    $SUDO mv "$default_conf" "${default_conf}.disabled"
  fi

  # 3. 检查其他配置是否有冲突（监听 80 端口的 default_server）
  for conf_file in "$conf_dir"/*.conf; do
    [ -f "$conf_file" ] || continue
    [ "$(basename "$conf_file")" = "$NGINX_MANAGED_CONF" ] && continue
    if grep -q 'default_server' "$conf_file" 2>/dev/null; then
      log "⚠️  检测到冲突配置（含 default_server）: $conf_file"
      log "⚠️  建议检查或删除: sudo rm $conf_file"
    fi
  done

  # 4. 写入配置
  echo "$expected" | $SUDO tee "$managed_conf" > /dev/null

  # 5. 测试并重载
  if ! $SUDO nginx -t 2>/dev/null; then
    die "Nginx 配置测试失败，请检查 ${managed_conf}"
  fi

  $SUDO systemctl enable nginx 2>/dev/null || true
  $SUDO systemctl start nginx 2>/dev/null || true
  $SUDO systemctl reload nginx

  log "✅ Nginx 已就绪（80 → 127.0.0.1:${WEB_CONTAINER_PORT}）"
}

# 确保 compose 端口映射正确
ensure_compose_port() {
  # 统一使用 3000:80，Nginx 代理到 3000
  if grep -q '"80:80"' "$COMPOSE_FILE" 2>/dev/null; then
    sed -i.bak "s/\"80:80\"/\"${WEB_CONTAINER_PORT}:80\"/g" "$COMPOSE_FILE"
    log "web 容器端口映射: ${WEB_CONTAINER_PORT}:80"
  fi
}

# Nginx 完整配置流程
setup_nginx() {
  install_nginx
  configure_nginx
  ensure_compose_port
}

# ============================================================
# 部署操作
# ============================================================

deploy() {
  ensure_compose_file
  ensure_env_file
  configure_docker_mirror
  setup_nginx

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
  log "入口: http://<服务器IP>"
  log "架构: Nginx (80) → web 容器 (${WEB_CONTAINER_PORT}) → game-server (内部)"
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
