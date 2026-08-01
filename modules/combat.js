// ============================================================
// COMBAT MODULE — Бой: оружие, броня, естественное снаряжение
// ============================================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ БОЯ =====
let armorSlots = [[], [], [], [], []];
let currentArmorSlot = 0;

let weaponsData = [];
let propertiesData = {};

const MAX_WEAPON_SLOTS = 5;
let weaponSlots = [null, null, null, null, null];
let currentWeaponSlot = 0;
let wmBaseDamage = "";
let wmBaseDamageType = "";
let wmCurrentProperties = [];

let armorData = [];
let armorPropertiesData = [];
let armorSetsData = [];
let armorCategoriesData = {};

const VISOR_ICON_DOWN = 'icons/Helmet_visor_down.svg';
const VISOR_ICON_UP   = 'icons/Helmet_visor_up.svg';

const ARMOR_STATES = [
  { key: 'normal', label: 'Нормальное', color: 'linear-gradient(135deg,#27ae60,#1e8449)', border: '#27ae60' },
  { key: 'damaged', label: 'Повреждённое', color: 'linear-gradient(135deg,#e67e22,#d35400)', border: '#e67e22' },
  { key: 'heavily_damaged', label: 'Сильно повреждённое', color: 'linear-gradient(135deg,#e74c3c,#c0392b)', border: '#e74c3c' }
];

const ARMOR_SLOT_NAMES = {
  'helmet': 'Шлем',
  'chest': 'Кираса',
  'belt': 'Пояс',
  'legs': 'Поножи',
  'feet': 'Обувь',
  'accessory': 'Аксессуар',
  'gloves': 'Перчатки',
  'shoulders': 'Наплечники',
  'arms': 'Наручи',
  'shield': 'Щит'
};

// ===== ЩИТ =====
let shieldActive = false;

function hasShield() {
  return character.armor.some(a => a.slot === 'shield' && a.name && a.state !== 'heavily_damaged');
}

function getShieldBonus() {
  const shield = character.armor.find(a => a.slot === 'shield' && a.name && a.state !== 'heavily_damaged');
  return shield ? (shield.ac || 0) : 0;
}

function toggleShield() {
  shieldActive = !shieldActive;
  updateShieldButton();
  recalcArmorClass();
  recalcAll();
  syncArmorToCharacter();
}

function updateShieldButton() {
  const btn = document.getElementById('shieldToggleBtn');
  if (!btn) return;
  const has = hasShield();
  btn.style.display = has ? 'flex' : 'none';
  if (has) {
    btn.classList.toggle('active', shieldActive);
    const bonus = getShieldBonus();
    btn.title = shieldActive ? `Щит активен (+${bonus} КД)` : `Щит (+${bonus} КД) — нажмите для активации`;
  }
}

// ===== ЕСТЕСТВЕННОЕ СНАРЯЖЕНИЕ =====
let naturalEquipmentData = { weapons: {}, armor: {} };
let naturalWeapons = [];
let naturalArmors = [];
let currentNaturalWeaponIndex = -1;
let currentNaturalArmorIndex = -1;
let _naturalEquipmentLoaded = false;
let _naturalEquipmentPromise = null;

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadWeaponData() {
  try {
    const wRes = await fetch('data/weapons.json');
    const wData = await wRes.json();
    weaponsData = wData.weapons || [];

    const pRes = await fetch('data/properties.json');
    const pData = await pRes.json();
    propertiesData = pData.properties || {};
  } catch (e) {
    console.error('Ошибка загрузки данных оружия:', e);
  }
}

async function loadArmorData() {
  try {
    const res = await fetch('data/armor.json');
    const data = await res.json();
    armorData = data.armors || data.armor || [];
    armorPropertiesData = data.properties || [];
    armorSetsData = data.sets || [];
    armorCategoriesData = data.categories || {};
  } catch (e) {
    console.error('Ошибка загрузки armor.json:', e);
  }
}

function loadNaturalEquipment() {
  if (_naturalEquipmentPromise) return _naturalEquipmentPromise;

  _naturalEquipmentPromise = fetch('data/natural_equipment.json')
    .then(res => res.json())
    .then(data => {
      naturalEquipmentData.weapons = data.natural_weapons || {};
      naturalEquipmentData.armor = data.natural_armor || {};
      _naturalEquipmentLoaded = true;
      console.log('[NaturalEquipment] Загружено:',
        Object.keys(naturalEquipmentData.weapons).length, 'шаблонов оружия,',
        Object.keys(naturalEquipmentData.armor).length, 'шаблонов брони');
    })
    .catch(e => {
      console.error('[NaturalEquipment] Ошибка загрузки natural_equipment.json:', e);
      naturalEquipmentData.weapons = {};
      naturalEquipmentData.armor = {};
      _naturalEquipmentLoaded = true;
    });

  return _naturalEquipmentPromise;
}

