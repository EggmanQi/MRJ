# Gate 1 Web Demo 修复规划 · P1–P3

- 创建：2026-10-27
- 来源：对 `web/` 全部 21 个源文件的 code review + 首次 build 结果
- 对应规格：`Docs/山河跳抽卡产品规格说明书.md` v0.5
- 状态：**已执行**（2026-10-27 · P1/P2 代码落地，P3 build + 3010 冒烟通过；原 3000 旧进程需本机手动 kill）

---

## 总览

| 项 | 问题 | 性质 | 改动量 |
|---|---|---|---|
| P1 | 抽卡后未求签前刷新页面，可无限重抽、不消耗每日次数 | 逻辑漏洞 | 中（4 个文件） |
| P2 | fallback 白话解签含"会"字，违反 §14 验收判据 | 文案自相矛盾 | 小（1 行） |
| P3 | 旧 server 占用 3000 端口、`.next` 被覆盖后模块缺失；数据副本需从 Docs 同步 | 运行时环境 | 操作项 |

**执行顺序：P2 → P1 → P3**（代码全部改完后再做一次 build + 重启，避免反复污染 `.next`）。

---

## P1 · 先锁牌、后求签（修复刷牌漏洞）

### 原由

当前流程（`DrawClient.tsx`）：

```
/api/draw 成功 → 卡面只存在于 React state
/api/reading 成功 → 才调 applyDraw() 写 localStorage（含 lastFreeDrawDate）
```

漏洞链条：

1. 抽卡 → 卡面已显示，但 store 里没有任何记录；
2. 不点「求签」，直接刷新页面 → `ensureStore()` 读到旧 store，`lastFreeDrawDate` 未锁；
3. 再点「抽卡」→ 服务端重新随机，得到一张新卡。

后果：

- 用户可以反复刷新，抽到满意的卡为止——**违背"凭感觉抽一次、不挑牌"的核心诚实原则**；
- 官方手册的抽卡是一次性直觉动作，产品不应允许挑选；
- 埋点数据也会失真：`draw_result` 只在求签后上报，真实抽卡次数被低估。

### 修复方法：两阶段落库

把一次完整问卦拆成两个持久化阶段：

```
阶段 1（draw 成功立即落库）：
  - drawHistory 写入一条 status: "pending" 的占位记录
  - 立即锁死 lastFreeDrawDate
  - 外图鉴立刻点亮（卡面已经"遇见过"）

阶段 2（reading 成功后回填）：
  - 回填该条记录的 question / poem / interpretation
  - 此时才累加 voiceDelta（声音喂养）
  - status: "done"
```

这与既有设计一致：**新卡点亮图鉴（看见即拥有），声音喂养发生在解卦之后**。

### 具体改动

**`src/lib/types.ts`**

```ts
export type DrawRecord = {
  cardId: number;
  reversed: boolean;
  question: string;
  poem: string;
  interpretation: string;
  voiceDelta: VoiceVector;
  status: "pending" | "done";   // 新增
  createdAt: string;
};
```

**`src/lib/storage.ts`**

- 新增 `lockDraw(store, cardId, reversed)`：
  - 追加 pending 记录（question/poem/interpretation 为空、voiceDelta 为 {}）；
  - 锁 `lastFreeDrawDate`；
  - 不做声音累加。
- 新增 `completeReading(store, recordId, { question, poem, interpretation })`：
  - 回填对应 pending 记录并置 done；
  - 在此执行原有 voiceDelta 累加逻辑（含 `min(100)` 封顶、唤醒判定）。
- 调整 `isCardUnlocked`：**pending 记录也算已解锁**（卡面已看见）。
- 保留 `topVoiceId` 等其余函数不变。

**`src/components/DrawClient.tsx`**

- `onDraw`：拿到 draw 结果后立即调 `lockDraw` 并 `saveStore`，再播翻牌动画。
- `onReading`：改为调 `completeReading` 回填当前 pending 记录，不再 `applyDraw` 追加新记录。
- 刷新恢复逻辑：
  - 当日最后一条是 `pending` → 恢复卡面、`phase = "drawn"`，允许继续求签；
  - 当日最后一条是 `done` → 恢复完整签诗（现有逻辑）。
- 边界：抽卡后永久不求签 → pending 记录保留、图鉴点亮但无声音喂养，可接受（用户自己放弃这一签）。

