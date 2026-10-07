# 🐾 小爪伙伴 PawPal · 虚拟宠物养成 · Vibe Coding 作品

一个**单文件、零依赖**的虚拟宠物养成小游戏，用 AI（Vibe Coding）辅助完成。打开即玩，2 秒内加载，存档全在浏览器本地。

> 课程：草履虫也懂的 Vibe Coding 部署课
> 技术栈：纯 HTML / CSS / JavaScript，无框架、无构建、无外部素材（Vercel 选 `Other` 预设即可）

## 🌐 在线体验

[**https://pawpal-virtual-pet.app.workbuddy.host/**](https://pawpal-virtual-pet.app.workbuddy.host/)

手机、平板、电脑直接打开即可玩，无需安装。每位访客的宠物数据存于各自设备的 `localStorage`，互不影响。

## 🎮 玩法流程

1. **选择物种**：开局弹出选蛋界面——鸟🦅 / 犬🐺 / 猫🦁 / 兔🦄 / 龙🐉 五系任选，或交给 🎲 随机。
2. **孵化养成**：点蛋 8 下孵化，经历 **蛋 → 幼崽 → 少年 → 成年 → 王者** 五段进化。照顾它的饱食 / 清洁 / 心情 / 精力 / 健康五项属性——又饿又脏会生病，全靠喂食、洗澡、陪玩、睡觉、看病来维系。
3. **赚钱打扮**：陪玩小游戏（10 秒疯狂点击）和训练赚金币，去装扮商店买帽子、眼镜、围巾给它戴上；👑 皇冠 80 金币是毕业装备。

## 🐛 已修复的关键缺陷

1. **重置按钮无效（自动存档"自己打败自己"）** —— 点重置后永远回到原来的宠物
   游戏有 `beforeunload` 兜底存档机制。旧重置流程是：清空 `localStorage` → `location.reload()` → **刷新前一瞬间 `beforeunload` 触发，把内存里的旧状态又写回去了**，等于没清。
   修法：加 `skipSave` 总开关——确认重置后先切断所有自动存档路径（`beforeunload` / `visibilitychange` / 定时器共用同一个 `save()`），再清档刷新。
2. **confirm() 弹窗被拦截导致点了没反应**
   部分预览环境（沙箱 iframe）会拦截原生 `confirm()`。改为「再点一次确认」的行内双击确认：第一次点按钮变红警示，3 秒内再点才真正执行，不依赖任何原生弹窗。
3. **老存档升级后字段缺失**
   新增「选物种」功能后，老玩家的存档没有 `speciesChosen` 字段。加载时做防御性合并：缺省视为已选定（沿用原宠物），不会被强制重选，其余新字段（`wardrobe` / `equipped`）也由默认值补全。

## ✨ 特色亮点

- ⏱ **真实时间驱动 + 离线结算**：属性随现实时间衰减。`visibilitychange` 监听切后台——暂停所有 CSS 动画（`animation-play-state`）并落盘时间戳；回前台按**时间差补偿**统一结算，后台 tab 定时器被浏览器节流也不影响精度。离开超 1 分钟回来会弹出"欢迎回来"结算单，列出五项属性增减明细。
- 💾 **纯本地存档**：全部状态序列化进 `localStorage`，刷新、关浏览器、跨天都不丢；`beforeunload` 兜底。
- 🧬 **五系物种五段进化**：25 个形态全部由 emoji 呈现，零图片资源。
- 💬 **气泡对话生命感**：宠物会按状态说话（优先级：生病 > 饿 > 脏 > 郁闷 > 困 > 开心 > 闲聊），每个操作都有即时台词反应；25 秒冷却 + 蛋形态/睡觉/弹窗时不插嘴，有生命感但不烦人。
- 🎾 **陪玩点击小游戏**：10 秒疯狂点击攒 ❤️，按手速分档结算金币（/5，上限15）、经验（/3，上限20）、心情（/2，上限25），带爱心粒子特效和评价语（60+ "神级手速！！"）。
- 👗 **装扮商店**：11 件饰品分帽子/眼镜/颈部三槽位，点击即买即戴、同槽位自动替换，实时叠加显示在宠物身上（CSS 绝对定位 + em 相对尺寸，宠物变大饰品跟着大）。
- 😴 **双主题**：睡觉自动切换深蓝夜间主题 + Zzz 飘字动画；生病灰化抖动、脏了冒 💩、困了喊累，状态全写在"脸"上。
- 💰 **金币经济闭环**：训练 +5 / 陪玩最多 +15 / 成长 +15 赚入，喂食 -2 / 零食 -1 / 看病 -10 / 装扮 15~80 支出。
- 📱 **移动端友好**：响应式布局、按钮大触控区、无悬停依赖。

## 🚀 本地运行

直接双击 `index.html` 即可，无需任何依赖或服务器。

## ✅ 自测

仓库根目录保留了零依赖冒烟测试 `test_smoke.js`（Node 内置 `vm` + 桩 DOM，从 `index.html` 提取内联脚本在沙箱中执行）：

```
node test_smoke.js
```

覆盖两个场景共 17 项断言：

- **场景 A（正常存储）**：脚本加载、配置完整性（5 物种 / 5 阶段 / 11 饰品）、新游戏弹出选物种、选择落档、10 分钟时间差衰减、喂食/训练结算、存档读写往返。
- **场景 B（localStorage 抛异常，模拟沙箱 iframe / 隐私模式）**：脚本加载不中断，渲染 / 离线结算 / 存档均不抛错。

## ☁️ 部署

### 方案一：GitHub Pages

1. 推送本仓库到 GitHub（见下）。
2. 仓库 `Settings → Pages → Source` 选 `main` 分支根目录，保存。
3. 约 1 分钟后访问 `https://<你的用户名>.github.io/pawpal-virtual-pet/` ✅

### 方案二：GitHub + Vercel

1. 推送本仓库到 GitHub：

   ```
   git init
   git add .
   git commit -m "feat: 小爪伙伴虚拟宠物 vibe coding 作品"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/pawpal-virtual-pet.git
   git push -u origin main
   ```
2. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录 → **Add New Project** → 导入 `pawpal-virtual-pet` 仓库 → **Framework Preset 选 `Other`** → Deploy。
3. 约 1 分钟后获得 `https://pawpal-virtual-pet-xxx.vercel.app`，发到手机微信能打开即部署成功 ✅

## 📁 文件结构

```
pawpal-virtual-pet/
├── index.html      # 游戏本体：样式 + 结构 + 逻辑全部内联（单文件零依赖）
├── test_smoke.js   # 零依赖冒烟测试（node test_smoke.js）
├── README.md       # 说明
├── LICENSE         # MIT
└── .gitignore
```

## 📄 License

[MIT](LICENSE)
