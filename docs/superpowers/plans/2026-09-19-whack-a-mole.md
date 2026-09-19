# 打地鼠儿童游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个 30 关、阳光草坪主题、护眼、适合儿童的纯前端打地鼠游戏，双击 `index.html` 即可玩。

**Architecture:** 5 个文件：`index.html`（页面结构）、`css/style.css`（视觉与动画）、`js/levels.js`（30 关配置）、`js/audio.js`（Web Audio 合成音效）、`js/game.js`（游戏逻辑）。地鼠/场景图形全部用内联 SVG，零外部依赖。

**Tech Stack:** 原生 HTML5 + CSS3 + 原生 JavaScript（ES6）。无框架、无构建、无网络请求。

**项目目录：** `F:\workSpace\openCode\daDiShu`（非 git 仓库，跳过提交步骤）

---

## 文件结构

| 文件 | 职责 | 关键接口 |
|---|---|---|
| `index.html` | 开始屏 / 关卡地图 / 游戏场 / 结算屏 结构 | 各屏 `<section>`，ID 见 Task 1 |
| `css/style.css` | 主题、布局、SVG 动画、护眼配色、🌙夜间模式 | class 见 Task 2 |
| `js/levels.js` | 生成 `window.LEVELS`（30 项）+ `getLevel(n)` | `LEVELS[id-1]` |
| `js/audio.js` | `window.AudioManager = { init, play(name), toggleMute, muted }` | name∈{hit,miss,gold,win,fail,pop,click} |
| `js/game.js` | 状态机、弹洞、计分、计时、过关判定、锤子 | `startGame()`, `openLevel(n)`, `State` |

加载顺序：`levels.js → audio.js → game.js`（`index.html` 底部 `defer` 脚本）。

## 30 关难度公式（js/levels.js）

`t = (id-1)/29`（0→1）。洞数 1-10 关 3×3，11-20 关 4×4，21-30 关 4×4 提速。参数随 t 线性变化：

| 参数 | id=1 | id=30 | 含义 |
|---|---|---|---|
| `duration` | 50s | 30s | 单关限时 |
| `target` | 8 | 63 | 达成分数 |
| `upTime` | 1700ms | 700ms | 地鼠停留时长 |
| `minI` | 1500ms | 450ms | 最小出现间隔 |
| `maxI` | 2400ms | 1000ms | 最大出现间隔 |
| `goldChance` | 0.05 | 0.15 | 金鼠出现概率 |
| `goldValue` | 15 | 50 | 金鼠分值 |

---

### Task 1: index.html 页面骨架

**Files:** Create `index.html`

- [ ] **Step 1: 写页面结构**

四个全屏 `<section>`：
1. `#start-screen`：标题（大圆角字）、太阳/云装饰、开始按钮、🌙护眼模式开关。
2. `#map-screen`：标题 + 30 格关卡地图（`#map-grid`，60×60px 圆角格子，格子内 ⭐）、返回按钮。
3. `#game-screen`：顶部 HUD（`#level-no`、`#score`、`#hud-target`、`#hud-time`、静音按钮、🌙开关）、`#prompt`（目标提示条）、`#board`（洞网格，由 JS 填充 `#holes`）、锤子光标层。
4. `#result-screen`：`#result-stars`、`#result-title`、`#result-score`、按钮（重玩 / 下一关 / 返回地图 / 返回开始）。

底部 `<script src="js/levels.js" defer>` → `js/audio.js` → `js/game.js`。

- [ ] **Step 2: 浏览器验证**

用 Playwright 打开 `file:///F:/workSpace/openCode/daDiShu/index.html`，确认 4 屏存在、无控制台报错。

### Task 2: css/style.css 视觉与动画

**Files:** Create `css/style.css`

- [ ] **Step 1: 写护眼主题变量**

`:root` 定义：`--bg-sky`（柔和浅蓝渐变）、`--cream`（#FFF6E8 奶油底）、`--ink`（#5B4636 深棕文字）、`--grass`（柔和绿）、`--accent`（暖橙）。所有色彩均为低饱和柔亮色；过渡 `transition: transform 200ms ease` 等。

- [ ] **Step 2: 写场景与组件样式**

太阳（柔光辐射动画，无频闪）、云朵（缓慢横向漂移）、山丘（SVG 或 border-radius 堆叠）、草丛花朵。HUD 大字、圆角卡片。锤子为自定义 cursor（SVG data-URI）+ 点击弹跳。

- [ ] **Step 3: 写地鼠动画**

`.mole`（SVG）三种状态：`.up`（translateY 滑出，200ms ease-out）、`.down`（滑回）、`.ko`（晕倒旋转 90° + 星星绕圈，无闪光）。金鼠 `.gold` 加淡金描边。

- [ ] **Step 4: 写特效与过渡屏**

命中星星粒子动画；`.toast` 加分飘字；关卡过渡全屏盖层淡入淡出；`body.night` 切换月光配色（低蓝光浅紫蓝）。

### Task 3: js/levels.js 关卡配置

**Files:** Create `js/levels.js`

- [ ] **Step 1: 写生成逻辑**