// ===== ОРУЖИЕ =====
function setupWeaponAutocomplete() {
  const input = document.getElementById('wmName');
  const dropdown = document.getElementById('wmNameDropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    if (!val) { dropdown.classList.remove('active'); return; }

    const matches = weaponsData.filter(w => w.name.toLowerCase().includes(val));
    dropdown.innerHTML = matches.map(w =>
      `<div class="autocomplete-item" onclick="selectWeaponById(${w.id})">${escapeHtml(w.name)}</div>`
    ).join('');
    dropdown.classList.toggle('active', matches.length > 0);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function selectWeaponById(id) {
  const weapon = weaponsData.find(w => w.id === id);
  if (!weapon) return;

  document.getElementById('wmName').value = weapon.name;
  document.getElementById('wmNameDropdown').classList.remove('active');

  wmBaseDamage = weapon.damage || "";
  wmBaseDamageType = weapon.damage_type || "";

  document.getElementById('wmDamage').value = wmBaseDamage + (wmBaseDamageType ? " " + wmBaseDamageType : "");
  document.getElementById('wmCrit').value = weapon.crit_chance || "20";
  document.getElementById('wmEffRange').value = weapon.range_effective ? `${weapon.range_effective} фт. (≈${(weapon.range_effective * 0.3).toFixed(1)} м.)` : "";
  document.getElementById('wmMaxRange').value = weapon.range_max ? `${weapon.range_max} фт. (≈${(weapon.range_max * 0.3).toFixed(1)} м.)` : "";
  document.getElementById('wmCategory').value = weapon.category || "";
  document.getElementById('wmSubcategory').value = (weapon.subcategory || "") + (weapon.group ? " / " + weapon.group : "");
  const dur = weapon.durability !== undefined ? String(weapon.durability) : '';
  if (dur.includes('/')) {
    const [cur, max] = dur.split('/').map(s => s.trim());
    document.getElementById('wmDurabilityCurrent').value = cur;
    document.getElementById('wmDurabilityMax').value = max;
  } else {
    document.getElementById('wmDurabilityCurrent').value = dur;
    document.getElementById('wmDurabilityMax').value = dur;
  }
  document.getElementById('wmRegion').value = weapon.region || "";
  document.getElementById('wmUpgradeSlots').value = weapon.upgrade_slots ? weapon.upgrade_slots.join(", ") : "";
  document.getElementById('wmTechniques').value = weapon.techniques ? weapon.techniques.join(", ") : "";

  wmCurrentProperties = weapon.properties || [];
  renderWeaponProperties(wmCurrentProperties);

  let mods = [];
  if (weapon.techniques) mods.push("Техники: " + weapon.techniques.join(", "));
  if (weapon.upgrade_slots) mods.push("Слоты улучшений: " + weapon.upgrade_slots.join(", "));
  document.getElementById('wmModifications').value = mods.join("\n");

  recalcWeaponHitBonus();
  recalcWeaponDamage();
  updateWeaponSlotStyle(currentWeaponSlot);
  syncWeaponSlotsToCharacter();
}

function renderWeaponProperties(props) {
  const container = document.getElementById('wmPropList');
  if (!container) return;
  container.innerHTML = '';
  let descParts = [];

  props.forEach((prop, index) => {
    let key, bracket = "";
    if (typeof prop === 'string') {
      key = prop;
    } else if (prop && prop.name) {
      key = prop.name;
      bracket = prop.bracket ? `[${prop.bracket}]` : "";
    }

    const propData = propertiesData[key];
    const displayName = propData ? propData.name.replace('[]', bracket) : key;

    const badge = document.createElement('span');
    badge.className = 'weapon-prop-badge';
    badge.innerHTML = `<span class="wp-dot"></span><span class="wp-text">${escapeHtml(displayName)}</span>`;
    badge.onclick = () => {
      container.querySelectorAll('.weapon-prop-badge').forEach(b => b.classList.remove('wp-selected'));
      badge.classList.add('wp-selected');
      const desc = propData ? propData.effect : "Нет описания";
      document.getElementById('wmPropDesc').value = `${displayName}:\n${desc}`;
    };
    container.appendChild(badge);

    if (propData) {
      descParts.push(`${displayName}: ${propData.effect}`);
    }
  });

  if (descParts.length > 0) {
    document.getElementById('wmPropDesc').value = descParts.join("\n\n");
  }
}

function recalcWeaponHitBonus() {
  const scale = document.getElementById('wmScale').value;
  const prof = document.getElementById('wmProf').value;
  const field = document.getElementById('wmHitBonus');

  if (!field) return;

  if (!scale || !prof) {
    field.value = "—";
    field.className = "field-input flex-center bold";
    return;
  }

  const mods = {
    str: abilityModifier(Number(character.abilities.str) || 10),
    dex: abilityModifier(Number(character.abilities.dex) || 10),
    con: abilityModifier(Number(character.abilities.con) || 10),
    int: abilityModifier(Number(character.abilities.int) || 10),
    wis: abilityModifier(Number(character.abilities.wis) || 10),
    cha: abilityModifier(Number(character.abilities.cha) || 10)
  };

  const mod = mods[scale] || 0;
  const pb = proficiencyBonus(Number(character.level) || 1);
  const profVal = getProficiencyValue(prof, pb);
  const total = mod + profVal;

  field.value = (total >= 0 ? "+" : "") + total;
  field.className = "field-input flex-center bold " + (total > 0 ? "val-positive" : total < 0 ? "val-negative" : "val-zero");
}

function getProficiencyValue(profText, profBonus) {
  const level = parseInt(profText) || 0;
  if (level === 0) return 0;
  if (level === 1) return Math.floor(profBonus / 2);
  if (level === 2) return profBonus;
  if (level === 3) return profBonus * 2;
  return 0;
}

function recalcWeaponDamage() {
  const scale = document.getElementById('wmScale').value;
  const prof = document.getElementById('wmProf').value;
  const field = document.getElementById('wmDamage');

  if (!wmBaseDamage || !field) return;
  if (!scale || !prof) {
    field.value = wmBaseDamage + (wmBaseDamageType ? " " + wmBaseDamageType : "");
    return;
  }

  const mods = {
    str: abilityModifier(Number(character.abilities.str) || 10),
    dex: abilityModifier(Number(character.abilities.dex) || 10),
    con: abilityModifier(Number(character.abilities.con) || 10),
    int: abilityModifier(Number(character.abilities.int) || 10),
    wis: abilityModifier(Number(character.abilities.wis) || 10),
    cha: abilityModifier(Number(character.abilities.cha) || 10)
  };

  const mod = mods[scale] || 0;
  const pb = proficiencyBonus(Number(character.level) || 1);
  const profVal = getProficiencyValue(prof, pb);
  const bonus = mod + profVal;

  let text = wmBaseDamage;
  if (bonus > 0) text += "+" + bonus;
  else if (bonus < 0) text += bonus;
  if (wmBaseDamageType) text += " " + wmBaseDamageType;

  field.value = text;
}

function switchWeaponSlot(index) {
  if (currentNaturalWeaponIndex >= 0) {
    currentNaturalWeaponIndex = -1;
    clearNaturalEquipmentStyles();
  } else {
    saveCurrentWeaponSlot();
  }

  // Reset select styling before loading new slot data
  const wmScale = document.getElementById('wmScale');
  const wmProf = document.getElementById('wmProf');
  if (wmScale) wmScale.classList.remove('has-value');
  if (wmProf) wmProf.classList.remove('has-value');
  if (currentNaturalArmorIndex >= 0) {
    currentNaturalArmorIndex = -1;
    document.querySelectorAll('#armorSlots .armor-slot-btn').forEach(btn => {
      if (btn.dataset.natural === 'true') btn.classList.remove('active');
    });
  }

  currentWeaponSlot = index;

  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  const data = weaponSlots[index];
  if (data) {
    loadWeaponSlotData(data);
  } else {
    clearWeaponFields();
  }
  updateWeaponSlotStyles();
  syncWeaponSlotsToCharacter();
}

function saveCurrentWeaponSlot() {
  if (currentNaturalWeaponIndex >= 0) return;

  const data = {
    name: document.getElementById('wmName').value,
    scale: document.getElementById('wmScale').value,
    prof: document.getElementById('wmProf').value,
    hitBonus: document.getElementById('wmHitBonus').value,
    damage: document.getElementById('wmDamage').value,
    crit: document.getElementById('wmCrit').value,
    effRange: document.getElementById('wmEffRange').value,
    maxRange: document.getElementById('wmMaxRange').value,
    category: document.getElementById('wmCategory').value,
    subcategory: document.getElementById('wmSubcategory').value,
    durabilityCurrent: document.getElementById('wmDurabilityCurrent').value,
    durabilityMax: document.getElementById('wmDurabilityMax').value,
    region: document.getElementById('wmRegion').value,
    upgradeSlots: document.getElementById('wmUpgradeSlots').value,
    techniques: document.getElementById('wmTechniques').value,
    propDesc: document.getElementById('wmPropDesc').value,
    modifications: document.getElementById('wmModifications').value,
    notes: document.getElementById('wmNotes').value,
    baseDamage: wmBaseDamage,
    baseDamageType: wmBaseDamageType,
    properties: wmCurrentProperties
  };

  const isEmpty = !data.name && !data.damage;
  weaponSlots[currentWeaponSlot] = isEmpty ? null : data;
  updateWeaponSlotStyles();
  syncWeaponSlotsToCharacter();
}

function loadWeaponSlotData(data) {
  document.getElementById('wmName').value = data.name || "";
  const wmScale = document.getElementById('wmScale');
  const wmProf = document.getElementById('wmProf');
  wmScale.value = data.scale || "";
  wmProf.value = data.prof || "";
  // If value doesn't match any option (including empty placeholder), reset to placeholder
  if (!data.scale) wmScale.selectedIndex = 0;
  if (!data.prof) wmProf.selectedIndex = 0;
  // Update visual state: has-value class only when actually selected
  wmScale.classList.toggle('has-value', !!data.scale);
  wmProf.classList.toggle('has-value', !!data.prof);
  document.getElementById('wmHitBonus').value = data.hitBonus || "—";
  document.getElementById('wmDamage').value = data.damage || "";
  document.getElementById('wmCrit').value = data.crit || "";
  document.getElementById('wmEffRange').value = data.effRange || "";
  document.getElementById('wmMaxRange').value = data.maxRange || "";
  document.getElementById('wmCategory').value = data.category || "";
  document.getElementById('wmSubcategory').value = data.subcategory || "";
  document.getElementById('wmDurabilityCurrent').value = data.durabilityCurrent || "";
  document.getElementById('wmDurabilityMax').value = data.durabilityMax || "";
  document.getElementById('wmRegion').value = data.region || "";
  document.getElementById('wmUpgradeSlots').value = data.upgradeSlots || "";
  document.getElementById('wmTechniques').value = data.techniques || "";
  document.getElementById('wmPropDesc').value = data.propDesc || "";
  document.getElementById('wmModifications').value = data.modifications || "";
  document.getElementById('wmNotes').value = data.notes || "";
  wmBaseDamage = data.baseDamage || "";
  wmBaseDamageType = data.baseDamageType || "";
  wmCurrentProperties = data.properties || [];
  renderWeaponProperties(wmCurrentProperties);
  recalcWeaponHitBonus();
  recalcWeaponDamage();
}

function clearWeaponFields() {
  ['wmName','wmDamage','wmCrit',
   'wmEffRange','wmMaxRange','wmCategory','wmSubcategory',
   'wmDurabilityCurrent','wmDurabilityMax',
   'wmRegion','wmUpgradeSlots','wmTechniques','wmPropDesc','wmModifications','wmNotes']
  .forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const wmScale = document.getElementById('wmScale');
  const wmProf = document.getElementById('wmProf');
  if (wmScale) { wmScale.selectedIndex = 0; wmScale.classList.remove('has-value'); }
  if (wmProf) { wmProf.selectedIndex = 0; wmProf.classList.remove('has-value'); }
  const hitBonus = document.getElementById('wmHitBonus');
  if (hitBonus) { hitBonus.value = "—"; hitBonus.className = "field-input flex-center bold"; }
  const propList = document.getElementById('wmPropList');
  if (propList) propList.innerHTML = "";
  wmBaseDamage = "";
  wmBaseDamageType = "";
  wmCurrentProperties = [];
}

function updateWeaponSlotStyles() {
  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach((el) => {
    if (el.dataset.natural === 'true') {
      el.classList.remove('filled');
      return;
    }
    const slotIndex = parseInt(el.dataset.slot);
    el.classList.toggle('filled', weaponSlots[slotIndex] !== null);
  });
}

function updateWeaponSlotStyle(index) {
  const slot = document.querySelector(`#weaponSlots .weapon-slot-btn[data-slot="${index}"]`);
  if (slot) slot.classList.add('filled');
}

function saveWeaponSlot() {
  saveCurrentWeaponSlot();
}

function clearWeaponSlot() {
  if (currentNaturalWeaponIndex >= 0) return;
  weaponSlots[currentWeaponSlot] = null;
  clearWeaponFields();
  updateWeaponSlotStyles();
  syncWeaponSlotsToCharacter();
}

function deleteWeaponSlot() {
  if (currentNaturalWeaponIndex >= 0) return;
  weaponSlots[currentWeaponSlot] = null;
  clearWeaponFields();
  updateWeaponSlotStyles();
  syncWeaponSlotsToCharacter();
}

function setupWeaponDurabilityListeners() {
  const cur = document.getElementById('wmDurabilityCurrent');
  const max = document.getElementById('wmDurabilityMax');
  if (!cur || !max) return;
  cur.addEventListener('input', () => {
    if (weaponSlots[currentWeaponSlot]) weaponSlots[currentWeaponSlot].durabilityCurrent = cur.value;
  });
  max.addEventListener('input', () => {
    if (weaponSlots[currentWeaponSlot]) weaponSlots[currentWeaponSlot].durabilityMax = max.value;
  });
}

function setupWeaponListeners() {
  const scale = document.getElementById('wmScale');
  const prof = document.getElementById('wmProf');
  if (!scale || !prof) return;

  scale.addEventListener('change', () => {
    scale.classList.toggle('has-value', !!scale.value);
    recalcWeaponHitBonus();
    recalcWeaponDamage();
  });
  prof.addEventListener('change', () => {
    prof.classList.toggle('has-value', !!prof.value);
    recalcWeaponHitBonus();
    recalcWeaponDamage();
  });
}
// ===== АВТОСОХРАНЕНИЕ ОРУЖИЯ =====
function setupWeaponAutoSave() {
  const weaponFields = [
    'wmName', 'wmScale', 'wmProf', 'wmDamage', 'wmCrit',
    'wmEffRange', 'wmMaxRange', 'wmCategory', 'wmSubcategory',
    'wmDurabilityCurrent', 'wmDurabilityMax',
    'wmRegion', 'wmUpgradeSlots', 'wmTechniques',
    'wmPropDesc', 'wmModifications', 'wmNotes'
  ];

  weaponFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debounce(() => {
        if (currentNaturalWeaponIndex < 0) {
          saveCurrentWeaponSlot();
          syncWeaponSlotsToCharacter();
        }
      }, 300));
    }
  });
}