**`src/app/api/draw/route.ts`**：无需改动（随机性仍在服务端）。

### 验收

- [ ] 抽卡后立即刷新：卡面与编号保持不变，不能重抽，按钮显示今日已锁
- [ ] 抽卡后未求签：外图鉴已点亮，声音数值不变
- [ ] 求签后刷新：完整签诗 + 解签可展开，声音数值已累加
- [ ] 抽卡即触发 `draw_result` 上报（不再等求签）

---

## P2 · 清除 fallback 文案中的断定词

### 原由

`src/app/api/reading/route.ts` 的 36 号 fallback 白话解签中写：

> "签里说第一枝花**会**开，开在你准备了很久的那条路上。"

"会"字正是 §14 验收判据禁用的断定时间结果词（会/将/必/一定/肯定/不会/不能）。我们自己定的合同，自己的 fallback 先违反，必须改。

### 修复方法

将该句改为（去掉"会"，保留意象化指向）：

> "签里说第一枝花，开在你准备了很久的那条路上。"

顺手核查其余 fallback 文案，确认无违规：

| 文案 | 位置 | 判定 |
|---|---|---|
| 36 号诗 "……第一枝开待潮来" | fallback 36 | ✅ "待潮来"为意象化，允许 |
| 通用诗 "……明朝风起再相寻" | 通用 fallback | ✅ "明朝"为诗境时间，非断定承诺 |
| 通用解释 "看哪一句最像你已经知道、却还没说出口的事" | 通用 fallback | ✅ 无断定词 |

### 改动文件

- `src/app/api/reading/route.ts`（一行）

### 验收

- [ ] 对 fallback 文案做关键词检查，无 会/将/必/一定/肯定/不会/不能
- [ ] 无 LLM key 时走完 36 号流程，白话解签读起来不做时间承诺

---

## P3 · 运行时环境修复（重启 + 数据同步）

### 原由

1. 3000 端口上有一个旧 server（11:51 启动，PID 70186），使用当时的 `.next` 产物；
2. 后续重新 `npm run build` 覆盖了 `.next`，旧 server 与试起的 3100 实例均报
   `Cannot find module './276.js'`；
3. 文档已全部移入 `Docs/`，`web/src/data/` 下的 `cards.json` / `voices.json` 副本
   需从 `Docs/` 重新同步，保证代码用的是 v0.5 数据。

### 修复步骤（P1、P2 代码改完后执行）

```bash
# 1. 停掉所有 next 实例（3000 / 3100）
lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs kill
lsof -nP -iTCP:3100 -sTCP:LISTEN -t | xargs kill

# 2. 从 Docs 同步最新数据
cp Docs/cards.json   web/src/data/cards.json
cp Docs/voices.json  web/src/data/voices.json

# 3. 清理并重建
cd web
rm -rf .next
npm run build

# 4. 启动
npm run start          # 生产模式，默认 3000；或 npm run dev
```

> 以上 kill / rm 操作需用户确认后执行。

### 冒烟测试（build 完成后）

```bash
# 健康检查
curl -s localhost:3000/api/health
# 期望: {"ok":true,"cards":49,"voices":16,"llmConfigured":...}

# 抽卡
curl -s -X POST localhost:3000/api/draw \
  -H "Content-Type: application/json" -d '{}'
# 期望: cardId + reversed + card 完整对象

# 求签（无 key 时走 fallback）
curl -s -X POST localhost:3000/api/reading \
  -H "Content-Type: application/json" \
  -d '{"cardId":36,"reversed":false,"question":"财务会不会好转"}'
# 期望: {poem, interpretation, source, latency_ms}
```

### 验收

- [ ] health 返回 ok:true，49 卡 / 16 声音
- [ ] draw / reading 均返回 200 JSON，无 500、无模块缺失
- [ ] `web/src/data` 副本与 `Docs/` 数据一致（version 0.5）
- [ ] 浏览器实走：抽卡 → 刷新（P1 验收）→ 求签 → 双图鉴更新

---

## 完成判据

P1、P2、P3 全部验收通过后，Gate 1 代码即与规格 v0.5 完全一致，可进入真机分发与
留存验证（核心假设：新卡用户回访率显著高于重复卡用户，次周留存 > 15%）。
