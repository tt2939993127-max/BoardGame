#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[迁移到镜像部署]"

log() {
  echo "${LOG_PREFIX} $*"
}

die() {
  echo "${LOG_PREFIX} 错误: $*" >&2
  exit 1
}

# 部署目录（默认脚本所在仓库根目录）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$ROOT_DIR}"

COMPOSE_OLD="${DEPLOY_DIR}/docker-compose.yml"
COMPOSE_NEW="${DEPLOY_DIR}/docker-compose.prod.yml"
COMPOSE_URL="https://raw.githubusercontent.com/zhuanggenhua/BoardGame/main/docker-compose.prod.yml"

# 检查 Docker
command -v docker &>/dev/null || die "Docker 未安装，请先安装 Docker"

login_ghcr() {
  if [ -n "${GHCR_TOKEN:-}" ]; then
    if [ -z "${GHCR_USERNAME:-}" ]; then
      die "已提供 GHCR_TOKEN，但缺少 GHCR_USERNAME"
    fi
    log "使用 GHCR_TOKEN 登录 ghcr.io"
    echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin
    return
  fi

  log "使用交互式登录 ghcr.io"
  docker login ghcr.io
}

generate_jwt_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    date +%s | sha256sum | awk '{print $1}'
  fi
}

prompt_env() {
  if [ ! -t 0 ]; then
    die "未找到 .env 或 .env.server，且当前终端不可交互，请先准备 .env 或 .env.server"
  fi

  local jwt_secret
  local web_origins
  local smtp_choice
  local smtp_host
  local smtp_port
  local smtp_user
  local smtp_pass

  echo -n "${LOG_PREFIX} 请输入 JWT_SECRET（回车自动生成）："
  read -r jwt_secret || jwt_secret=""
  if [ -z "$jwt_secret" ]; then
    jwt_secret="$(generate_jwt_secret)"
    log "已自动生成 JWT_SECRET"
  fi

  while true; do
    echo -n "${LOG_PREFIX} 请输入 WEB_ORIGINS（必填，多个用逗号）："
    read -r web_origins || web_origins=""
    if [ -n "$web_origins" ]; then
      break
    fi
  done

  echo -n "${LOG_PREFIX} 是否配置 SMTP？[0=跳过,1=配置] "
  read -r smtp_choice || smtp_choice="0"

  if [ "$smtp_choice" = "1" ]; then
    echo -n "${LOG_PREFIX} SMTP_HOST："
    read -r smtp_host || smtp_host=""
    echo -n "${LOG_PREFIX} SMTP_PORT："
    read -r smtp_port || smtp_port=""
    echo -n "${LOG_PREFIX} SMTP_USER："
    read -r smtp_user || smtp_user=""
    echo -n "${LOG_PREFIX} SMTP_PASS："
    read -r smtp_pass || smtp_pass=""
  fi

  cat > "${DEPLOY_DIR}/.env" << EOF
JWT_SECRET=${jwt_secret}
WEB_ORIGINS=${web_origins}
EOF

  if [ "$smtp_choice" = "1" ]; then
    cat >> "${DEPLOY_DIR}/.env" << EOF
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
EOF
  fi

  log ".env 已生成到 ${DEPLOY_DIR}/.env"
}

# 可选：登录 GHCR（私有镜像时需要）
LOGIN_CHOICE="${GHCR_LOGIN:-}"
if [ -z "$LOGIN_CHOICE" ]; then
  if [ -t 0 ]; then
    echo -n "${LOG_PREFIX} 是否登录 ghcr.io？[0=跳过,1=登录] "
    read -r LOGIN_CHOICE || LOGIN_CHOICE="0"
  else
    LOGIN_CHOICE="0"
  fi
fi

case "$LOGIN_CHOICE" in
  1|y|Y|yes|YES)
    login_ghcr
    ;;
  0|n|N|no|NO|"")
    log "跳过 ghcr.io 登录"
    ;;
  *)
    log "未知输入 '$LOGIN_CHOICE'，默认跳过 ghcr.io 登录"
    ;;
esac

# 停止旧 Git 部署（存在且运行时才停止）
if [ -f "$COMPOSE_OLD" ]; then
  if docker compose -f "$COMPOSE_OLD" ps -q 2>/dev/null | grep -q .; then
    log "检测到旧部署容器，正在停止"
    docker compose -f "$COMPOSE_OLD" down
  else
    log "未检测到运行中的旧容器，跳过停止"
  fi
else
  log "未找到 $COMPOSE_OLD，跳过停止旧部署"
fi

# 下载/更新生产 compose
if [ ! -f "$COMPOSE_NEW" ] || [ "${FORCE_COMPOSE:-0}" = "1" ]; then
  log "下载 $COMPOSE_NEW"
  command -v curl &>/dev/null || die "curl 未安装，请先安装"
  curl -fsSL "$COMPOSE_URL" -o "$COMPOSE_NEW"
else
  log "检测到 $COMPOSE_NEW，跳过下载（如需强制更新设置 FORCE_COMPOSE=1）"
fi

# 准备 .env
if [ ! -f "${DEPLOY_DIR}/.env" ]; then
  if [ -f "${DEPLOY_DIR}/.env.server" ]; then
    log "检测到 .env.server，生成 .env"
    bash "${DEPLOY_DIR}/.env.server" "$DEPLOY_DIR"
  else
    log "未找到 .env 或 .env.server，进入交互式生成"
    prompt_env
  fi
else
  log "检测到 .env，跳过生成"
fi

# 拉取镜像并启动
log "拉取镜像"
docker compose -f "$COMPOSE_NEW" pull

log "启动服务"
docker compose -f "$COMPOSE_NEW" up -d

log "迁移完成"
docker compose -f "$COMPOSE_NEW" ps

# 可选校验
if [ "${SKIP_VERIFY:-0}" != "1" ]; then
  if command -v curl &>/dev/null; then
    HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/}"
    log "HTTP 校验: ${HEALTH_URL}"
    curl -I "$HEALTH_URL" || log "HTTP 校验失败，请检查服务日志"
  else
    log "未安装 curl，跳过 HTTP 校验"
  fi
else
  log "SKIP_VERIFY=1，跳过校验"
fi