function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

function syncWeaponSlotsToCharacter() {
  character.weaponSlots = JSON.parse(JSON.stringify(weaponSlots));
  character.currentWeaponSlot = currentWeaponSlot;
  character.currentNaturalWeaponIndex = currentNaturalWeaponIndex;
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}


function syncArmorToCharacter() {
  if (currentNaturalArmorIndex < 0) {
    armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  }
  character.armorSets = JSON.parse(JSON.stringify(armorSlots));
  character.shieldActive = shieldActive;
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}




// ===== БРОНЯ =====
function getArmorStateIndex(stateKey) {
  return ARMOR_STATES.findIndex(s => s.key === stateKey);
}

function cycleArmorState(btn) {
  const card = btn.closest('.armor-card');
  const newState = btn.dataset.state;
  card.querySelectorAll('.armor-state-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.state === newState);
  });
  const armorIndex = parseInt(card.dataset.armorIndex);
  if (character.armor[armorIndex]) {
    character.armor[armorIndex].state = newState;
    updateArmorCardVisuals(card, newState);
    recalcAll();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }
}

function updateArmorCardVisuals(card, state) {
  const stateInfo = ARMOR_STATES.find(s => s.key === state);
  if (!stateInfo) return;
  card.style.borderColor = stateInfo.border;
  card.style.background = stateInfo.color.replace('135deg', '180deg').replace(/#[0-9a-f]+/g, m => m + '15');
}

function getArmorPropertyInfo(propId) {
  return armorPropertiesData.find(p => p.id === propId);
}

function formatArmorProperties(props) {
  if (!props || props.length === 0) return '';
  return props.map(propId => {
    const propInfo = getArmorPropertyInfo(propId);
    return propInfo ? propInfo.name : propId;
  }).join(', ');
}

function getArmorSetInfo(setId) {
  return armorSetsData.find(s => s.id === setId);
}

function getArmorCategoryInfo(category) {
  return armorCategoriesData[category] || null;
}

function addArmorCard() {
  const list = document.getElementById('armorList');
  if (!list) return;
  const index = character.armor.length;

  const card = document.createElement('div');
  card.className = 'armor-card';
  card.dataset.armorIndex = index;

card.innerHTML = `
    <div class="armor-header">
      <div class="armor-autocomplete-wrap">
        <input type="text" class="field-input armor-name-input" placeholder="Название доспеха..." autocomplete="off">
        <div class="autocomplete-dropdown armor-dropdown"></div>
        <div class="armor-visor-wrap">
          <button class="visor-toggle-btn" onclick="toggleVisor(${index})" title="Подвижное забрало">
            <img src="${VISOR_ICON_DOWN}" class="visor-icon" alt="Забрало">
          </button>
        </div>
      </div>
      <div class="armor-actions">
        <div class="armor-states">
          <button class="armor-state-btn active" data-state="normal" onclick="cycleArmorState(this)" title="Нормальное"></button>
          <button class="armor-state-btn" data-state="damaged" onclick="cycleArmorState(this)" title="Повреждённое"></button>
          <button class="armor-state-btn" data-state="heavily_damaged" onclick="cycleArmorState(this)" title="Сильно повреждённое"></button>
        </div>
        <button class="btn btn-small btn-secondary" onclick="removeArmorCard(this)" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">🗑️</button>
      </div>
    </div>
    <div class="armor-fields">
      <div class="field-group">
        <label class="field-label">Слот</label>
        <input type="text" class="field-input armor-slot-display" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">Категория</label>
        <input type="text" class="field-input armor-category" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">КД</label>
        <input type="text" class="field-input armor-ac" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">Регион</label>
        <input type="text" class="field-input armor-region" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">Порог прочности</label>
        <input type="text" class="field-input armor-threshold" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">Прочность</label>
        <div class="durability-split" style="display:flex;align-items:center;gap:4px;">
          <input type="number" class="field-input armor-durability-current" placeholder="Тек." style="text-align:center;flex:1;">
          <span style="font-weight:700;user-select:none;">/</span>
          <input type="number" class="field-input armor-durability-max" placeholder="Макс." style="text-align:center;flex:1;">
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Бонус Ловкости</label>
        <input type="text" class="field-input armor-dex" readonly placeholder="—">
      </div>
      <div class="field-group">
        <label class="field-label">Набор</label>
        <input type="text" class="field-input armor-set" readonly placeholder="—">
      </div>
    </div>
    <div class="armor-description" style="margin-top:12px;padding:10px 12px;background:rgba(26,34,26,0.5);border-radius:8px;border:1px solid var(--border);display:none;">
      <div class="field-label" style="font-size:10px;margin-bottom:6px;">Описание</div>
      <div class="armor-desc-text" style="font-size:12px;color:var(--text-secondary);line-height:1.5;"></div>
    </div>
    <div style="margin-top:16px;">
      <div class="field-label" style="margin-bottom:10px;">Свойства доспеха</div>
      <div class="armor-prop-list weapon-prop-list" style="display:flex;flex-wrap:wrap;gap:10px;padding:4px 0;"></div>
    </div>
    <div class="field-group" style="margin-top:16px;">
      <label class="field-label">Описание свойств</label>
      <textarea class="field-input armor-prop-desc" rows="3" placeholder="Выберите свойства для просмотра..." style="min-height:80px;resize:vertical;"></textarea>
    </div>
    <div class="field-group" style="margin-top:12px;">
      <label class="field-label">Места улучшений</label>
      <input type="text" class="field-input upgrade-slots" readonly placeholder="—">
    </div>
  `;

  list.appendChild(card);

  const durCur = card.querySelector('.armor-durability-current');
  const durMax = card.querySelector('.armor-durability-max');
  if (durCur) durCur.addEventListener('input', () => {
    if (character.armor[index]) character.armor[index].durabilityCurrent = durCur.value;
    syncArmorToCharacter();
  });
  if (durMax) durMax.addEventListener('input', () => {
    if (character.armor[index]) character.armor[index].durabilityMax = durMax.value;
    syncArmorToCharacter();
  });

  const input = card.querySelector('.armor-name-input');
  const dropdown = card.querySelector('.armor-dropdown');
  setupArmorAutocomplete(input, dropdown, index);

  character.armor.push({ name: '', state: 'normal' });
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  recalcAll();
}

function setupArmorAutocomplete(input, dropdown, index) {
  let selectedIndex = -1;

  function renderDropdown(filter = '') {
    const options = armorData.filter(a => a.name && a.name.toLowerCase().includes(filter.toLowerCase()));
    dropdown.innerHTML = ''; selectedIndex = -1;
    if (options.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'autocomplete-item no-results'; noRes.textContent = 'Нет совпадений';
      dropdown.appendChild(noRes);
    } else {
      options.forEach((opt, idx) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        const slotName = ARMOR_SLOT_NAMES[opt.slot] || opt.slot || '';
        div.innerHTML = `<strong>${escapeHtml(opt.name)}</strong> <span style="color:var(--text-secondary);font-size:11px;">${slotName ? '• ' + slotName : ''} • КД ${opt.ac}</span>`;
        div.addEventListener('click', () => {
          input.value = opt.name;
          selectArmor(index, opt.id);
          dropdown.classList.remove('active');
        });
        dropdown.appendChild(div);
      });
    }
    dropdown.classList.add('active');
  }

  function updateSelection() {
    const items = dropdown.querySelectorAll('.autocomplete-item:not(.no-results)');
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', (e) => renderDropdown(e.target.value));
  input.addEventListener('focus', () => renderDropdown(input.value));
  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item:not(.no-results)');
    if (!dropdown.classList.contains('active')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, items.length - 1); updateSelection(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, -1); updateSelection(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (selectedIndex >= 0 && items[selectedIndex]) items[selectedIndex].click(); else if (items.length === 1) items[0].click(); }
    else if (e.key === 'Escape') dropdown.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active');
  });
}

