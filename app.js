const catalog = window.PVZ_CATALOG;
const grid = document.getElementById("catalog-grid");
const detailPanel = document.getElementById("detail-panel");
const closeDetail = document.getElementById("close-detail");
const selectedIds = { plants: 0, zombies: 62 };
const variantIndex = { 91: 0 };
const oneTimePlantIds = new Set([2, 4, 12, 14, 15, 17, 19, 20, 27, 35, 200, 206, 207]);
const specialMechanisms = {
  plants: {
    11: "吞噬二级及以上的召唤墓碑需要消耗 2 个墓碑吞。",
    18: "位于第一路或第五路时，会额外发射一颗豌豆。",
    200: "场上有多只僵尸时，会优先冻结火把僵尸。"
  },
  zombies: {
    89: "本体生命值降至 135 以下时，会碾压植物。",
    93: "倒计时结束后（约走至第三列），接触植物时会自爆，造成 301 点伤害。",
    94: "入场时记录场上所有僵尸；倒计时结束后，复活其中已死亡的僵尸。本体生命值恢复至原值的 2/3，防具生命值恢复至原值的 1/2，最多复活 15 只。"
  }
};
let category = "plants";
let returnFocus = null;

function imagePath(card, selectedVariant = 0) {
  const file = card.variants
    ? `SEED_PACKET_${card.id}_MOUND_LEVEL_${selectedVariant}.PNG`
    : `SEED_PACKET_${String(card.id).padStart(2, "0")}.PNG`;
  return window.PVZ_IMAGE_DATA?.[file] || `./assets/cards/${file.replace(/\.PNG$/, ".webp")}`;
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

function getSpecialMechanism(card) {
  return specialMechanisms[category][card.id] || "";
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

function getCardState(card) {
  return catalog.cardStates[card.id]?.[variantIndex[card.id] || 0];
}

function getDps(card) {
  const profile = getCardState(card)?.dps || catalog.dpsProfiles[card.id];
  if (!profile) return null;
  const hits = Array.isArray(profile.damage) ? profile.damage : [profile.damage];
  const intervals = Array.isArray(profile.interval) ? profile.interval : [profile.interval];
  const hitsPerTarget = profile.hitsPerTarget ?? 1;
  const expectedDamage = profile.probabilities
    ? hits.reduce((sum, damage, index) => sum + damage * profile.probabilities[index], 0)
    : hits.reduce((sum, damage) => sum + damage, 0) / hits.length;
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const dps = expectedDamage * hitsPerTarget / averageInterval;
  const peaInterval = catalog.dpsProfiles[0].interval;
  const peaDps = catalog.dpsProfiles[0].damage / (Array.isArray(peaInterval) ? (peaInterval[0] + peaInterval[1]) / 2 : peaInterval);
  return {
    value: formatNumber(dps),
    ratio: Number((dps / peaDps).toFixed(2)).toString()
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
  image.alt = `${getCardName(card)}卡图`;
  image.loading = imageId ? "eager" : "lazy";
  image.decoding = "async";
  image.width = 200;
  image.height = 280;
  image.src = imagePath(card, selectedVariant);
  face.append(image);
  addText(face, "span", "card-cost", costLabel);
  return image;
}

function renderGrid() {
  grid.replaceChildren();
  for (const card of currentItems()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "almanac-card";
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

function updateGridSelection(card, updateFace = false) {
  for (const button of grid.children) {
    const active = button.dataset.cardId === String(card.id);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
    if (active && updateFace) {
      button.querySelector("img").src = imagePath(card, variantIndex[card.id] || 0);
      button.querySelector(".card-cost").textContent = getCardCostLabel(card);
    }
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
  const states = catalog.cardStates[card.id];
  const variants = states || card.variants;
  if (!variants) {
    list.hidden = true;
    return;
  }
  list.hidden = false;
  const label = states ? category === "plants" ? "植物状态" : "僵尸状态" : "墓堆等级";
  addText(list, "span", "variant-label", label);
  variants.forEach((variant, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-button";
    const active = (variantIndex[card.id] || 0) === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = states ? variant.label : String(variant + 1);
    button.setAttribute("aria-label", `${label} ${button.textContent}`);
    button.addEventListener("click", () => {
      variantIndex[card.id] = index;
      updateGridSelection(card, true);
      renderDetail();
      list.querySelectorAll("button")[index].focus();
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

  const cardState = getCardState(card);
  const zombieStats = !isPlant ? catalog.zombieStats[card.id] : null;
  const zombieSpeed = !isPlant ? cardState?.speed || catalog.zombieSpeeds[card.id] : null;
  const zombieMound = !isPlant && card.id === 91 ? catalog.zombieMoundProfiles[variantIndex[card.id] || 0] : null;
  const zombieCost = !isPlant ? getZombieCost(card) : null;
  const health = zombieStats ? getZombieHealth(card, zombieStats) : null;
  const dps = isPlant ? getDps(card) : null;
  const production = catalog.productionProfiles[category][card.id];
  document.getElementById("detail-cost-label").textContent = isPlant ? "阳光花费" : "脑光花费";
  document.getElementById("detail-cost-value").textContent = isPlant
    ? String(getPlantSun(card))
    : card.id === 91
      ? zombieCost === null ? "已满级" : String(zombieCost)
      : zombieCost === null ? "未收录" : String(zombieCost);
  document.getElementById("detail-recharge").textContent = isPlant
    ? getPlantRecharge(card)
    : catalog.zombieRecharges?.[card.id] ?? "未收录";
  const openingRecharge = getOpeningRecharge(card);
  document.getElementById("detail-opening-recharge").textContent = openingRecharge === null
    ? "未收录"
    : `${formatNumber(openingRecharge)} 秒`;
  const suddenDeathRecharge = catalog.suddenDeathRecharges[card.id];
  document.getElementById("detail-sudden-death-recharge").textContent = suddenDeathRecharge === null
    ? "停用"
    : suddenDeathRecharge === undefined ? "未收录" : `${formatNumber(suddenDeathRecharge)} 秒`;

  const stats = document.getElementById("stat-list");
  stats.replaceChildren();
  if (isPlant) {
    const damage = cardState?.damage ?? card.damage;
    if (damage && damage !== "无直接伤害" && damage !== "不攻击僵尸") {
      addStat(stats, /\d/.test(damage) || card.singleDamage !== undefined || dps ? "伤害" : "效果", damage);
    }
    if (dps) addStat(stats, "每秒伤害", `${dps.value}（${dps.ratio} 豆）`);
    if (oneTimePlantIds.has(card.id)) {
      addStat(stats, "用法", "一次性");
    } else if (card.attackInterval !== "—" && !/一次性|触发后一次|触发后生效|被吃后触发|布置后启动|产阳|产币|自动拾取|按目标触发|受攻击触发|复制目标/.test(card.attackInterval)) {
      addStat(stats, "攻击间隔", card.attackInterval);
    }
    addStat(stats, "生命值", cardState?.health ?? card.health);
  } else {
    addStat(stats, "生命值", health ?? "未收录");
    if (zombieStats?.health?.armor) addStat(stats, "防具强度", zombieStats.health.armor);
    const zombieDps = getZombieDps(card);
    if (zombieDps !== null) addStat(stats, "每秒伤害", zombieDps);
    if (zombieStats?.healingPerSecond !== undefined) addStat(stats, "每秒治疗", formatNumber(zombieStats.healingPerSecond));
    if (zombieStats?.attackInterval) addStat(stats, "攻击间隔", zombieStats.attackInterval);
    if (zombieSpeed?.phases) {
      for (const phase of zombieSpeed.phases) {
        addStat(stats, phase.label, phase.unit ? `${phase.value} ${phase.unit}` : phase.value);
      }
    } else if (zombieSpeed) {
      addStat(stats, "速度", [zombieSpeed.value, zombieSpeed.unit].filter(Boolean).join(" "));
    }
    if (zombieSpeed?.note) addStat(stats, "速度变化", zombieSpeed.note);
    if (zombieMound) {
      addStat(stats, "墓堆等级", String((variantIndex[card.id] || 0) + 1));
      addStat(stats, "召唤单位", zombieMound.summon);
      addStat(stats, "首次召唤", zombieMound.firstInterval);
      addStat(stats, "后续间隔", zombieMound.interval);
    }
  }
  if (production) {
    addStat(stats, isPlant ? "阳光生产间隔" : "脑光生产间隔", production.interval);
    const amount = production.amount || production.amounts?.[variantIndex[card.id] || 0];
    if (amount) addStat(stats, isPlant ? "单次阳光产量" : "单次脑光产量", amount);
  }
  document.getElementById("ability-title").textContent = "描述";
  document.getElementById("detail-attack").hidden = true;
  document.getElementById("detail-attack").textContent = "";
  document.getElementById("detail-ability").textContent = getCardDescription(card);
  const mechanism = getSpecialMechanism(card);
  document.getElementById("detail-mechanism").textContent = mechanism;
  document.getElementById("mechanism-section").hidden = !mechanism;
  renderVariants(card);
}

function getZombieDps(card) {
  const damagePerSecond = catalog.zombieStats[card.id]?.damagePerSecond;
  if (damagePerSecond !== undefined) return formatNumber(damagePerSecond);
  const profile = catalog.zombieEatProfiles[card.id];
  if (profile === null) return null;
  if (!profile) return `${catalog.zombieEatDpsBase}（啃食）`;
  return profile.map(({ multiplier, state }) =>
    `${formatNumber(catalog.zombieEatDpsBase * multiplier)}（${state}）`
  ).join(" / ");
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

function getOpeningRecharge(card) {
  const group = category === "plants" ? "plants" : "zombies";
  const overrides = catalog.openingRechargeOverrides[group];
  if (Object.hasOwn(overrides, card.id)) return overrides[card.id];
  const rechargeText = category === "plants" ? getPlantRecharge(card) : catalog.zombieRecharges?.[card.id];
  const recharge = Number.parseFloat(rechargeText);
  return catalog.openingRechargeDefaults[String(recharge)] ?? null;
}

function getZombieHealth(card, stats) {
  const health = stats.health;
  if (card.id === 91) return health.levels[variantIndex[card.id] || 0];
  return getCardState(card)?.health ?? health.value;
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
  updateGridSelection(card);
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
const zombieBackground = window.PVZ_IMAGE_DATA?.["zombie-background.webp"];
if (zombieBackground) {
  const preloadBackground = new Image();
  preloadBackground.src = zombieBackground;
}