```js
(function () {
  const LEVELS = [];
  for (let id = 1; id <= 30; id++) {
    const t = (id - 1) / 29;
    const rows = id <= 10 ? 3 : 4;
    const cols = rows;
    LEVELS.push({
      id, rows, cols,
      duration: Math.round(50 - t * 20),
      target: Math.round(8 + t * 55),
      upTime: Math.round(1700 - t * 1000),
      minI: Math.round(1500 - t * 1050),
      maxI: Math.round(2400 - t * 1400),
      goldChance: 0.05 + t * 0.1,
      goldValue: Math.round(15 + t * 35),
    });
  }
  window.LEVELS = LEVELS;
  window.getLevel = function (n) { return LEVELS[n - 1]; };
})();
```

- [ ] **Step 2: 控制台验证**

在浏览器控制台执行 `getLevel(1)`、`getLevel(30)`，确认数值符合表格（1：rows=3,duration=50,target=8；30：rows=4,duration=30,target=63）。

### Task 4: js/audio.js 合成音效

**Files:** Create `js/audio.js`

- [ ] **Step 1: 用 Web Audio 合成音效**

`AudioManager.init()` 建 `AudioContext`（在首次用户交互时恢复）。`play(name)` 用 oscillator + gain envelope 合成：hit（短促上升音）、gold（琶音）、fail（下滑音）、win（上行和弦）、click／pop。`muted` 布尔 + `toggleMute()`，所有 play 前检查 `muted` 与 `ctx.state`。

- [ ] **Step 2: 控制台验证**

`AudioManager.play('hit')` 无报错；`toggleMute()` 后为静音。

### Task 5: js/game.js 核心逻辑

**Files:** Create `js/game.js`

- [ ] **Step 1: 状态机**

`State = { screen, level, score, timeLeft, timerId, spawnTimer, moles:Map, running }`。函数：`showScreen(id)`、`openLevel(n)`（构建网格、重置计分、启动倒计时）、`nextLevel(n+1)`。

- [ ] **Step 2: 网格与地鼠**

`buildBoard(lv)`：按 lv 生成 `rows×cols` 个洞，洞内放 `mole`(SVG path) + `hill`(土堆)。`spawnMole()` 间隔取样 `minI..maxI`，随机选一个 `.down` 洞，`upTime` 后自动 `.down`；金鼠概率 `goldChance` 走金色分支。同洞不重复弹出（连续两次抽中则该轮跳过）。

- [ ] **Step 3: 命中判定**

洞点击且地鼠 `.up`：加分（金鼠 goldValue，否则 1）+ `.ko` 动画 + 粒子 + `AudioManager.play` + `updateHUD`。点 `.down` 洞：`play('miss')`（不扣分）。命中后立即重置该洞冷却。

- [ ] **Step 4: 倒计时与结算**

`setInterval` 1000ms 更新 `#hud-time`。倒计时为 0：若 `score >= target` → 通关：保存该关星级（`localStorage['ddsh_star_'+id]`=1-3），显示结算屏；否则失败屏。过关分星级规则：≥target=1⭐，≥target*2=2⭐，≥target*4=3⭐（1-20 关用 ×2/×3.5 放宽）。

- [ ] **Step 5: 锤子光标与交互**

`#board` 上 `mousemove`/`touchmove` 定位锤子；点击砸锤动画。详情见 Task 1/2。

- [ ] **Step 6: 关卡地图**

`#map-grid` 30 格：未解锁「🔒」、已解锁未通关数字、已通关显示 ⭐；从 `localStorage` 读取。点击已解锁格 `openLevel(n)`。

### Task 6: 集成与体验打磨

**Files:** Modify `index.html`, `css/style.css`, `js/game.js`

- [ ] **Step 1: 流程接线**

开始→地图→选关/下一关→…→结算。全部按钮绑定。首屏解锁第 1 关；通关解锁 `n+1` 关。

- [ ] **Step 2: 过渡屏与布局**

给 `#prompt` 配置目标文案例：「本关目标：拿到 25 分，限时 40 秒！」，开场 1.6s 盖层。结算屏文案按星级变化。

### Task 7: 浏览器全流程实测

**Files:** —（验证用）

- [ ] **Step 1: Playwright 冒烟测试**

打开页面 → 控制台无报错 → 点开始 → 打开第 1 关 → 点击两个洞确认无错；`document.querySelectorAll('.hole').length === 9`；倒计时递减；end 前后台无异常。

- [ ] **Step 2: 30 关配置校验**

控制台断言：`getLevel` 的 rows 在 1-10 全为 3、11-30 全为 4；`duration` 单调不增、`target` 单调不减、`upTime` 单调不减减。修正后通过。

- [ ] **Step 3: 截图检查视觉**

对开始屏/游戏屏/结算屏截图，确认画面精美、无元素溢出（响应式 1280×800 与 480×800 手机宽度）。

---

## 自检清单（写完后核对 spec）

- ✅ 30 关（Task 3）✅ 由易到难（Task 3 公式）✅ 精美/可爱（Task 2 SVG 地鼠）✅ 环境优美（Task 2 场景）
- ✅ 护眼（Task 2 色彩规范 + 🌙夜间模式）✅ 音效+静音（Task 4）✅ 结算评分（Task 5）