function selectArmor(index, armorId) {
  const armor = armorData.find(a => a.id === armorId);
  if (!armor) return;

  const card = document.querySelector(`.armor-card[data-armor-index="${index}"]`);
  if (!card) return;

  card.querySelector('.armor-slot-display').value = ARMOR_SLOT_NAMES[armor.slot] || armor.slot || '';
  card.querySelector('.armor-category').value = armor.category || '';
  card.querySelector('.armor-ac').value = armor.ac !== undefined ? armor.ac : '';
  card.querySelector('.armor-region').value = armor.region || '';
  card.querySelector('.armor-threshold').value = armor.durability_threshold !== undefined ? armor.durability_threshold : '';

  const dur = armor.durability !== undefined ? String(armor.durability) : '';
  if (dur.includes('/')) {
    const [cur, max] = dur.split('/').map(s => s.trim());
    card.querySelector('.armor-durability-current').value = cur;
    card.querySelector('.armor-durability-max').value = max;
  } else {
    card.querySelector('.armor-durability-current').value = dur;
    card.querySelector('.armor-durability-max').value = dur;
  }

  const dexText = armor.dex_bonus_applies
    ? `+ ЛОВ (макс. +${armor.dex_bonus_max || 3})`
    : '—';
  card.querySelector('.armor-dex').value = dexText;

  let setText = '';
  if (armor.set_id) {
    const setInfo = getArmorSetInfo(armor.set_id);
    setText = setInfo ? `${setInfo.name} (${armor.set_slot_type === 'required' ? 'обяз.' : 'опц.'})` : `Набор #${armor.set_id}`;
  }
  card.querySelector('.armor-set').value = setText;

  const descDiv = card.querySelector('.armor-description');
  const descText = card.querySelector('.armor-desc-text');
  if (armor.description) {
    descText.textContent = armor.description;
    descDiv.style.display = 'block';
  } else {
    descDiv.style.display = 'none';
  }

  const propList = card.querySelector('.armor-prop-list');
  const propDesc = card.querySelector('.armor-prop-desc');
  propList.innerHTML = '';
  let descParts = [];

  (armor.properties || []).forEach((propId, idx) => {
    let key = propId;
    let bracket = "";
    if (typeof propId === 'string') {
      key = propId;
    } else if (propId && propId.name) {
      key = propId.name;
      bracket = propId.bracket ? `[${propId.bracket}]` : "";
    }

    const propData = getArmorPropertyInfo(key);
    const displayName = propData ? propData.name.replace('[]', bracket) : key;

    const badge = document.createElement('span');
    badge.className = 'weapon-prop-badge';
    badge.innerHTML = `<span class="wp-dot"></span><span class="wp-text">${escapeHtml(displayName)}</span>`;
    badge.onclick = () => {
      propList.querySelectorAll('.weapon-prop-badge').forEach(b => b.classList.remove('wp-selected'));
      badge.classList.add('wp-selected');
      const desc = propData ? propData.effect : "Нет описания";
      propDesc.value = `${displayName}:\n${desc}`;
    };
    propList.appendChild(badge);

    if (propData) {
      descParts.push(`${displayName}: ${propData.effect}`);
    }
  });

  if (descParts.length > 0) {
    propDesc.value = descParts.join("\n\n");
  } else {
    propDesc.value = "";
    propDesc.placeholder = "Выберите свойства для просмотра...";
  }

  card.querySelector('.upgrade-slots').value = armor.upgrade_slots ? armor.upgrade_slots.join(', ') : '';

  character.armor[index] = {
    name: armor.name,
    slot: armor.slot,
    category: armor.category,
    ac: armor.ac,
    region: armor.region,
    durability_threshold: armor.durability_threshold,
    durabilityCurrent: card.querySelector('.armor-durability-current').value,
    durabilityMax: card.querySelector('.armor-durability-max').value,
    dex_bonus_applies: armor.dex_bonus_applies,
    dex_bonus_max: armor.dex_bonus_max,
    properties: armor.properties || [],
    upgrade_slots: armor.upgrade_slots || [],
    set_id: armor.set_id,
    set_slot_type: armor.set_slot_type,
    description: armor.description,
    state: 'normal'
  };

    // --- Подвижное забрало ---
  if (armor.properties?.includes('movable_visor')) {
    character.armor[index].visorState = character.armor[index].visorState || 'down';
    applyVisorProperties(index);
    showVisorToggle(card, true);
    updateVisorButton(card, character.armor[index].visorState);
  } else {
    showVisorToggle(card, false);
  }

  card.querySelectorAll('.armor-state-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.state === 'normal');
  });
  updateArmorCardVisuals(card, 'normal');

  armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  updateArmorSlotStyles();

  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  updateShieldButton();
  recalcArmorClass();
  recalcAll();
}

