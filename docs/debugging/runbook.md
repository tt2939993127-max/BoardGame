---
description: 运行排障手册（前端无响应/黑屏/联机连接问题）
---

# 运行排障手册

适用：本项目本地开发或同域部署时出现“点击无反应”“黑屏”“联机一直 connecting”等不确定问题。

## 1. 先判断是 UI 事件问题还是后端/代理问题

### 1.1 一键诊断脚本（复制到 DevTools Console）

在首页或大厅页打开浏览器 DevTools -> Console，粘贴运行：

```js
(async function diagnoseCardClick() {
  const ORIGIN = location.origin;
  const endpoints = [
    { name: 'frontend', url: `${ORIGIN}/`, expect: (r) => r.ok },
    { name: 'lobby-socket (engine.io probe)', url: `${ORIGIN}/lobby-socket/?EIO=4&transport=polling`, expect: (r) => r.ok },
    { name: 'socket.io (multiplayer)', url: `${ORIGIN}/socket.io/?EIO=4&transport=polling`, expect: (r) => r.ok },
    { name: 'games list (proxy)', url: `${ORIGIN}/games/tictactoe`, expect: (r) => r.ok },
  ];

  const out = [];
  const fetchStatus = async (item) => {
    try {
      const res = await fetch(item.url, { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch {}
      return { ...item, ok: item.expect(res), status: res.status, ct, body };
    } catch (e) {
      return { ...item, ok: false, status: 0, ct: '', body: String(e && e.message ? e.message : e) };
    }
  };

  for (const e of endpoints) out.push(await fetchStatus(e));

  const table = out.map(x => ({
    name: x.name,
    url: x.url,
    ok: x.ok,
    status: x.status,
    contentType: x.ct,
    hint: x.body.replace(/\s+/g, ' ').slice(0, 120),
  }));
  console.table(table);

  const lobbyProbe = out.find(x => x.name.startsWith('lobby-socket'));
  const sioProbe = out.find(x => x.name.startsWith('socket.io'));
  const gamesProbe = out.find(x => x.name.startsWith('games list'));

  const issues = [];

  if (!lobbyProbe || !lobbyProbe.ok) {
    issues.push({
      title: '大厅 WS 不通（/lobby-socket 失败）',
      why: 'game-server(18000) 未启动/挂了，或 Vite proxy 未生效。',
      fix: '确认 18000 可访问；检查 vite.config.ts 的 /lobby-socket 代理；Docker 模式确认容器与反代。'
    });
  }

  if (!sioProbe || !sioProbe.ok) {
    issues.push({
      title: '联机 SocketIO 不通（/socket.io 失败）',
      why: 'Vite 没把 /socket.io 代理到 18000，或后端 socket.io 未启动。',
      fix: '检查 vite.config.ts 是否有 /socket.io -> 18000（ws:true）；确认 game-server 正常运行。'
    });
  } else if ((sioProbe.ct || '').includes('text/html')) {
    issues.push({
      title: '联机 SocketIO 命中前端 HTML（/socket.io 返回 index.html）',
      why: '会导致 boardgame.io 一直 connecting，表现为黑屏/没反应。',
      fix: '必须让 /socket.io 返回 engine.io 握手（内容应以 `0{"sid":...}` 开头）。'
    });
  }

  if (!gamesProbe || !gamesProbe.ok) {
    issues.push({
      title: 'REST /games 不可用',
      why: '游戏服务未启动或 /games 代理未生效。',
      fix: '检查 18000 端口、vite.config.ts 的 /games 代理、以及 game-server 是否因 Mongo 失败退出。'
    });
  }

  if (issues.length === 0) {
    console.log('[diagnose] 未发现明显网络/代理问题，下一步检查 UI 事件：');
    console.log('1) 观察地址栏：点击卡片是否出现 ?game=<id>');
    console.log('2) 若 URL 已变但弹窗没出现：怀疑 ModalStack/渲染逻辑。');
  } else {
    console.log('[diagnose] 发现可能原因：');
    issues.forEach((x, i) => {
      console.log(`\n${i + 1}. ${x.title}\n- why: ${x.why}\n- fix: ${x.fix}`);
    });
  }
})();
```

解读：
- `/lobby-socket` 不通：大厅列表、卡片详情可能没数据。
- `/socket.io` 不通或返回 HTML：对局页常见“左上角 connecting…/黑屏”。
- `/games/<id>` 不通：创建/加入/获取房间信息会失败。

## 2. “点击卡片没反应”专项（URL 已变化但弹窗未出现）

如果地址栏已经变成 `/?game=tictactoe` 但弹窗没出现，说明：
- onClick 已触发
- 路由状态（searchParams）已更新
- 问题更可能在 Home 页的「打开 GameDetailsModal」逻辑或 ModalStack 渲染。

建议按顺序排查：
- 确认 `#modal-root` 存在（在 Elements 搜索 `id="modal-root"`）。缺失会导致 ModalStackRoot 渲染 null。
- 确认 `ModalStackRoot` 存在且未被条件渲染移除。
- 在 Console 执行：
  - `document.getElementById('modal-root')`
  - 观察返回是否为 HTMLElement。

## 3. “对局页黑屏/connecting…”专项

检查点：
- `/socket.io/?EIO=4&transport=polling` 必须是 200 且内容是握手 JSON（不是 HTML）。
- 若 `/games/<gameId>/<matchId>` 是 200，但仍 connecting：优先检查 `/socket.io`。

## 4. 需要提供给维护者的信息

当你发起 issue/询问时，请至少提供：
- 当前 URL（含 `?game=` 或 `/play/<gameId>/match/<matchId>?playerID=`）
- 上面诊断脚本的 `console.table` 输出
- Network 面板中 `/lobby-socket`、`/socket.io`、`/games/...` 的状态码
