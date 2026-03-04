阿里云盘分享转存工具（云端转存）

这个工具会把“分享链接”的内容转存到你的“我的云盘”，并在网盘里创建一个文件夹承接。
注意：这是云端转存，不是下载到本地硬盘。

一、准备
1) 电脑需要安装 Python 3.8+（建议 3.10+）
2) 安装依赖：
   pip install requests

二、配置文件（同目录）
把 alipan_secrets.json 放在本目录（与 alipan_save.py 同级）。

如果你发现一直 401（AccessTokenInvalid / not login），很可能是 API 域名不匹配：
- 你的 token 来自 alipan.com 登录态：可在配置里加 `"api_base_url": "https://api.alipan.com"`
- 你的 token 来自 aliyundrive.com 登录态：可在配置里加 `"api_base_url": "https://api.aliyundrive.com"`
不填则会按 share_link 域名自动推断。

三、运行
双击 run.bat

如果双击后黑框一闪而过：
1) 先检查同目录的 run.log / alipan_save.log 是否生成
2) 也可以改用 PowerShell 版本：右键 run.ps1 -> "使用 PowerShell 运行"

四、常见报错
1) 401/403：access_token 过期或无权限，重新登录网页再抓一次新的 token。
   - 如果 403 返回 code=ForbiddenDriveLocked：说明网盘被锁定，需要先在官方网页/客户端完成“解锁网盘”。
2) 429：请求频率限制，脚本会自动退避重试，耐心等待。
3) 大目录：可能先返回异步任务，日志会显示正在轮询状态。

五、日志
- run.log：启动器(run.bat/run.ps1)捕获的完整输出（推荐先看这个）
- alipan_save.log：Python 脚本自身的业务日志

六、安全提醒
access_token / share_token 都是敏感凭证，不要发给任何人。