function recalcArmorClass() {
  if (currentNaturalArmorIndex >= 0 && naturalArmors[currentNaturalArmorIndex]) {
    const armor = naturalArmors[currentNaturalArmorIndex];
    const mod = abilityModifier(Number(character.abilities[armor.ability]) || 10);
    const dexApplies = armor.dex_bonus_applies !== false;
    const dexMax = armor.dex_bonus_max !== null && armor.dex_bonus_max !== undefined ? armor.dex_bonus_max : null;
    const baseAc = (armor.ac_base || armor.acBase || 0);
    const pb = proficiencyBonus(Number(character.level) || 1);
    const profBonus = armor.prof_bonus ? pb : 0;
    let additiveBonus = 0;
    if (armor.is_additive) {
      const hasOtherNaturalArmor = naturalArmors.some((a, idx) =>
        idx !== currentNaturalArmorIndex && !a.is_additive
      );
      if (hasOtherNaturalArmor) {
        additiveBonus = armor.additive_bonus || 0;
      } else {
        armor.ac_base = armor.standalone_ac || 0;
      }
    }
    character._computedArmor = {
      baseAc: baseAc + profBonus + additiveBonus,
      dexApplies: dexApplies,
      dexMax: dexMax,
      isNatural: true
    };
    return;
  }

  let baseAc = 0;
  let otherAc = 0;
  let hasChestArmor = false;
  let chestDexApplies = true;
  let chestDexMax = null;
  let chestCategory = null;

  for (const armor of character.armor) {
    if (!armor.name || armor.state === 'heavily_damaged') continue;
    if (armor.slot === 'shield') continue; // щит считаем отдельно

    if (armor.slot === 'chest') {
      hasChestArmor = true;
      baseAc = armor.ac || 0;
      chestDexApplies = armor.dex_bonus_applies !== false;
      chestDexMax = armor.dex_bonus_max !== undefined ? armor.dex_bonus_max : null;
      chestCategory = armor.category;
    } else {
      otherAc += armor.ac || 0;
    }
  }

  if (!hasChestArmor) {
    baseAc = Number(character.combat?.baseAc) || 10;
    chestDexApplies = true;
    chestDexMax = null;
  }

  // Бонус щита
  let shieldBonus = 0;
  if (shieldActive) {
    shieldBonus = getShieldBonus();
  }

  character._computedArmor = {
    baseAc: baseAc + otherAc + shieldBonus,
    dexApplies: chestDexApplies,
    dexMax: chestDexMax,
    category: chestCategory,
    shieldBonus: shieldBonus
  };
}

function removeArmorCard(btn) {
  const card = btn.closest('.armor-card');
  const index = parseInt(card.dataset.armorIndex);
  character.armor.splice(index, 1);
  card.remove();

  document.querySelectorAll('.armor-card').forEach((c, i) => {
    c.dataset.armorIndex = i;
  });

  armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  updateArmorSlotStyles();

  recalcArmorClass();
  recalcAll();
  updateShieldButton();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  syncArmorToCharacter();
}

