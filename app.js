const catalog = window.PVZ_CATALOG;
const grid = document.getElementById("catalog-grid");
const detailPanel = document.getElementById("detail-panel");
const closeDetail = document.getElementById("close-detail");
const selectedIds = { plants: 0, zombies: 62 };
const variantIndex = { 91: 0 };
let category = "plants";
let returnFocus = null;
const peaDps = catalog.dpsProfiles[0].damage / catalog.dpsProfiles[0].interval;

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatRatio(value) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function getDps(card) {
  const profile = catalog.dpsProfiles[card.id];
  if (!profile) return null;
  const values = Array.isArray(profile.damage) ? profile.damage : [profile.damage, profile.damage];
  const dpsValues = values.map((damage) => damage / profile.interval);
  const ratios = dpsValues.map((value) => value / peaDps);
  const range = (list, formatter = formatNumber) => list[0] === list[1]
    ? formatter(list[0])
    : `${formatter(list[0])}–${formatter(list[1])}`;
  return {
    value: range(dpsValues),
    ratio: range(ratios, formatRatio),
    basis: `${range(values)} ÷ ${formatNumber(profile.interval)} 秒 = ${range(dpsValues)} DPS${profile.basis ? `；${profile.basis}` : ""}`
  };
}

function imagePath(card, selectedVariant = 0) {
  if (card.variants) {
    return `./assets/cards/SEED_PACKET_${card.id}_MOUND_LEVEL_${selectedVariant}.PNG`;
  }
  const id = card.id < 10 ? String(card.id).padStart(2, "0") : String(card.id);
  return `./assets/cards/SEED_PACKET_${id}.PNG`;
}

function currentItems() {
  return catalog[category];
}

function getSelected() {
  return currentItems().find((card) => card.id === selectedIds[category]) || currentItems()[0];
}

function addText(parent, tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  parent.append(element);
  return element;
}

function renderGrid() {
  grid.replaceChildren();
  for (const card of currentItems()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "atlas-card";
    button.dataset.cardId = String(card.id);
    button.classList.toggle("is-selected", card.id === selectedIds[category]);
    button.setAttribute("aria-pressed", String(card.id === selectedIds[category]));
    button.setAttribute("aria-label", `${card.name}，查看${category === "plants" ? "植物" : "僵尸"}资料`);

    const image = document.createElement("img");
    image.src = imagePath(card, variantIndex[card.id] || 0);
    image.alt = `${card.name}卡图`;
    image.loading = "lazy";
    image.width = 200;
    image.height = 280;
    button.append(image);
    addText(button, "span", "card-name", card.name);

    const meta = category === "plants"
      ? `阳光 ${card.sun === null ? "复制目标" : card.sun} · 生命 ${card.health}`
      : `${card.type} · #${card.id}`;
    if (category === "plants") {
      const dps = getDps(card);
      const dpsText = dps ? `DPS ${dps.value} · ${dps.ratio} 豆` : "DPS —";
      addText(button, "span", `card-dps${dps ? "" : " is-unrated"}`, dpsText);
    }
    addText(button, "span", "card-meta", meta);
    button.addEventListener("click", () => selectCard(card));
    grid.append(button);
  }
}

function addStat(rows, label, value) {
  const row = document.createElement("div");
  row.className = "stat-row";
  addText(row, "dt", "", label);
  addText(row, "dd", "", value ?? "—");
  rows.append(row);
}

function renderVariants(card) {
  const list = document.getElementById("variant-list");
  list.replaceChildren();
  if (!card.variants) {
    list.hidden = true;
    return;
  }
  list.hidden = false;
  addText(list, "span", "variant-label", "墓堆等级");
  card.variants.forEach((level) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-button";
    button.classList.toggle("is-active", variantIndex[card.id] === level);
    button.setAttribute("aria-pressed", String(variantIndex[card.id] === level));
    button.textContent = String(level);
    button.setAttribute("aria-label", `墓堆等级 ${level}`);
    button.addEventListener("click", () => {
      variantIndex[card.id] = level;
      renderDetail();
    });
    list.append(button);
  });
}

