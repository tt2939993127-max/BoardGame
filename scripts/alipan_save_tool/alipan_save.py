#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阿里云盘分享转存工具（云端转存到“我的云盘”）

用法：把同目录的 `alipan_secrets.json` 填好，然后运行：

  python alipan_save.py

说明：
- 本工具只做“云端转存”（复制到你的 drive），不会下载到本地硬盘。
- 日志不会输出 token（敏感信息）。
"""

from __future__ import annotations

import json
import logging
import os
import random
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from requests import Response
from requests.exceptions import RequestException


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("alipan_save")


def _ensure_file_logger(log_path: str) -> None:
    """把日志写入同目录文件（同时保留控制台输出）。

    目标：即使双击 run.bat 窗口闪退，也能在同目录看到完整日志。
    """

    root = logging.getLogger()
    abs_log_path = os.path.abspath(log_path)

    for h in root.handlers:
        if isinstance(h, logging.FileHandler):
            try:
                if os.path.abspath(getattr(h, "baseFilename", "")) == abs_log_path:
                    return
            except Exception:
                # 忽略异常，继续尝试添加
                pass

    fh = logging.FileHandler(abs_log_path, encoding="utf-8")
    fh.setLevel(logging.INFO)
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    root.addHandler(fh)


@dataclass(frozen=True)
class Secrets:
    access_token: str
    drive_id: str
    share_link: str
    share_pwd: str = ""
    # 可选：强制指定 API 域名（api.aliyundrive.com / api.alipan.com）。为空则根据 share_link 自动推断。
    api_base_url: str = ""
    # 转存目标父目录：默认 root（我的云盘根目录）。如果你想存到某个已有文件夹，填那个文件夹的 file_id。
    target_parent_file_id: str = "root"
    # 为空则使用分享名；非空则用该名字创建文件夹。
    target_folder_name: str = ""
    # v4/batch 单次请求里包含的 /file/copy 数量。
    batch_size: int = 500


class AliPanApi:
    def __init__(self, access_token: str, drive_id: str, *, base_url: str):
        token = access_token.strip()
        if token.lower().startswith("bearer "):
            # 避免用户把 "Bearer xxx" 整段贴进来，导致请求头变成 "Bearer Bearer xxx"。
            token = token.split(" ", 1)[1].strip()

        self.base_url = base_url.rstrip("/")
        self.access_token = token
        self.drive_id = str(drive_id)
        self.session = requests.Session()

        self.common_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "X-Canary": "client=web,app=adrive,version=v6.4.2",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        headers: Optional[Dict[str, Optional[str]]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        max_retries: int = 5,
        timeout: int = 30,
    ) -> Dict[str, Any]:
        url = path if path.startswith("http") else f"{self.base_url}{path}"
        req_headers = dict(self.common_headers)
        if headers:
            for k, v in headers.items():
                # 允许通过传入 None 来“删除”默认头（比如匿名接口不需要 Authorization）。
                if v is None:
                    req_headers.pop(k, None)
                else:
                    req_headers[k] = v

        last_err: Optional[BaseException] = None
        for attempt in range(1, max_retries + 1):
            try:
                resp: Response = self.session.request(
                    method,
                    url,
                    headers=req_headers,
                    json=json_body,
                    timeout=timeout,
                )

                # 429/5xx 走统一重试
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise RequestException(f"HTTP {resp.status_code}", response=resp)

                resp.raise_for_status()
                return resp.json()

            except RequestException as e:
                last_err = e
                err_resp: Optional[Response] = getattr(e, "response", None)
                status = getattr(err_resp, "status_code", None)

                # 401/403 基本是 token 过期/权限问题，没必要反复重试。
                if status in (401, 403):
                    body = ""
                    try:
                        body = err_resp.text if err_resp is not None else ""
                    except Exception:
                        body = ""

                    # 403 的常见原因之一：网盘被风控锁定，需要用户先在官方端解锁。
                    if status == 403:
                        try:
                            payload = json.loads(body) if body else {}
                        except Exception:
                            payload = {}
                        if payload.get("code") == "ForbiddenDriveLocked":
                            raise RuntimeError(
                                "网盘被锁定（ForbiddenDriveLocked）。需要你先在官方网页/客户端解锁网盘后才能调用写入类 API（创建文件夹/转存）。\n"
                                "处理方法：\n"
                                "1) 打开 https://www.alipan.com/ 并登录\n"
                                "2) 通常首页/文件列表会提示“网盘已锁定/需解锁”，按提示完成解锁\n"
                                "3) 解锁完成后再运行本工具\n"
                                f"响应: {body[:500]}"
                            )

                    raise RuntimeError(
                        f"鉴权失败(HTTP {status})。通常是 access_token 过期/退出登录导致。\n"
                        "请按以下步骤更新配置里的 access_token：\n"
                        "1) 打开 https://www.alipan.com/ 并登录\n"
                        "2) F12 -> Network，找任意 api.alipan.com 或 api.aliyundrive.com 请求\n"
                        "3) 复制 Request Headers 里的 Authorization: Bearer <token>（只要 <token>，不要 Bearer 前缀）\n"
                        "4) 粘贴到 alipan_secrets.json 的 access_token 字段\n"
                        f"响应: {body[:500]}"
                    ) from e

                # 退避时间（带抖动），尽量避免一直撞 429。
                base = 1.0 if status == 429 else 0.8
                backoff = base * (2 ** (attempt - 1))
                backoff = min(backoff, 30.0)
                backoff = backoff * (0.7 + random.random() * 0.6)

                if attempt == max_retries:
                    body = ""
                    try:
                        body = err_resp.text if err_resp is not None else ""
                    except Exception:
                        body = ""
                    raise RuntimeError(
                        f"请求失败：{method} {url} (HTTP {status})，响应: {body[:500]}"
                    ) from e

                logger.warning(
                    "请求失败(%s %s, status=%s)，%.1fs 后重试（%d/%d）",
                    method,
                    path,
                    status,
                    backoff,
                    attempt,
                    max_retries,
                )
                time.sleep(backoff)

        raise RuntimeError("请求失败（未知原因）") from last_err

    def get_share_token(self, share_id: str, share_pwd: str) -> str:
        resp = self._request_json(
            "POST",
            "/v2/share_link/get_share_token",
            headers={"Authorization": None},
            json_body={"share_id": share_id, "share_pwd": share_pwd or ""},
            max_retries=3,
        )
        token = resp.get("share_token")
        if not token:
            raise RuntimeError(f"未获取到 share_token，响应: {str(resp)[:500]}")
        return str(token)

    def get_share_info(self, share_id: str, share_token: str) -> Dict[str, Any]:
        return self._request_json(
            "POST",
            "/adrive/v3/share_link/get_share_by_anonymous",
            headers={"Authorization": None, "X-Share-Token": share_token},
            json_body={"share_id": share_id},
            max_retries=3,
        )

    def list_files_by_share(
        self,
        share_id: str,
        share_token: str,
        parent_file_id: str,
        *,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        marker: Optional[str] = None
        while True:
            body: Dict[str, Any] = {
                "share_id": share_id,
                "parent_file_id": parent_file_id,
                "limit": limit,
                "order_by": "name",
                "order_direction": "ASC",
            }
            if marker:
                body["marker"] = marker

            resp = self._request_json(
                "POST",
                "/adrive/v2/file/list_by_share",
                headers={"Authorization": None, "X-Share-Token": share_token},
                json_body=body,
                max_retries=5,
            )
            items.extend(resp.get("items", []) or [])
            marker = resp.get("next_marker")
            if not marker:
                break
        return items

    def create_folder(
        self,
        parent_file_id: str,
        name: str,
        *,
        check_name_mode: str = "auto_rename",
    ) -> Dict[str, Any]:
        return self._request_json(
            "POST",
            "/adrive/v2/file/createWithFolders",
            json_body={
                "drive_id": self.drive_id,
                "parent_file_id": parent_file_id,
                "name": name,
                "check_name_mode": check_name_mode,
                "type": "folder",
            },
            max_retries=5,
        )

    def batch_copy_one(
        self, share_id: str, share_token: str, file_id: str, to_parent_file_id: str
    ) -> Dict[str, Any]:
        resp = self._request_json(
            "POST",
            "/adrive/v4/batch",
            headers={"X-Share-Token": share_token},
            json_body={
                "requests": [
                    {
                        "body": {
                            "file_id": file_id,
                            "share_id": share_id,
                            "auto_rename": True,
                            "to_parent_file_id": to_parent_file_id,
                            "to_drive_id": self.drive_id,
                        },
                        "headers": {"Content-Type": "application/json"},
                        "id": "0",
                        "method": "POST",
                        "url": "/file/copy",
                    }
                ],
                "resource": "file",
            },
            max_retries=3,
        )
        responses = resp.get("responses") or []
        if not responses:
            return {"status": None, "body": resp}
        return responses[0]

    def batch_copy_many(
        self,
        share_id: str,
        share_token: str,
        file_ids: List[str],
        to_parent_file_id: str,
    ) -> List[Dict[str, Any]]:
        requests_data: List[Dict[str, Any]] = []
        for idx, fid in enumerate(file_ids):
            requests_data.append(
                {
                    "body": {
                        "file_id": fid,
                        "share_id": share_id,
                        "auto_rename": True,
                        "to_parent_file_id": to_parent_file_id,
                        "to_drive_id": self.drive_id,
                    },
                    "headers": {"Content-Type": "application/json"},
                    "id": str(idx),
                    "method": "POST",
                    "url": "/file/copy",
                }
            )

        resp = self._request_json(
            "POST",
            "/adrive/v4/batch",
            headers={"X-Share-Token": share_token},
            json_body={"requests": requests_data, "resource": "file"},
            max_retries=3,
        )
        return resp.get("responses") or []

    def check_async_task(self, async_task_id: str) -> Dict[str, Any]:
        # 先尝试“batch + /async_task/get”（不少脚本这样用）；失败则回退到 v2 GET 端点。
        try:
            resp = self._request_json(
                "POST",
                "/adrive/v4/batch",
                json_body={
                    "requests": [
                        {
                            "body": {"async_task_id": async_task_id},
                            "headers": {"Content-Type": "application/json"},
                            "id": async_task_id,
                            "method": "POST",
                            "url": "/async_task/get",
                        }
                    ],
                    "resource": "file",
                },
                max_retries=3,
            )
            responses = resp.get("responses") or []
            if not responses:
                return {"state": "Unknown", "raw": resp}
            return responses[0].get("body") or {"state": "Unknown", "raw": responses[0]}
        except Exception:
            resp2 = self._request_json(
                "GET",
                f"/v2/async_task/get?async_task_id={async_task_id}",
                max_retries=3,
            )
            if "state" not in resp2 and "status" in resp2:
                resp2 = dict(resp2)
                resp2["state"] = resp2.get("status")
            return resp2


def extract_ids_from_link(share_link: str) -> Tuple[str, Optional[str]]:
    parsed = urlparse(share_link)
    parts = [p for p in parsed.path.split("/") if p]

    # /s/<share_id> 或 /s/<share_id>/folder/<folder_id>
    if len(parts) >= 2 and parts[0] == "s":
        share_id = parts[1]
        folder_id: Optional[str] = None
        if len(parts) >= 4 and parts[2] == "folder":
            folder_id = parts[3]
        return share_id, folder_id

    raise ValueError(f"无法从链接解析 share_id: {share_link}")


def save_shared_folder(
    api: AliPanApi,
    share_id: str,
    share_token: str,
    source_folder_id: str,
    target_folder_id: str,
    *,
    batch_size: int,
) -> None:
    """转存分享目录：优先整体转存；失败则递归逐层转存。"""

    # 1) 优先整体转存（异步任务）
    try:
        res0 = api.batch_copy_one(share_id, share_token, source_folder_id, target_folder_id)
        if res0.get("status") == 202:
            body = res0.get("body") or {}
            async_task_id = body.get("async_task_id")
            if async_task_id:
                while True:
                    task = api.check_async_task(str(async_task_id))
                    state = task.get("state")
                    if state == "Succeed":
                        logger.info("整体转存成功：total_process=%s", task.get("total_process"))
                        return
                    if state in ("Failed", "Cancelled"):
                        logger.warning("整体转存失败：%s", str(task)[:500])
                        break
                    time.sleep(1)
        elif res0.get("status") == 201:
            logger.info("整体转存返回201，视为成功")
            return
        else:
            logger.warning("整体转存未成功：%s", str(res0)[:500])
    except Exception as e:
        logger.warning("整体转存发生异常，将回退递归：%s", str(e))

    # 2) 回退：逐层列目录 + 批量拷贝文件 + 递归拷贝子目录
    items = api.list_files_by_share(share_id, share_token, source_folder_id)
    if not items:
        logger.info("目录为空或无法列出：source_folder_id=%s", source_folder_id)
        return

    files: List[Dict[str, Any]] = []
    folders: List[Dict[str, Any]] = []
    for it in items:
        if it.get("type") == "folder":
            folders.append(it)
        else:
            files.append(it)

    if files:
        file_ids = [str(f["file_id"]) for f in files if f.get("file_id")]
        ok = 0
        fail = 0
        for i in range(0, len(file_ids), max(1, batch_size)):
            chunk = file_ids[i : i + batch_size]
            responses = api.batch_copy_many(share_id, share_token, chunk, target_folder_id)
            for r in responses:
                if r.get("status") == 201:
                    ok += 1
                else:
                    fail += 1
            logger.info(
                "复制文件进度：%d/%d（成功=%d 失败=%d）",
                min(i + batch_size, len(file_ids)),
                len(file_ids),
                ok,
                fail,
            )
            time.sleep(0.2)

    for fd in folders:
        name = str(fd.get("name") or "")
        fid = str(fd.get("file_id") or "")
        if not name or not fid:
            continue

        new_folder = api.create_folder(target_folder_id, name)
        new_id = str(new_folder.get("file_id"))
        logger.info("创建文件夹：%s -> %s", name, new_id)
        save_shared_folder(
            api,
            share_id,
            share_token,
            fid,
            new_id,
            batch_size=batch_size,
        )
        time.sleep(0.1)


def load_secrets(path: str) -> Secrets:
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except json.JSONDecodeError as e:
        # 典型问题：把 JS 对象格式（key 不加双引号）当成 JSON。
        raise ValueError(
            "配置文件不是合法 JSON。请用双引号包住所有字段名和字符串，并去掉注释/尾随逗号。"
            f" (line={e.lineno}, col={e.colno})"
        ) from e
    missing = [k for k in ("access_token", "drive_id", "share_link") if not raw.get(k)]
    if missing:
        raise ValueError(f"配置文件缺少字段: {', '.join(missing)}")
    return Secrets(
        access_token=str(raw["access_token"]),
        drive_id=str(raw["drive_id"]),
        share_link=str(raw["share_link"]),
        share_pwd=str(raw.get("share_pwd") or ""),
        api_base_url=str(raw.get("api_base_url") or ""),
        target_parent_file_id=str(raw.get("target_parent_file_id") or "root"),
        target_folder_name=str(raw.get("target_folder_name") or ""),
        batch_size=int(raw.get("batch_size") or 500),
    )


def infer_api_base_url(share_link: str) -> str:
    """根据分享链接域名推断 API Base。

    经验：
    - alipan.com 的登录态 token 往往更适配 api.alipan.com
    - aliyundrive.com 的登录态 token 往往更适配 api.aliyundrive.com
    """

    parsed = urlparse(share_link)
    host = (parsed.netloc or "").lower()
    if host.endswith("alipan.com"):
        return "https://api.alipan.com"
    return "https://api.aliyundrive.com"


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    _ensure_file_logger(os.path.join(here, "alipan_save.log"))
    logger.info("启动：准备读取配置")
    config_path = os.path.join(here, "alipan_secrets.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"未找到配置文件: {config_path}（请放到脚本同目录）")

    secrets = load_secrets(config_path)
    share_id, folder_id = extract_ids_from_link(secrets.share_link)

    api_base = secrets.api_base_url.strip() or infer_api_base_url(secrets.share_link)
    api = AliPanApi(secrets.access_token, secrets.drive_id, base_url=api_base)
    logger.info("API Base: %s", api_base)
    logger.info("开始：share_id=%s, drive_id=%s", share_id, secrets.drive_id)

    share_token = api.get_share_token(share_id, secrets.share_pwd)
    share_info = api.get_share_info(share_id, share_token)
    share_name = str(share_info.get("share_name") or "分享")

    if folder_id:
        root_folder_id = folder_id
    else:
        file_infos = share_info.get("file_infos") or []
        if not file_infos or not file_infos[0].get("file_id"):
            raise RuntimeError(f"无法从 share_info 获取根目录 file_id: {str(share_info)[:500]}")
        root_folder_id = str(file_infos[0]["file_id"])

    logger.info(
        "分享信息：share_name=%s file_count=%s",
        share_name,
        share_info.get("file_count"),
    )

    target_name = secrets.target_folder_name.strip() or share_name
    target_folder = api.create_folder(secrets.target_parent_file_id, target_name)
    target_folder_id = str(target_folder.get("file_id"))
    logger.info(
        "目标目录：parent=%s name=%s file_id=%s",
        secrets.target_parent_file_id,
        str(target_folder.get("name") or target_name),
        target_folder_id,
    )

    save_shared_folder(
        api,
        share_id,
        share_token,
        root_folder_id,
        target_folder_id,
        batch_size=secrets.batch_size,
    )

    logger.info("完成：已发起/完成转存（大目录可能仍在后台异步处理）")


if __name__ == "__main__":
    main()