function clearArmorList(clearSlot = true) {
  const list = document.getElementById('armorList');
  if (list) list.innerHTML = '';
  character.armor = [];
  if (clearSlot) {
    armorSlots[currentArmorSlot] = [];
  }
  updateArmorSlotStyles();
  shieldActive = character.shieldActive || false;
  updateShieldButton();
  recalcArmorClass();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

function loadArmorFromData(data) {
  currentNaturalArmorIndex = -1;
  currentNaturalWeaponIndex = -1;
  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach(btn => {
    if (btn.dataset.natural === 'true') btn.classList.remove('active');
  });
  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach(btn => {
    if (btn.dataset.natural === 'true') btn.classList.remove('active');
  });
  clearNaturalEquipmentStyles();

  const list = document.getElementById('armorList');
  if (list) list.innerHTML = '';
  character.armor = [];
  if (!data || !Array.isArray(data)) return;
  data.forEach((item, i) => {
    addArmorCard();
    const card = document.querySelector(`.armor-card[data-armor-index="${i}"]`);
    if (!card) return;

    const input = card.querySelector('.armor-name-input');
    input.value = item.name || '';

    card.querySelectorAll('.armor-state-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.state === item.state);
    });
    if (item.state) updateArmorCardVisuals(card, item.state);

    card.querySelector('.armor-slot-display').value = ARMOR_SLOT_NAMES[item.slot] || item.slot || '';
    card.querySelector('.armor-category').value = item.category || '';
    card.querySelector('.armor-ac').value = item.ac !== undefined ? item.ac : '';
    card.querySelector('.armor-region').value = item.region || '';
    card.querySelector('.armor-threshold').value = item.durability_threshold !== undefined ? item.durability_threshold : '';

    const dur = item.durability !== undefined ? String(item.durability) : '';
    if (dur.includes('/')) {
      const [cur, max] = dur.split('/').map(s => s.trim());
      card.querySelector('.armor-durability-current').value = cur;
      card.querySelector('.armor-durability-max').value = max;
    } else {
      card.querySelector('.armor-durability-current').value = item.durabilityCurrent !== undefined ? item.durabilityCurrent : dur;
      card.querySelector('.armor-durability-max').value = item.durabilityMax !== undefined ? item.durabilityMax : dur;
    }

    const dexText = item.dex_bonus_applies
      ? `+ ЛОВ (макс. +${item.dex_bonus_max || 3})`
      : '—';
    card.querySelector('.armor-dex').value = dexText;

    let setText = '';
    if (item.set_id) {
      const setInfo = getArmorSetInfo(item.set_id);
      setText = setInfo ? `${setInfo.name} (${item.set_slot_type === 'required' ? 'обяз.' : 'опц.'})` : `Набор #${item.set_id}`;
    }
    card.querySelector('.armor-set').value = setText;

    const descDiv = card.querySelector('.armor-description');
    const descText = card.querySelector('.armor-desc-text');
    if (item.description) {
      descText.textContent = item.description;
      descDiv.style.display = 'block';
    }

    const propList = card.querySelector('.armor-prop-list');
    const propDesc = card.querySelector('.armor-prop-desc');
    if (item.properties && item.properties.length > 0) {
      let descParts = [];
      item.properties.forEach((propId, i) => {
        let key = propId;
        let bracket = "";
        if (typeof propId === 'string') {
          key = propId;
        } else if (propId && propId.name) {
          key = propId.name;
          bracket = propId.bracket ? `[${propId.bracket}]` : "";
        }
        const propData = getArmorPropertyInfo(key);
        const displayName = propData ? propData.name.replace('[]', bracket) : key;
        const badge = document.createElement('span');
        badge.className = 'weapon-prop-badge';
        badge.innerHTML = `<span class="wp-dot"></span><span class="wp-text">${escapeHtml(displayName)}</span>`;
        badge.onclick = () => {
          propList.querySelectorAll('.weapon-prop-badge').forEach(b => b.classList.remove('wp-selected'));
          badge.classList.add('wp-selected');
          const desc = propData ? propData.effect : "Нет описания";
          propDesc.value = `${displayName}:\n${desc}`;
        };
        propList.appendChild(badge);
        if (propData) descParts.push(`${displayName}: ${propData.effect}`);
      });
      if (descParts.length > 0) {
        propDesc.value = descParts.join('\n\n');
      }
    }

    card.querySelector('.upgrade-slots').value = item.upgrade_slots ? item.upgrade_slots.join(', ') : '';

    character.armor[i] = { ...item };
  });
  shieldActive = character.shieldActive || false;
  updateShieldButton();
  recalcArmorClass();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

// ===== СЛОТЫ БРОНИ =====
function switchArmorSlot(index) {
  if (currentNaturalArmorIndex >= 0) {
    currentNaturalArmorIndex = -1;
    clearNaturalEquipmentStyles();
  } else {
    armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  }
  if (currentNaturalWeaponIndex >= 0) {
    currentNaturalWeaponIndex = -1;
    document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach(btn => {
      if (btn.dataset.natural === 'true') btn.classList.remove('active');
    });
  }

  currentArmorSlot = index;

  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  const list = document.getElementById('armorList');
  if (list) list.innerHTML = '';

  const setData = armorSlots[index] || [];
  character.armor = JSON.parse(JSON.stringify(setData));

  if (setData.length > 0) {
    loadArmorFromData(setData);
  }

  updateArmorSlotStyles();
  recalcArmorClass();
  recalcAll();
  updateShieldButton();
  syncArmorToCharacter();
}

function updateArmorSlotStyles() {
  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach((el) => {
    if (el.dataset.natural === 'true') {
      el.classList.remove('filled');
      return;
    }
    const slotIndex = parseInt(el.dataset.slot);
    const hasArmor = armorSlots[slotIndex] && armorSlots[slotIndex].length > 0;
    el.classList.toggle('filled', hasArmor);
  });
}

function updateArmorSlotStyle(index) {
  const slot = document.querySelector(`#armorSlots .armor-slot-btn[data-slot="${index}"]`);
  if (slot) slot.classList.add('filled');
}

// ===== ЕСТЕСТВЕННОЕ СНАРЯЖЕНИЕ =====
function mergeNaturalWeapon(templateId, overrides) {
  const template = naturalEquipmentData.weapons[templateId];
  if (!template) {
    console.warn('Шаблон оружия не найден:', templateId);
    return null;
  }
  return {
    ...template,
    _template: templateId,
    name: overrides.name || template.name,
    base_damage: overrides.damage || template.base_damage,
    ability: overrides.ability || template.ability,
    damage_type: overrides.damage_type || template.damage_type,
    _sourceLabel: overrides._sourceLabel || '',
    _sourceName: overrides._sourceName || ''
  };
}

function mergeNaturalArmor(templateId, overrides) {
  const template = naturalEquipmentData.armor[templateId];
  if (!template) {
    console.warn('Шаблон брони не найден:', templateId);
    return null;
  }

  const merged = {
    ...template,
    _template: templateId,
    name: overrides.name || template.name,
    ac_base: overrides.ac_base !== undefined ? overrides.ac_base : template.ac_base,
    ability: overrides.ability || template.ability,
    dex_bonus_applies: overrides.dex_bonus_applies !== undefined ? overrides.dex_bonus_applies : template.dex_bonus_applies,
    dex_bonus_max: overrides.dex_bonus_max !== undefined ? overrides.dex_bonus_max : template.dex_bonus_max,
    prof_bonus: overrides.prof_bonus !== undefined ? overrides.prof_bonus : template.prof_bonus,
    _sourceLabel: overrides._sourceLabel || '',
    _sourceName: overrides._sourceName || ''
  };

  if (template.is_additive) {
    merged.is_additive = true;
    merged.additive_bonus = template.additive_bonus || 0;
    merged.standalone_ac = template.standalone_ac || 0;
  }

  return merged;
}

function collectNaturalEquipment(speciesName, raceName) {
  const { species, race } = getRacialData(speciesName, raceName);
  const weapons = [];
  const armors = [];
  const replacedWeapons = new Set();
  const replacedArmors = new Set();

  function collectFrom(source, sourceLabel) {
    if (!source) return;
    (source.natural_weapons || []).forEach(entry => {
      if (entry.replaces) replacedWeapons.add(entry.replaces);
      const merged = mergeNaturalWeapon(entry.template, {
        name: entry.name,
        damage: entry.damage,
        ability: entry.ability,
        damage_type: entry.damage_type,
        _sourceLabel: sourceLabel,
        _sourceName: source.name
      });
      if (merged) weapons.push(merged);
    });
    (source.natural_armor || []).forEach(entry => {
      if (entry.replaces) replacedArmors.add(entry.replaces);
      const merged = mergeNaturalArmor(entry.template, {
        name: entry.name,
        ac_base: entry.ac_base,
        ability: entry.ability,
        dex_bonus_applies: entry.dex_bonus_applies,
        dex_bonus_max: entry.dex_bonus_max,
        _sourceLabel: sourceLabel,
        _sourceName: source.name
      });
      if (merged) armors.push(merged);
    });
  }

  collectFrom(species, 'вид');
  collectFrom(race, 'раса');

  const filteredWeapons = weapons.filter(w => !replacedWeapons.has(w._template));
  const filteredArmors = armors.filter(a => !replacedArmors.has(a._template));

  return { weapons: filteredWeapons, armors: filteredArmors };
}

function detectNaturalEquipment(speciesName, raceName) {
  // Если шаблоны ещё не загружены — откладываем вызов
  if (!_naturalEquipmentLoaded) {
    console.log('[NaturalEquipment] Данные ещё не загружены, отложенный вызов detectNaturalEquipment...');
    if (_naturalEquipmentPromise) {
      _naturalEquipmentPromise.then(() => detectNaturalEquipment(speciesName, raceName));
    } else {
      loadNaturalEquipment().then(() => detectNaturalEquipment(speciesName, raceName));
    }
    return;
  }

  naturalWeapons = [];
  naturalArmors = [];

  if (speciesName) {
    const collected = collectNaturalEquipment(speciesName, raceName);
    naturalWeapons = collected.weapons;
    naturalArmors = collected.armors;
    console.log('[NaturalEquipment] Собрано для', speciesName + (raceName ? '/' + raceName : ''),
      ':', naturalWeapons.length, 'оружий,', naturalArmors.length, 'броней');
  }

  // === ПРИМЕНЕНИЕ ЭФФЕКТОВ ВНЕШНОСТИ (мутации → травмы → модули) ===
  if (character._appearanceEffects) {
    const app = character._appearanceEffects;

    // --- Естественное оружие ---
    for (const w of app.naturalWeapons) {
      const template = naturalEquipmentData.weapons[w.template];
      if (template) {
        naturalWeapons.push({
          ...template,
          _template: w.template,
          name: w.name || template.name,
          base_damage: w.damage || template.base_damage,
          ability: w.ability || template.ability,
          damage_type: w.damage_type || template.damage_type,
          _sourceLabel: 'мутация/модуль',
          _sourceName: w._source || ''
        });
      } else {
        // Динамическое оружие без шаблона
        naturalWeapons.push({
          id: w.template || ('dyn_' + Math.random().toString(36).substr(2, 7)),
          type: w.template || 'natural',
          base_damage: w.damage || '1d4',
          damage_type: w.damage_type || 'дробящий',
          ability: w.ability || 'str',
          range_effective: w.range_effective || 5,
          range_max: w.range_max || 5,
          category: 'Естественное оружие',
          crit_chance: '20',
          properties: ['natural'],
          description: w.name || 'Естественное оружие',
          _sourceLabel: 'мутация/модуль',
          _sourceName: w._source || ''
        });
      }
    }

    // --- Естественная броня (аддитивно) ---
    for (const a of app.naturalArmors) {
      const existing = naturalArmors.find(na => (na.slot || 'chest') === (a.slot || 'chest'));
      if (existing) {
        existing.ac_base = (existing.ac_base || 0) + (a.ac_base || 0);
        existing.name = existing.name + ' + ' + (a.name || 'Броня');
      } else {
        naturalArmors.push({
          id: a.name || 'app_armor',
          type: a.name || 'app_armor',
          name: a.name || 'Естественная броня',
          ac_base: a.ac_base || 10,
          ability: a.ability || 'dex',
          dex_bonus_max: a.dex_bonus_max !== undefined ? a.dex_bonus_max : null,
          dex_bonus_applies: a.dex_bonus_applies !== false,
          slot: a.slot || 'chest',
          category: 'Естественная броня',
          description: a.description || '',
          _sourceLabel: 'мутация/травма',
          _sourceName: a._source || ''
        });
      }
    }
  }

  updateNaturalWeaponSlots();
  updateNaturalArmorSlots();
}

function updateNaturalWeaponSlots() {
  const container = document.getElementById('weaponSlots');
  if (!container) return;

  container.querySelectorAll('.natural-weapon-slot').forEach(el => el.remove());

  naturalWeapons.forEach((weapon, index) => {
    const slotWrapper = document.createElement('div');
    slotWrapper.className = 'natural-weapon-slot';

    const btn = document.createElement('button');
    btn.className = 'weapon-slot-btn';
    btn.dataset.slot = 'natural-' + index;
    btn.dataset.natural = 'true';
    btn.dataset.weaponIndex = index;
    btn.innerHTML = '<span style="font-size:14px;">⚔</span>';
    btn.title = weapon.name + ' — ' + weapon.base_damage + ' ' + weapon.damage_type;
    btn.onclick = () => switchNaturalWeaponSlot(index);

    slotWrapper.appendChild(btn);
    container.appendChild(slotWrapper);
  });
}

function updateNaturalArmorSlots() {
  const container = document.getElementById('armorSlots');
  if (!container) return;

  container.querySelectorAll('.natural-armor-slot').forEach(el => el.remove());

  naturalArmors.forEach((armor, index) => {
    const slotWrapper = document.createElement('div');
    slotWrapper.className = 'natural-armor-slot';

    const btn = document.createElement('button');
    btn.className = 'armor-slot-btn';
    btn.dataset.slot = 'natural-' + index;
    btn.dataset.natural = 'true';
    btn.dataset.armorIndex = index;
    btn.innerHTML = '<span style="font-size:14px;">🛡</span>';
    btn.title = armor.name + ' — КД ' + armor.ac_base + ' + мод. ' + (ABILITY_NAMES[armor.ability] || armor.ability.toUpperCase());
    btn.onclick = () => switchNaturalArmorSlot(index);

    slotWrapper.appendChild(btn);
    container.appendChild(slotWrapper);
  });
}

function switchNaturalWeaponSlot(index) {
  // Save current regular slot before switching to natural
  if (currentNaturalWeaponIndex < 0 && currentWeaponSlot >= 0) {
    saveCurrentWeaponSlot();
  }

  currentNaturalWeaponIndex = index;
  currentNaturalArmorIndex = -1;

  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.natural === 'true' && parseInt(btn.dataset.weaponIndex) === index) {
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const weapon = naturalWeapons[index];
  if (weapon) {
    loadNaturalWeaponData(weapon);
  }
}

function switchNaturalArmorSlot(index) {
  // Save current regular slot before switching to natural
  if (currentNaturalArmorIndex < 0 && currentArmorSlot >= 0) {
    armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  }

  currentNaturalArmorIndex = index;
  currentNaturalWeaponIndex = -1;

  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.natural === 'true' && parseInt(btn.dataset.armorIndex) === index) {
      btn.classList.add('active');
    }
  });

  const armor = naturalArmors[index];
  if (armor) {
    loadNaturalArmorData(armor);
  }
}