function renderDetail() {
  const card = getSelected();
  if (!card) return;
  const isPlant = category === "plants";
  const id = card.id < 10 ? String(card.id).padStart(2, "0") : String(card.id);
  document.getElementById("detail-kicker").textContent = `${isPlant ? "植物卡" : "僵尸卡"} · ${id}`;
  document.getElementById("detail-name").textContent = card.name;
  document.getElementById("detail-en").textContent = card.en;
  document.getElementById("detail-id").textContent = `#${card.id}`;

  const art = document.getElementById("detail-art");
  art.src = imagePath(card, variantIndex[card.id] || 0);
  art.alt = `${card.name}卡图`;

  const dps = isPlant ? getDps(card) : null;
  document.getElementById("detail-dps").textContent = dps ? `${dps.value} / 秒` : "—";
  document.getElementById("detail-dps-ref").textContent = dps ? `${dps.ratio} 豆` : "非持续输出";
  document.getElementById("dps-basis").textContent = dps
    ? dps.basis
    : isPlant ? "无固定持续攻击周期" : "僵尸卡不适用植物 DPS";

  document.getElementById("detail-sun").textContent = isPlant
    ? card.sun === null ? "复制目标" : String(card.sun)
    : "—";
  document.getElementById("detail-health").textContent = isPlant ? card.health : "—";
  document.getElementById("detail-role").textContent = isPlant ? card.role : card.type;

  const stats = document.getElementById("stat-list");
  stats.replaceChildren();
  if (isPlant) {
    addStat(stats, "DPS", dps ? `${dps.value} / 秒（${dps.ratio} 豆）` : "—（非持续输出）");
    addStat(stats, "阳光消耗", card.sun === null ? "按复制对象" : `${card.sun} 阳光`);
    addStat(stats, "生命值", card.health);
    addStat(stats, "基础伤害", card.damage);
    addStat(stats, "攻击间隔", card.attackInterval);
    addStat(stats, "布置间隔", card.recharge);
    addStat(stats, "作战类型", card.role);
  } else {
    addStat(stats, "卡牌类别", card.type);
    addStat(stats, "种子编号", String(card.id));
    addStat(stats, "卡图版本", "3215");
    addStat(stats, "单位", "僵尸侧");
  }

  document.getElementById("ability-title").textContent = isPlant ? "攻击与能力" : "僵尸特性";
  document.getElementById("detail-attack").textContent = isPlant ? card.attack : card.type;
  document.getElementById("detail-ability").textContent = isPlant ? card.ability : card.feature;
  document.getElementById("data-note").textContent = isPlant
    ? `DPS按单目标每轮伤害 ÷ 攻击周期计算；1 豆 = 豌豆射手 ${formatNumber(peaDps)} DPS。${dps?.basis.includes("黄油概率") ? "玉米投手按源码黄油概率折算期望值。" : ""}模式平衡、强化效果与命中数可能改变实际表现。`
    : "僵尸卡按 v3215 卡牌目录展示；此页不含胜率或对局统计。";
  renderVariants(card);
}

function renderCategory() {
  const isPlant = category === "plants";
  document.body.dataset.category = category;
  document.getElementById("catalog-title").textContent = isPlant ? "图鉴 — 植物" : "图鉴 — 僵尸";
  document.getElementById("scope-note").textContent = isPlant ? "收录植物基础属性与能力" : "按卡牌编号浏览僵尸特性";
  document.getElementById("card-count").textContent = `${currentItems().length} 张`;
  for (const button of document.querySelectorAll(".category-button")) {
    const active = button.dataset.category === category;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  renderGrid();
  renderDetail();
}

function selectCard(card) {
  selectedIds[category] = card.id;
  renderGrid();
  renderDetail();
  if (window.matchMedia("(max-width: 700px)").matches) {
    returnFocus = grid.querySelector(`[data-card-id="${card.id}"]`);
    detailPanel.setAttribute("role", "dialog");
    detailPanel.setAttribute("aria-modal", "true");
    document.body.classList.add("details-open");
    closeDetail.focus();
  }
}

function closeMobileDetail() {
  document.body.classList.remove("details-open");
  detailPanel.removeAttribute("aria-modal");
  detailPanel.setAttribute("role", "complementary");
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

for (const button of document.querySelectorAll(".category-button")) {
  button.addEventListener("click", () => {
    if (document.body.classList.contains("details-open")) closeMobileDetail();
    category = button.dataset.category;
    renderCategory();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

closeDetail.addEventListener("click", closeMobileDetail);
detailPanel.addEventListener("click", (event) => {
  if (event.target === detailPanel && document.body.classList.contains("details-open")) closeMobileDetail();
});
document.addEventListener("keydown", (event) => {
  if (!document.body.classList.contains("details-open")) return;
  if (event.key === "Escape") {
    closeMobileDetail();
    return;
  }
  if (event.key === "Tab") {
    const focusable = [...detailPanel.querySelectorAll("button:not([disabled])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

renderCategory();
