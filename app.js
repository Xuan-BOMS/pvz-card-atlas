const catalog = window.PVZ_CATALOG;
const grid = document.getElementById("catalog-grid");
const detailPanel = document.getElementById("detail-panel");
const closeDetail = document.getElementById("close-detail");
const selectedIds = { plants: 0, zombies: 62 };
const variantIndex = { 91: 0 };
let category = "plants";
let returnFocus = null;

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

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getDps(card) {
  const profile = catalog.dpsProfiles[card.id];
  if (!profile) return null;
  const hits = Array.isArray(profile.damage) ? profile.damage : [profile.damage, profile.damage];
  const dps = hits.map((damage) => damage / profile.interval);
  const peaDps = catalog.dpsProfiles[0].damage / catalog.dpsProfiles[0].interval;
  const formatRange = (values, formatter) => values[0] === values[1]
    ? formatter(values[0])
    : `${formatter(values[0])}–${formatter(values[1])}`;
  return {
    value: formatRange(dps, formatNumber),
    ratio: formatRange(dps.map((value) => value / peaDps), formatNumber)
  };
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

    const zombieStats = category === "zombies" ? catalog.zombieStats[card.id] : null;
    const zombieHealth = zombieStats ? getZombieHealth(card, zombieStats) : null;
    const plantSun = category === "plants" ? getPlantSun(card) : null;
    const zombieCost = category === "zombies" ? getZombieCost(card) : null;
    const meta = category === "plants"
      ? plantSun === "复制目标" ? "复制目标属性" : `${plantSun} 阳 · ${card.health} 血`
      : card.id === 91
        ? `升级 ${zombieCost === null ? "满级" : `${zombieCost} 脑`} · ${zombieHealth} 血`
        : `${zombieCost ?? "—"} 脑 · ${zombieHealth ?? "—"} 血`;
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

  const zombieStats = !isPlant ? catalog.zombieStats[card.id] : null;
  const zombieSpeed = !isPlant ? catalog.zombieSpeeds[card.id] : null;
  const zombieCost = !isPlant ? getZombieCost(card) : null;
  const health = zombieStats ? getZombieHealth(card, zombieStats) : null;
  const dps = isPlant ? getDps(card) : null;
  document.getElementById("detail-primary-label").textContent = isPlant
    ? dps ? "输出" : card.singleDamage ? "单次伤害" : "伤害"
    : "脑光消耗";
  document.getElementById("detail-primary-value").textContent = isPlant
    ? dps ? dps.value : card.singleDamage ?? card.damage ?? "—"
    : card.id === 91
      ? zombieCost === null ? "已满级" : `${zombieCost} 脑光`
      : zombieCost === null ? "未收录" : `${zombieCost} 脑光`;
  const reference = document.getElementById("detail-primary-ref");
  reference.textContent = dps ? `${dps.ratio} 豆` : "";
  reference.hidden = !dps;

  const plantSun = isPlant ? getPlantSun(card) : null;
  document.getElementById("detail-secondary-label").textContent = isPlant ? "阳光消耗" : "行动速度";
  document.getElementById("detail-secondary-value").textContent = isPlant
    ? String(plantSun)
    : zombieSpeed ? [zombieSpeed.value, zombieSpeed.unit].filter(Boolean).join(" ") : "未收录";
  document.getElementById("detail-health").textContent = isPlant ? card.health : health ?? "未收录";
  document.getElementById("detail-role").textContent = isPlant ? card.role : card.type;

  const stats = document.getElementById("stat-list");
  stats.replaceChildren();
  if (isPlant) {
    if (dps) addStat(stats, "单发伤害", card.damage);
    else if (card.damage) addStat(stats, "攻击效果", card.damage);
    addStat(stats, "攻击间隔", card.attackInterval);
    addStat(stats, "布置间隔", getPlantRecharge(card));
  } else {
    if (zombieStats?.health?.parts) addStat(stats, "生命构成", zombieStats.health.parts);
    if (zombieSpeed?.note) addStat(stats, "行动阶段", zombieSpeed.note);
    if (card.id === 91) addStat(stats, "墓堆等级", String(variantIndex[card.id] || 0));
  }
  document.getElementById("ability-title").textContent = isPlant ? "攻击与能力" : "僵尸特性";
  document.getElementById("detail-attack").hidden = !isPlant;
  document.getElementById("detail-attack").textContent = isPlant ? card.attack : "";
  document.getElementById("detail-ability").textContent = isPlant ? card.ability : card.feature;
  renderVariants(card);
}

function getZombieCost(card) {
  if (card.id === 91) {
    const moundCosts = [100, 200, 300, 450, null];
    return moundCosts[variantIndex[card.id] || 0];
  }
  return catalog.zombieCosts[card.id] ?? null;
}

function getPlantSun(card) {
  return card.sun === null ? "复制目标" : catalog.plantCosts[card.id] ?? card.sun;
}

function getPlantRecharge(card) {
  return catalog.plantRecharges[card.id] ?? card.recharge;
}

function getZombieHealth(card, stats) {
  const health = stats.health;
  if (card.id === 91) return health.levels[variantIndex[card.id] || 0];
  return health.value;
}

function renderCategory() {
  const isPlant = category === "plants";
  document.body.dataset.category = category;
  document.getElementById("catalog-title").textContent = isPlant ? "图鉴 — 植物" : "图鉴 — 僵尸";
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
