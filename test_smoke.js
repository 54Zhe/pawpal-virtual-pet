/* 零依赖冒烟测试：Node 内置 vm + 桩 DOM
 * 运行：node test_smoke.js
 *
 * 覆盖：
 *  场景 A —— 正常存储：脚本加载、配置完整性、新游戏弹出选物种、
 *            选择物种落档、属性随时间衰减、喂食/训练结算、存档读写往返
 *  场景 B —— localStorage 抛异常（沙箱 iframe / 隐私模式）：
 *            脚本不得中断，渲染/结算/存档均不得抛错
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: index.html 中未找到内联脚本"); process.exit(1); }
const code = m[1];

let passed = 0, failed = 0;
function ok(cond, name){
  if (cond) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.error("  ✗ " + name); }
}

/* ---------- 桩 DOM ---------- */
function makeEl(tag){
  const el = {
    tagName: tag || "div",
    children: [], style: {}, dataset: {},
    textContent: "", innerHTML: "", value: "",
    childNodes: [{}, { textContent: "" }],
    _cls: new Set(),
    _onclick: null,
  };
  el.classList = {
    add(c){ el._cls.add(c); },
    remove(c){ el._cls.delete(c); },
    toggle(c, f){ if (f === undefined) f = !el._cls.has(c); if (f) el._cls.add(c); else el._cls.delete(c); return f; },
    contains(c){ return el._cls.has(c); },
  };
  Object.defineProperty(el, "onclick", {
    get(){ return el._onclick; },
    set(f){ el._onclick = f; },
  });
  el.addEventListener = () => {};
  el.appendChild = (c) => { el.children.push(c); return c; };
  el.prepend = (c) => { el.children.unshift(c); };
  el.remove = () => {};
  el.querySelector = () => makeEl();
  el.querySelectorAll = () => [];
  el.getBoundingClientRect = () => ({ width: 400, height: 300, left: 0, top: 0 });
  Object.defineProperty(el, "lastChild", { get(){ return el.children[el.children.length - 1] || null; } });
  return el;
}

function makeDocument(){
  const byId = {};
  const names = ["鸟系","犬系","猫系","兔系","龙系","随机"];
  const spEls = ["0","1","2","3","4","r"].map((idx, i) => {
    const e = makeEl();
    e.dataset.idx = idx;
    e.dataset.name = names[i];
    return e;
  });
  return {
    hidden: false,
    body: makeEl("body"),
    _byId: byId,
    _spEls: spEls,
    getElementById(id){ return byId[id] || (byId[id] = makeEl()); },
    createElement(t){ return makeEl(t); },
    addEventListener(){},
    querySelector(sel){
      if (sel.indexOf("overlay.show") >= 0) return null;
      return makeEl();
    },
    querySelectorAll(sel){
      if (sel.indexOf(".sp") >= 0) return spEls;
      return [];
    },
  };
}

function run(extra, storage){
  const document = makeDocument();
  const store = storage || (() => {
    const data = {};
    return {
      _data: data,
      getItem(k){ return k in data ? data[k] : null; },
      setItem(k, v){ data[k] = String(v); },
      removeItem(k){ delete data[k]; },
    };
  })();
  const sandbox = {
    console, Date, Math, JSON, Object, Array, String, Number,
    parseInt, parseFloat, isNaN, Set, Map,
    setInterval(){ return 0; }, clearInterval(){},
    setTimeout(){ return 0; }, clearTimeout(){},
    document,
    localStorage: store,
    window: { addEventListener(){} },
    location: { reload(){} },
  };
  vm.createContext(sandbox);
  vm.runInContext(code + "\n" + extra, sandbox);
  return { sandbox, document, store };
}

const HOOKS = `
globalThis.__T = {
  get S(){ return S; },
  SPECIES, STAGES, ITEMS, LINES,
  tick, save, load, stageIdx, render, ACTIONS
};`;

/* ---------- 场景 A：正常 localStorage ---------- */
console.log("场景 A：正常存储环境");
{
  const { sandbox, document, store } = run(HOOKS);
  const T = sandbox.__T;

  ok(!!T, "脚本在桩 DOM 下完整加载，无异常");
  ok(T.SPECIES.length === 5, "内置 5 条物种进化线");
  ok(T.STAGES.length === 5, "5 个成长阶段");
  ok(T.ITEMS.length === 11, "装扮商店 11 件饰品");
  ok(Object.keys(T.LINES).length >= 10, "台词库分类齐全");
  ok(T.S.speciesChosen === false, "新存档未选定物种");
  ok(document._byId["spOverlay"].classList.contains("show"), "新游戏自动弹出选物种界面");

  document._spEls[1]._onclick(); // 点「犬系」
  ok(T.S.species === 1 && T.S.speciesChosen === true, "选择犬系后写入状态并关闭弹层");
  ok(!document._byId["spOverlay"].classList.contains("show"), "选物种弹层已关闭");

  const h0 = T.S.hunger;
  T.tick(10 * 60000); // 流逝 10 分钟
  ok(T.S.hunger < h0, "时间差补偿：10 分钟后饱食下降（" + Math.round(h0) + " → " + Math.round(T.S.hunger) + "）");

  T.S.xp = 100; // 直接到「少年」阶段，解除蛋形态限制
  const h1 = T.S.hunger, c1 = T.S.coins;
  T.ACTIONS.feed();
  ok(T.S.hunger > h1, "喂食后饱食回升");
  ok(T.S.coins === Math.max(0, c1 - 2), "喂食扣 2 金币");

  const xp0 = T.S.xp, cn0 = T.S.coins;
  T.ACTIONS.train();
  ok(T.S.xp === xp0 + 10 && T.S.coins === cn0 + 5, "训练 +10 经验 +5 金币");

  T.save();
  ok(!!store._data["pawpal.v1"], "save() 成功写入 localStorage");
  const loaded = JSON.parse(store._data["pawpal.v1"]);
  ok(loaded.species === 1 && loaded.speciesChosen === true, "存档包含物种选择，刷新后可恢复");
}

/* ---------- 场景 B：localStorage 抛异常（沙箱/隐私模式） ---------- */
console.log("场景 B：localStorage 不可用（沙箱 iframe / 隐私模式）");
{
  const badStore = {
    getItem(){ throw new Error("SecurityError"); },
    setItem(){ throw new Error("SecurityError"); },
    removeItem(){ throw new Error("SecurityError"); },
  };
  let threw = null, res = null;
  try { res = run(HOOKS, badStore); } catch (e) { threw = e; }
  ok(!threw, "存储不可用时脚本加载不中断");
  if (res) {
    const T = res.sandbox.__T;
    let threw2 = null;
    try { T.render(); T.tick(60000); T.save(); } catch (e) { threw2 = e; }
    ok(!threw2, "渲染 / 离线结算 / 存档在坏存储下均不抛错");
  }
}

/* ---------- 汇总 ---------- */
console.log("");
if (failed === 0) {
  console.log("✅ 全部通过：" + passed + " 项断言");
  process.exit(0);
} else {
  console.error("❌ 失败 " + failed + " 项，通过 " + passed + " 项");
  process.exit(1);
}
