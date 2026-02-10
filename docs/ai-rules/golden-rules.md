# Golden Rules — 详细规范与代码示例

> 本文档是 `AGENTS.md` 的补充，包含历史教训的详细代码示例与排查流程。
> **触发条件**：遇到 React 渲染错误、白屏、函数未定义、高频交互卡顿/跳动时阅读。

---

## React Hooks 规则（强制）

> **禁止在条件语句或 return 之后调用 Hooks**。永远将 Hooks 置于组件顶部。

- **早期返回必须在所有 Hooks 之后**：`if (condition) return null` 这类早期返回必须放在所有 `useState`、`useEffect`、`useCallback`、`useMemo` 等 Hooks 调用之后，否则会导致 "Rendered more hooks than during the previous render" 错误。
- **典型错误模式**：
  ```tsx
  // ❌ 错误：useEffect 在早期返回之后
  const [position, setPosition] = useState(null);
  if (!position) return null;  // 早期返回
  useEffect(() => { ... }, []); // 这个 hook 在某些渲染中不会执行
  
  // ✅ 正确：所有 hooks 在早期返回之前
  const [position, setPosition] = useState(null);
  useEffect(() => { ... }, []); // 先声明所有 hooks
  if (!position) return null;  // 早期返回放最后
  ```

---

## 白屏问题排查流程（强制）

> **白屏时禁止盲目修改代码**，必须先获取证据。

1. **第一步：运行 E2E 测试获取错误日志**
   ```bash
   npx playwright test e2e/<相关测试>.e2e.ts --reporter=list
   ```
2. **第二步：如果 E2E 无法捕获，请求用户提供浏览器控制台日志**
3. **第三步：根据错误信息定位问题**，常见白屏原因：
   - React Hooks 顺序错误（"Rendered more hooks than during the previous render"）
   - 组件渲染时抛出异常
   - 路由配置错误
   - 资源加载失败（404）
4. **禁止行为**：在没有错误日志的情况下"猜测"问题并随意修改代码

---

## Vite SSR 函数提升陷阱（强制）

> **Vite 的 SSR 转换会将 `function` 声明转为变量赋值，导致函数提升（hoisting）失效。**

- **问题**：原生 JS 中 `function foo() {}` 会被提升到作用域顶部，但 Vite SSR（vite-node）会将其转换为类似 `const foo = function() {}` 的形式，此时在定义之前引用会抛出 `ReferenceError: xxx is not defined`。
- **典型错误模式**：
  ```typescript
  // ❌ 错误：注册函数在文件上方，被引用的函数定义在文件下方
  export function registerAll(): void {
      registerAbility('foo', handler); // handler 还未定义！
  }
  // ... 200 行后 ...
  function handler(ctx: Context) { ... }
  
  // ✅ 正确：确保所有被引用的函数在注册调用之前定义，或将注册函数放在文件末尾
  function handler(ctx: Context) { ... }
  export function registerAll(): void {
      registerAbility('foo', handler); // handler 已定义
  }
  ```
- **规则**：在能力注册文件（`abilities/*.ts`）中，`register*Abilities()` 导出函数必须放在文件末尾，确保所有被引用的实现函数都已定义。

---

## 高频交互规范

- **Ref 优先**：`MouseMove` 等高频回调优先用 `useRef` 避开 `useState` 异步延迟导致的跳动。
- **直操 DOM**：实时 UI 更新建议直接修改 `DOM.style` 绕过 React 渲染链以优化性能。
- **状态卫生**：在 `window` 监听 `mouseup` 防止状态卡死；重置业务时同步清空相关 Ref。
- **锚点算法**：建立 `anchorPoint` 逻辑处理坐标缩放与定位补偿，确保交互一致性。
- **拖拽回弹规范（DiceThrone）**：手牌拖拽回弹必须统一由外层 `motionValue` 控制；当 `onDragEnd` 丢失时由 `window` 兜底结束，并用 `animate(x/y → 0)` 手动回弹。禁止混用 `dragSnapToOrigin` 与手动回弹，避免二次写入导致回弹后跳位。
- **Hover 事件驱动原则**：禁止用 `whileHover` 处理"元素会移动到鼠标下"的场景（如卡牌回弹），否则会导致假 hover。应用 `onHoverStart/onHoverEnd` + 显式状态驱动，确保只有"鼠标进入元素"而非"元素移到鼠标下"才触发 hover。
- **拖拽回弹规则**：当需要回弹到原位时，**不要**关闭 `drag`，否则 `dragSnapToOrigin` 不会执行；应保持 `drag={true}` 并用 `dragListener` 控制是否可拖。
