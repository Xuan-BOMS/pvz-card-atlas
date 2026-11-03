const catalog = window.PVZ_CATALOG;
const grid = document.getElementById("catalog-grid");
const detailPanel = document.getElementById("detail-panel");
const closeDetail = document.getElementById("close-detail");
const selectedIds = { plants: 0, zombies: 62 };
const variantIndex = { 91: 0 };
const oneTimePlantIds = new Set([2, 4, 12, 14, 15, 17, 19, 20, 27, 35, 200, 206, 207]);
let category = "plants";
let returnFocus = null;

function imagePath(card, selectedVariant = 0) {
  const file = card.variants
    ? `SEED_PACKET_${card.id}_MOUND_LEVEL_${selectedVariant}.PNG`
    : `SEED_PACKET_${String(card.id).padStart(2, "0")}.PNG`;
  return window.PVZ_IMAGE_DATA?.[file] || `./assets/cards/${file}`;
}

function currentItems() {
  return catalog[category];
}

function getSelected() {
  return currentItems().find((card) => card.id === selectedIds[category]) || currentItems()[0];
}

function getCardName(card) {
  return window.PVZ_GAME_STRINGS?.[card.en]?.name || card.name;
}

function getCardDescription(card) {
  return window.PVZ_GAME_STRINGS?.[card.en]?.description || "";
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
  const hitsPerTarget = profile.hitsPerTarget ?? 1;
  const dps = hits.map((damage) => damage * hitsPerTarget / profile.interval);
  const peaDps = catalog.dpsProfiles[0].damage / catalog.dpsProfiles[0].interval;
  const formatRange = (values, formatter) => values[0] === values[1]
    ? formatter(values[0])
    : `${formatter(values[0])}–${formatter(values[1])}`;
  return {
    value: formatRange(dps, formatNumber),
    ratio: formatRange(dps.map((value) => value / peaDps), formatNumber)
  };
}

function getCardCostLabel(card) {
  if (category === "plants") {
    const cost = getPlantSun(card);
    return cost === "复制目标" ? "复制" : String(cost);
  }
  const cost = getZombieCost(card);
  if (cost !== null) return String(cost);
  return card.id === 91 ? "满级" : "—";
}

function addCardFace(parent, card, costLabel, selectedVariant = 0, imageId = "") {
  parent.replaceChildren();
  const face = addText(parent, "span", "card-face", "");
  const image = document.createElement("img");
  if (imageId) image.id = imageId;
  image.src = imagePath(card, selectedVariant);
  image.alt = `${getCardName(card)}卡图`;
  image.loading = imageId ? "eager" : "lazy";
  image.width = 200;
  image.height = 280;
  face.append(image);
  addText(face, "span", "card-cost", costLabel);
  return image;
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

    addCardFace(button, card, getCardCostLabel(card), variantIndex[card.id] || 0);
    addText(button, "span", "card-name", getCardName(card));
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
    button.textContent = String(level + 1);
    button.setAttribute("aria-label", `墓堆等级 ${level + 1}`);
    button.addEventListener("click", () => {
      variantIndex[card.id] = level;
      renderGrid();
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
  document.getElementById("detail-name").textContent = getCardName(card);
  document.getElementById("detail-en").textContent = card.en;
  document.getElementById("detail-id").textContent = `#${card.id}`;

  addCardFace(
    document.getElementById("detail-art-frame"),
    card,
    getCardCostLabel(card),
    variantIndex[card.id] || 0,
    "detail-art"
  );

  const zombieStats = !isPlant ? catalog.zombieStats[card.id] : null;
  const zombieSpeed = !isPlant ? catalog.zombieSpeeds[card.id] : null;
  const zombieMound = !isPlant && card.id === 91 ? catalog.zombieMoundProfiles[variantIndex[card.id] || 0] : null;
  const zombieCost = !isPlant ? getZombieCost(card) : null;
  const health = zombieStats ? getZombieHealth(card, zombieStats) : null;
  const dps = isPlant ? getDps(card) : null;
  document.getElementById("detail-cost-label").textContent = isPlant ? "阳光花费" : "脑光花费";
  document.getElementById("detail-cost-value").textContent = isPlant
    ? String(getPlantSun(card))
    : card.id === 91
      ? zombieCost === null ? "已满级" : String(zombieCost)
      : zombieCost === null ? "未收录" : String(zombieCost);
  document.getElementById("detail-recharge").textContent = isPlant
    ? getPlantRecharge(card)
    : catalog.zombieRecharges?.[card.id] ?? "未收录";

  const stats = document.getElementById("stat-list");
  stats.replaceChildren();
  if (isPlant) {
    if (card.damage && card.damage !== "无直接伤害" && card.damage !== "不攻击僵尸") {
      addStat(stats, /\d/.test(card.damage) || card.singleDamage !== undefined || dps ? "伤害" : "效果", card.damage);
    }
    if (dps) addStat(stats, "每秒伤害", `${dps.value}（${dps.ratio} 豆）`);
    if (oneTimePlantIds.has(card.id)) {
      addStat(stats, "用法", "一次性");
    } else if (card.attackInterval !== "—" && !/一次性|触发后一次|触发后生效|被吃后触发|布置后启动|产阳|产币|自动拾取|按目标触发|受攻击触发|复制目标/.test(card.attackInterval)) {
      addStat(stats, "攻击间隔", card.attackInterval);
    }
    addStat(stats, "生命值", card.health);
  } else {
    addStat(stats, "生命值", health ?? "未收录");
    if (zombieStats?.health?.armor) addStat(stats, "防具强度", zombieStats.health.armor);
    if (zombieSpeed) addStat(stats, "速度", [zombieSpeed.value, zombieSpeed.unit].filter(Boolean).join(" "));
    if (zombieSpeed?.note) addStat(stats, "速度变化", zombieSpeed.note);
    if (zombieMound) {
      addStat(stats, "墓堆等级", String((variantIndex[card.id] || 0) + 1));
      addStat(stats, "召唤单位", zombieMound.summon);
      addStat(stats, "首次召唤", zombieMound.firstInterval);
      addStat(stats, "后续间隔", zombieMound.interval);
    }
  }
  document.getElementById("ability-title").textContent = "描述";
  document.getElementById("detail-attack").hidden = true;
  document.getElementById("detail-attack").textContent = "";
  document.getElementById("detail-ability").textContent = getCardDescription(card);
  renderVariants(card);
}

function getZombieCost(card) {
  if (card.id === 91) {
    const moundCosts = [50, 100, 200, 300, 450];
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