function loadNaturalWeaponData(weapon) {
  clearWeaponFields();

  document.querySelectorAll('#weaponSlots .weapon-slot-btn:not([data-natural="true"])').forEach(btn => {
    btn.classList.remove('active');
  });

  const pb = proficiencyBonus(Number(character.level) || 1);
  const mod = abilityModifier(Number(character.abilities[weapon.ability]) || 10);
  const profVal = pb;
  const totalBonus = mod + profVal;
  const bonusStr = totalBonus >= 0 ? '+' + totalBonus : String(totalBonus);

  const setValue = (id, val, readOnly = true) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; el.readOnly = readOnly; }
  };

  setValue('wmName', weapon.name);
  document.getElementById('wmName')?.classList.add('natural-field');

  setValue('wmScale', weapon.ability);
  document.getElementById('wmScale').disabled = true;

  setValue('wmProf', '2');
  document.getElementById('wmProf').disabled = true;

  setValue('wmHitBonus', bonusStr);
  const hitBonusEl = document.getElementById('wmHitBonus');
  if (hitBonusEl) { hitBonusEl.className = "field-input flex-center bold natural-field"; }

  const damageText = weapon.base_damage + (totalBonus !== 0 ? bonusStr : '') + ' ' + weapon.damage_type;
  setValue('wmDamage', damageText);
  document.getElementById('wmDamage')?.classList.add('natural-field');

  setValue('wmCrit', weapon.crit_chance || '20');
  setValue('wmEffRange', (weapon.range_effective || 5) + ' фт.');
  setValue('wmMaxRange', (weapon.range_max || 5) + ' фт.');
  setValue('wmCategory', weapon.category || 'Естественное оружие');
  setValue('wmSubcategory', weapon._sourceName + ' (' + weapon._sourceLabel + ')');
  setValue('wmRegion', 'Природное');
  setValue('wmDurabilityCurrent', '∞');
  setValue('wmDurabilityMax', '∞');
  setValue('wmUpgradeSlots', 'Нет');
  setValue('wmTechniques', 'Нет');

  wmCurrentProperties = weapon.properties || [];
  renderWeaponProperties(wmCurrentProperties.map(p => typeof p === 'string' ? p : p));

  setValue('wmPropDesc', weapon.description || '');
  setValue('wmModifications', 'Источник: ' + weapon._sourceName + ' (' + weapon._sourceLabel + ')\nТип урона: ' + weapon.damage_type);
  setValue('wmNotes', 'Естественное оружие — неразрушимо, нельзя разоружить.');

  const form = document.querySelector('.weapon-form');
  if (form) form.classList.add('natural-equipment-card');
}

function loadNaturalArmorData(armor) {
  clearArmorList(false);

  document.querySelectorAll('#armorSlots .armor-slot-btn:not([data-natural="true"])').forEach(btn => {
    btn.classList.remove('active');
  });

  const mod = abilityModifier(Number(character.abilities[armor.ability]) || 10);
  const dexApplies = armor.dex_bonus_applies !== false;
  const dexMax = armor.dex_bonus_max;
  const dexContrib = dexApplies ? (dexMax !== null && dexMax !== undefined ? Math.min(mod, dexMax) : mod) : 0;
  const pb = proficiencyBonus(Number(character.level) || 1);
  const profBonus = armor.prof_bonus ? pb : 0;
  const totalAC = armor.ac_base + dexContrib + profBonus;

  const card = document.createElement('div');
  card.className = 'armor-card natural-armor-card';
  card.dataset.armorIndex = 'natural';

  const dexText = dexApplies
    ? (dexMax !== null && dexMax !== undefined ? '+ ' + (ABILITY_NAMES[armor.ability] || armor.ability.toUpperCase()) + ' (макс. +' + dexMax + ')' : '+ ' + (ABILITY_NAMES[armor.ability] || armor.ability.toUpperCase()))
    : '—';

  card.innerHTML = `
    <div class="armor-header">
      <div class="armor-autocomplete-wrap" style="flex:1;">
        <input type="text" class="field-input armor-name-input natural-armor-field" value="${escapeHtml(armor.name)}" readonly>
      </div>
      <div class="armor-actions">
        <span style="font-size:11px;color:#f1c40f;font-weight:700;padding:4px 8px;background:rgba(243,156,18,0.1);border-radius:6px;border:1px solid rgba(243,156,18,0.3);">🛡 ЕСТЕСТВЕННАЯ</span>
      </div>
    </div>
    <div class="armor-fields">
      <div class="field-group">
        <label class="field-label">Слот</label>
        <input type="text" class="field-input" value="${ARMOR_SLOT_NAMES[armor.slot] || armor.slot || 'Тело'}" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Категория</label>
        <input type="text" class="field-input" value="${escapeHtml(armor.category || 'Естественная броня')}" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">КД (вычислено)</label>
        <input type="text" class="field-input natural-armor-field" value="${totalAC}" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Базовый КД</label>
        <input type="text" class="field-input" value="${armor.ac_base}" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Бонус ${ABILITY_NAMES[armor.ability] || armor.ability.toUpperCase()}</label>
        <input type="text" class="field-input" value="${mod >= 0 ? '+' : ''}${dexContrib}" readonly>
      </div>
      <div class="field-group" style="${profBonus > 0 ? '' : 'display:none;'}">
        <label class="field-label">Бонус мастерства</label>
        <input type="text" class="field-input" value="+${profBonus}" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Прочность</label>
        <input type="text" class="field-input" value="Неразрушимая" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Источник</label>
        <input type="text" class="field-input" value="${escapeHtml(armor._sourceName)} (${escapeHtml(armor._sourceLabel)})" readonly>
      </div>
      <div class="field-group">
        <label class="field-label">Шаблон</label>
        <input type="text" class="field-input" value="${escapeHtml(armor.name)}" readonly>
      </div>
    </div>
    <div style="margin-top:12px;padding:10px 12px;background:rgba(243,156,18,0.05);border-radius:8px;border:1px solid rgba(243,156,18,0.2);">
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">${escapeHtml(armor.description || '')}</div>
    </div>
  `;

  const list = document.getElementById('armorList');
  if (list) list.appendChild(card);

  character._computedArmor = {
    baseAc: armor.ac_base + profBonus,
    dexApplies: dexApplies,
    dexMax: dexMax,
    isNatural: true
  };

  recalcAll();
}

/* ---------- Подвижное забрало ---------- */

function toggleVisor(index) {
  const armor = character.armor[index];
  if (!armor?.properties?.includes('movable_visor')) return;

  armor.visorState = armor.visorState === 'down' ? 'up' : 'down';
  applyVisorProperties(index);

  const card = document.querySelector(`.armor-card[data-armor-index="${index}"]`);
  if (card) {
    updateVisorButton(card, armor.visorState);
    renderArmorPropList(card, armor.properties);
    updateArmorPropDesc(card, armor.properties);
  }

  recalcAll();
  syncArmorToCharacter();
}

/** Добавляет/убирает closed_helmet / open_helmet в зависимости от положения забрала */
function applyVisorProperties(index) {
  const armor = character.armor[index];
  if (!armor?.properties) return;

  // Убираем производные свойства
  armor.properties = armor.properties.filter(
    p => p !== 'closed_helmet' && p !== 'open_helmet'
  );

  if (armor.visorState === 'down') {
    armor.properties.push('closed_helmet');
  } else if (armor.visorState === 'up') {
    armor.properties.push('open_helmet');
  }
}

function updateVisorButton(card, state) {
  const img = card.querySelector('.visor-icon');
  const btn = card.querySelector('.visor-toggle-btn');
  if (!img || !btn) return;

  img.src = state === 'down' ? VISOR_ICON_DOWN : VISOR_ICON_UP;
  btn.title = state === 'down'
    ? 'Забрало опущено (закрытый шлем)'
    : 'Забрало поднято (открытый шлем)';
  btn.dataset.state = state;
}

function showVisorToggle(card, show) {
  const wrap = card.querySelector('.armor-visor-wrap');
  if (wrap) wrap.style.display = show ? 'flex' : 'none';
}

/** Перерендеривает бейджи свойств (вызывается при переключении забрала) */
function renderArmorPropList(card, properties) {
  const propList = card.querySelector('.armor-prop-list');
  if (!propList) return;
  propList.innerHTML = '';

  (properties || []).forEach(propId => {
    let key = propId, bracket = '';
    if (typeof propId === 'string') {
      key = propId;
    } else if (propId?.name) {
      key = propId.name;
      bracket = propId.bracket ? `[${propId.bracket}]` : '';
    }

    const propData = getArmorPropertyInfo(key);
    const displayName = propData ? propData.name.replace('[]', bracket) : key;

    const badge = document.createElement('span');
    badge.className = 'weapon-prop-badge';
    badge.innerHTML = `<span class="wp-dot"></span><span class="wp-text">${escapeHtml(displayName)}</span>`;
    badge.onclick = () => {
      propList.querySelectorAll('.weapon-prop-badge').forEach(b => b.classList.remove('wp-selected'));
      badge.classList.add('wp-selected');
      const desc = propData ? propData.effect : 'Нет описания';
      const propDesc = card.querySelector('.armor-prop-desc');
      if (propDesc) propDesc.value = `${displayName}:\n${desc}`;
    };
    propList.appendChild(badge);
  });
}

/** Обновляет текстовое описание свойств */
function updateArmorPropDesc(card, properties) {
  const propDesc = card.querySelector('.armor-prop-desc');
  if (!propDesc) return;

  const parts = [];
  (properties || []).forEach(propId => {
    let key = propId, bracket = '';
    if (typeof propId === 'string') {
      key = propId;
    } else if (propId?.name) {
      key = propId.name;
      bracket = propId.bracket ? `[${propId.bracket}]` : '';
    }
    const propData = getArmorPropertyInfo(key);
    const displayName = propData ? propData.name.replace('[]', bracket) : key;
    if (propData) parts.push(`${displayName}: ${propData.effect}`);
  });

  if (parts.length) {
    propDesc.value = parts.join('\n\n');
  } else {
    propDesc.value = '';
    propDesc.placeholder = 'Выберите свойства для просмотра...';
  }
}

function clearNaturalEquipmentStyles() {
  const form = document.querySelector('.weapon-form');
  if (form) form.classList.remove('natural-equipment-card');

  const weaponFields = ['wmName', 'wmScale', 'wmProf', 'wmHitBonus', 'wmDamage',
    'wmCrit', 'wmEffRange', 'wmMaxRange', 'wmCategory', 'wmSubcategory',
    'wmRegion', 'wmDurabilityCurrent', 'wmDurabilityMax', 'wmUpgradeSlots',
    'wmTechniques', 'wmPropDesc', 'wmModifications', 'wmNotes'];

  weaponFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = false;
      el.disabled = false;
      el.classList.remove('natural-field');
    }
  });

  document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach(btn => {
    if (btn.dataset.natural !== 'true') btn.classList.remove('active');
  });

  document.querySelectorAll('#armorSlots .armor-slot-btn').forEach(btn => {
    if (btn.dataset.natural !== 'true') btn.classList.remove('active');
  });
}