// ============================================================
// CORE MODULE — Данные персонажа, формулы, утилиты, происхождения
// ============================================================

// ===== 1. ЦЕНТРАЛИЗОВАННЫЙ JSON-ОБЪЕКТ ПЕРСОНАЖА =====
let character = {
  // ─── 1. Основная информация ───
  name: "",
  species: "",
  race: "",
  level: 1,
  xp: 0,

  // ─── 2. Внешность ───
  appearance: null,

  // ─── 3. Личность и черты ───
  personality: {
    background: "",
    beliefs: "",
    fears: "",
    goals: ""
  },
  features: {
    personality: [],
    physical: [],
    supernatural: [],
    experience: []
  },

  // ─── 4. Характеристики и спасброски ───
  abilities: {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
  },
  saveProf: {
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
  },
  inspiration: {
    str: false, dex: false, con: false, int: false, wis: false, cha: false
  },

  // ─── 5. Боевые параметры ───
  hp: {
    current: 0,
    temp: 0
  },
  combat: {
    baseAc: 10,
    shieldBonus: 0,
    dexCap: null
  },
  armor: [],
  armorSets: [[], [], [], [], []],

  // ─── 6. Бонусы ───
  bonuses: {
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
    ac: 0, initiative: 0, will: 0, hp: 0,
    speedWalk: 0, manaMax: 0, ppMax: 0,
    skills: {},
    saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  },
  bonusSources: {
    hp: [], initiative: [], will: [],
    speedWalk: [], manaMax: [], ppMax: [],
    skills: {},
    saves: { str: [], dex: [], con: [], int: [], wis: [], cha: [] }
  },

  // ─── 7. Навыки ───
  skills: {},
  skillConditions: {},

  // ─── 8. Владения ───
  proficiencies: {
    languages: [],
    weapons: [],
    armor: [],
    tools: []
  },

  // ─── 9. Магия ───
  isMage: false,
  magic: {
    rb: 1,
    manaCurrent: 0,
    schools: [],
    sorcery: [],
    spells: []
  },

  // ─── 10. Псионика ───
  isPsionic: false,
  psionics: {
    discipline: 'telekinesis',
    level: 1,
    ppCurrent: 0,
    overloadCount: 0,
    overloadDice: 4
  },

  // ─── 11. Инвентарь ───
  inventory: {
    storages: [],
    items: [],
    modifiers: []
  },

  // ─── 12. Умения и способности ───
  abilitiesList: [],

  // ─── 13. Оружие и слоты ───
  weaponSlots: [null, null, null, null, null],
  currentWeaponSlot: 0,
  currentNaturalWeaponIndex: -1,

  // ─── 14. Заметки ───
  notes: "",

  // ─── 15. Служебные ───
  currentNaturalArmorIndex: -1
};

// ===== BONUS MODAL STATE =====
const BonusModalState = {
  currentField: null,
  currentLabel: '',
  editingBonuses: [],
  currentSkillName: null
};



// ===== SIDEBAR NAVIGATION =====

function initSidebar() {
  renderSidebar();
  const toggle = document.getElementById('sidebarToggle');
  if (toggle) toggle.addEventListener('click', toggleSidebar);
}

function refreshSidebar() {
  if (typeof buildSidebar === 'function' && typeof updateSidebarForTab === 'function') {
    buildSidebar();
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) updateSidebarForTab(activeTab.id);
  } else {
    renderSidebar();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const body = document.body;
  sidebar.classList.toggle('collapsed');
  body.classList.toggle('sidebar-collapsed-body');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const tab = document.getElementById(tabId);
  const btn = document.getElementById(tabId + '-btn');
  if (tab) tab.classList.add('active');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }
  refreshSidebar();
}

function isTabActive(tabId) {
  const tab = document.getElementById(tabId);
  return tab && tab.classList.contains('active');
}

function getArmorSubitems() {
  const items = [];
  (character.armor || []).forEach((armor, idx) => {
    if (armor.name) {
      items.push({
        label: armor.name,
        onclick: `switchTab('tab-combat'); setTimeout(()=>{ const card=document.querySelector('.armor-card[data-armor-index="${idx}"]'); if(card){ card.scrollIntoView({behavior:'smooth',block:'center'}); card.classList.add('nav-highlight'); setTimeout(()=>card.classList.remove('nav-highlight'),1500); } },100);`
      });
    }
  });
  return items;
}

function getAbilitiesSubitems() {
  const items = [];
  (character.abilitiesList || []).forEach((ability, idx) => {
    const label = ability.name || 'Без названия';
    items.push({
      label: label,
      onclick: `switchTab('tab-traits'); switchTraitsSubtab('traits-abilities'); setTimeout(()=>{ const rows=document.querySelectorAll('#abilitiesList .ability-row'); if(rows[${idx}]){ rows[${idx}].scrollIntoView({behavior:'smooth',block:'center'}); rows[${idx}].classList.add('nav-highlight'); setTimeout(()=>rows[${idx}].classList.remove('nav-highlight'),1500); } },100);`
    });
  });
  return items;
}

function getRacialTraitsSubitems() {
  const items = [];
  const traits = getRacialTraits(character.species, character.race);
  traits.forEach((trait, idx) => {
    if (trait.name) {
      items.push({
        label: trait.name,
        onclick: `switchTab('tab-traits'); switchTraitsSubtab('traits-racial'); setTimeout(()=>{ const cards=document.querySelectorAll('#traitsContent .trait-card'); if(cards[${idx}]){ cards[${idx}].scrollIntoView({behavior:'smooth',block:'center'}); cards[${idx}].classList.add('nav-highlight'); setTimeout(()=>cards[${idx}].classList.remove('nav-highlight'),1500); } },100);`
      });
    }
  });
  return items;
}

function getTraitsSubitems() {
  return [...getAbilitiesSubitems(), ...getRacialTraitsSubitems()];
}

function renderSidebar() {
  const container = document.getElementById('sidebarContent');
  if (!container) return;

  const sections = [
    { id: 'tab-main', label: 'Основная информация', subitems: [] },
    { id: 'tab-combat', label: 'Оружие и броня', subitems: getArmorSubitems() },
    { id: 'tab-inventory', label: 'Инвентарь', subitems: [] },
    { id: 'tab-personality', label: 'Личность', subitems: [] },
    { id: 'tab-traits', label: 'Умения и способности', subitems: getTraitsSubitems() },
    { id: 'tab-notes', label: 'Заметки', subitems: [] },
  ];

  if (character.isMage) {
    sections.push({ id: 'tab-magic', label: 'Магия', subitems: [] });
  }
  if (character.isPsionic) {
    sections.push({ id: 'tab-psionic', label: 'Псионика', subitems: [] });
  }

  container.innerHTML = sections.map(s => `
    <div class="sidebar-section">
      <div class="sidebar-link ${isTabActive(s.id) ? 'active' : ''}" onclick="switchTab('${s.id}')">
        <span class="sidebar-link-dot"></span>
        <span class="sidebar-link-text">${escapeHtml(s.label)}</span>
      </div>
      ${s.subitems.length ? `
        <div class="sidebar-subitems">
          ${s.subitems.map(sub => `
            <div class="sidebar-link sidebar-subitem" onclick="${sub.onclick}">
              <span class="sidebar-link-dot" style="width:4px;height:4px;opacity:0.5;"></span>
              <span class="sidebar-link-text">${escapeHtml(sub.label)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ===== 2. ДАННЫЕ ПРОИСХОЖДЕНИЙ (origins.json) =====
let originsData = null;
const originsUrl = 'data/origins.json';
let speciesMap = new Map();
let raceMap = new Map();

async function loadOrigins() {
  try {
    const res = await fetch(originsUrl);
    originsData = await res.json();
    buildOriginsMaps();
    initSpeciesAutocomplete();
    initRaceAutocomplete();
  } catch (e) {
    console.error('Не удалось загрузить origins.json:', e);
  }
}

function buildOriginsMaps() {
  speciesMap.clear(); raceMap.clear();
  if (!originsData || !originsData.origins) return;
  for (const [category, data] of Object.entries(originsData.origins)) {
    if (!data.species) continue;
    for (const species of data.species) {
      speciesMap.set(species.name, { ...species, category });
      if (species.races && species.races.length > 0) {
        for (const race of species.races) {
          raceMap.set(`${species.name}|${race.name}`, { ...race, speciesName: species.name });
        }
      }
    }
  }
}

function getSpeciesRaces(speciesName) {
  const species = speciesMap.get(speciesName);
  if (!species) return [];
  if (species.races && species.races.length > 0) {
    return species.races.map(r => r.name);
  }
  return [];
}

function getRacialData(speciesName, raceName) {
  const species = speciesMap.get(speciesName);
  const race = raceMap.get(`${speciesName}|${raceName}`);
  return { species, race };
}

function parseAbilityBonus(bonus) {
  if (!bonus) return {};
  if (typeof bonus === 'object' && !Array.isArray(bonus)) {
    const result = {};
    for (const [key, val] of Object.entries(bonus)) {
      if (typeof val === 'number') result[key] = val;
    }
    return result;
  }
  if (typeof bonus !== 'string') return {};
  const map = {};
  const lower = bonus.toLowerCase();
  if (lower.includes('ко всем') || lower.includes('всем характеристикам')) {
    const match = bonus.match(/\+(\d+)/);
    const val = match ? parseInt(match[1]) : 0;
    ['str','dex','con','int','wis','cha'].forEach(a => map[a] = val);
    return map;
  }
  const regex = /\+(\d+)\s+к\s+([А-Яа-я\s]+)/gi;
  const abbrMap = {
    'силе': 'str', 'силы': 'str', 'сила': 'str',
    'ловкости': 'dex', 'ловкость': 'dex',
    'телосложению': 'con', 'телосложения': 'con', 'телосложение': 'con',
    'интеллекту': 'int', 'интеллекта': 'int', 'интеллект': 'int',
    'мудрости': 'wis', 'мудрость': 'wis',
    'харизме': 'cha', 'харизмы': 'cha', 'харизма': 'cha'
  };
  let m;
  while ((m = regex.exec(bonus)) !== null) {
    const val = parseInt(m[1]);
    const name = m[2].trim().toLowerCase().replace(/\s+/g, ' ');
    for (const [rus, eng] of Object.entries(abbrMap)) {
      if (name.includes(rus)) { map[eng] = (map[eng] || 0) + val; break; }
    }
  }
  return map;
}

function getRacialBonuses(speciesName, raceName) {
  const { species, race } = getRacialData(speciesName, raceName);
  const bonuses = {};
  if (species && species.ability_bonuses) {
    Object.assign(bonuses, parseAbilityBonus(species.ability_bonuses));
  }
  if (race && race.ability_bonuses) {
    const parsed = parseAbilityBonus(race.ability_bonuses);
    for (const [key, val] of Object.entries(parsed)) {
      bonuses[key] = (bonuses[key] || 0) + val;
    }
  }
  return bonuses;
}

function getRacialTraits(speciesName, raceName) {
  const { species, race } = getRacialData(speciesName, raceName);
  const traits = [];
  if (species && species.traits) {
    for (const t of species.traits) {
      traits.push({ source: species.name, name: t.name, description: t.description });
    }
  }
  if (race && race.traits) {
    for (const t of race.traits) {
      traits.push({ source: race.name, name: t.name, description: t.description });
    }
  }
  return traits;
}

// ===== СКОРОСТИ РАС =====
const SPEED_TYPE_LABELS = {
  walk: 'Ходьба',
  swim: 'Плавание',
  fly: 'Полёт',
  climb: 'Лазание',
  burrow: 'Копание'
};

function getRacialSpeedScales(speciesName, raceName) {
  const { species, race } = getRacialData(speciesName, raceName);
  const scales = {};
  if (species?.speed_scale) Object.assign(scales, species.speed_scale);
  if (race?.speed_scale)    Object.assign(scales, race.speed_scale);
  return scales;
}

function formatSpeedValue(val) {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num >= 10 ? `${num} фт.` : `×${num}`;
}

function getRacialSpeedScale(speciesName, raceName) {
  const { species, race } = getRacialData(speciesName, raceName);
  let scale = null;
  if (race && race.speed_scale !== undefined) scale = race.speed_scale;
  else if (species && species.speed_scale !== undefined) scale = species.speed_scale;

  // Если speed_scale — объект { walk: 1, swim: 0.5, ... }, берём walk
  if (scale !== null && typeof scale === 'object' && !Array.isArray(scale)) {
    return scale.walk !== undefined ? scale.walk : 1;
  }
  return scale;
}

function renderTraits() {
  const card = document.getElementById('traitsCard');
  const content = document.getElementById('traitsContent');
  if (!card || !content) return;

  const traits = getRacialTraits(character.species, character.race);
  const racialSpeedScales = getRacialSpeedScales(character.species, character.race);

  // NEW: получаем расовые данные сразу, они понадобятся и для form_pool, и для полёта
  const { species, race } = getRacialData(character.species, character.race);
  const hasFormPool = race && Array.isArray(race.form_pool) && race.form_pool.length > 0;

  // ── Appearance-эффекты на скорость ──
  const appearanceEffects = character._appearanceEffects || {};
  const appSpeedScales = appearanceEffects.speedScales || {};

  // Собираем все типы скоростей: расовые + appearance
  const allTypes = new Set([
    ...Object.keys(racialSpeedScales),
    ...Object.keys(appSpeedScales)
  ]);

  const speedEntries = [];
  const baseDex = Number(character.abilities?.dex) || 10;
  const baseSpeed = baseWalkSpeed(baseDex);

  for (const type of allTypes) {
    const racialVal = racialSpeedScales[type];
    const appVal = appSpeedScales[type] || 0;

    // Если нет ни расового, ни appearance — пропускаем
    if ((racialVal === undefined || racialVal === null) && appVal === 0) continue;

    let scaleDisplay;
    let speedDisplay;

    if (racialVal !== undefined && racialVal !== null) {
      const numScale = Number(racialVal);
      if (!Number.isNaN(numScale)) {
        if (numScale >= 10) {
          // Абсолютное значение в футах (например, 30)
          const finalScale = Math.max(0, 1 + appVal);
          const finalSpeed = Math.floor(numScale * finalScale);
          scaleDisplay = '×' + (Number.isInteger(finalScale) ? finalScale : finalScale.toFixed(2));
          speedDisplay = finalSpeed + ' фт.';
        } else {
          // Множитель (например, ×1, ×1.5)
          const finalScale = Math.max(0, numScale + appVal);
          const finalSpeed = Math.floor(baseSpeed * finalScale);
          scaleDisplay = '×' + (Number.isInteger(finalScale) ? finalScale : finalScale.toFixed(2));
          speedDisplay = finalSpeed + ' фт.';
        }
      }
    } else if (appVal !== 0) {
      // Только appearance-эффект без расового скейла
      const finalScale = Math.max(0, 1 + appVal);
      const finalSpeed = Math.floor(baseSpeed * finalScale);
      scaleDisplay = '×' + (Number.isInteger(finalScale) ? finalScale : finalScale.toFixed(2));
      speedDisplay = finalSpeed + ' фт.';
    } else {
      continue;
    }

    speedEntries.push({
      type,
      label: SPEED_TYPE_LABELS[type] || type,
      scale: scaleDisplay,
      speed: speedDisplay
    });
  }

  let html = '';

  // ─── Блок типа и размера (для всех происхождений) ───
  if (character.species) {
    const typeVal = (race && race.type) || (species && species.type) || '—';
    const sizeVal = (race && race.size) || (species && species.size) || '—';
    html += `
      <div class="origin-info-block" style="
        margin-bottom:16px;padding:12px 14px;
        background:rgba(26,34,26,0.6);border:1px solid var(--border);
        border-radius:12px;">
        <div style="
          font-size:11px;text-transform:uppercase;letter-spacing:0.08em;
          color:var(--text-secondary);margin-bottom:10px;font-weight:600;">
          Происхождение
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">Тип</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${escapeHtml(typeVal)}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">Размер</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${escapeHtml(sizeVal)}</div>
          </div>
        </div>
      </div>`;
  }

  // ─── Блок скоростей (сверху) ───
  if (speedEntries.length > 0) {
    const rows = speedEntries.map(entry => `
      <div class="speed-row" style="
        display:grid;
        grid-template-columns:1fr auto auto;
        gap:12px;
        align-items:center;
        padding:8px 0;
        border-bottom:1px solid var(--border);
        font-size:13px;
        color:var(--text-primary);">
        <span style="color:var(--text-secondary);font-weight:600;">${escapeHtml(entry.label)}</span>
        <span style="color:var(--blue);font-weight:700;min-width:60px;text-align:right;">${escapeHtml(entry.scale)}</span>
        <span style="color:var(--green);font-weight:700;min-width:60px;text-align:right;">${escapeHtml(entry.speed)}</span>
      </div>
    `).join('');

    html += `
      <div class="speed-scale-block" style="
        margin-bottom:16px;padding:12px 14px;
        background:rgba(26,34,26,0.6);border:1px solid var(--border);
        border-radius:12px;">
        <div style="
          font-size:11px;text-transform:uppercase;letter-spacing:0.08em;
          color:var(--text-secondary);margin-bottom:10px;font-weight:600;">
          Скорости
        </div>
        <div>
          ${rows}
        </div>
      </div>`;
  }

  // ─── Блок выбора формы (только для астральных сущностей) ───
  if (hasFormPool) {
    const currentForm = character.raceForm || '';
    const options = race.form_pool.map(f =>
      `<option value="${escapeHtml(f)}" ${f === currentForm ? 'selected' : ''}>${escapeHtml(f)}</option>`
    ).join('');

    html += `
      <div class="form-pool-block" style="margin-bottom:16px;padding:12px 14px;background:rgba(26,34,26,0.6);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-secondary);margin-bottom:10px;font-weight:600;">
          Форма астрального существа
        </div>
        <select class="field-input" id="raceFormSelect" style="width:100%;padding:8px 12px;border-radius:8px;background:var(--surface);border:1px solid var(--border);color:var(--text-primary);font-size:14px;cursor:pointer;" onchange="setRaceForm(this.value)">
          <option value="">— Выберите форму —</option>
          ${options}
        </select>
        ${currentForm ? `<div style="margin-top:8px;font-size:12px;color:var(--green);">Текущая форма: <strong>${escapeHtml(currentForm)}</strong></div>` : ''}
      </div>
    `;
  }

  if (traits.length === 0 && speedEntries.length === 0 && !hasFormPool) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  // ─── Список расовых черт ───
  html += traits.map(t => `
    <div class="trait-card">
      <div class="trait-header">
        <span class="trait-name">${escapeHtml(t.name)}</span>
        <span class="trait-source">${escapeHtml(t.source)}</span>
      </div>
      <div class="trait-desc">${escapeHtml(t.description)}</div>
    </div>
  `).join('');

  content.innerHTML = html;

  // Скорость полёта
  const flyCard = document.getElementById('flyCard');
  let flySpeed = null;
  if (race && race.speed_fly) flySpeed = race.speed_fly;
  else if (species && species.speed_fly) flySpeed = species.speed_fly;
  if (flySpeed !== null && flyCard) {
    flyCard.classList.remove('hidden');
    updateComputed('speedFly', flySpeed);
  } else if (flyCard) {
    flyCard.classList.add('hidden');
  }
}

function setRaceForm(form) {
  character.raceForm = form || '';
  recalcAll();
}
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== КАСТОМНЫЕ СПИННЕРЫ (хиты / мана / псионика) =====
function stepInput(btn, delta) {
  const wrapper = btn.closest('.input-with-spinner');
  if (!wrapper) return;
  const input = wrapper.querySelector('input[type="number"]');
  if (!input) return;

  let val = parseInt(input.value, 10) || 0;
  const min = parseInt(input.min, 10);
  if (!isNaN(min) && val + delta < min) {
    val = min;
  } else {
    val += delta;
  }

  input.value = val;

  // Программно выбрасываем события, чтобы сработали
  // data-path биндинги, oninput-атрибуты и recalcAll
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

let _spinnerInterval = null;
let _spinnerTimeout = null;

function startSpinnerRepeat(btn, delta) {
  stepInput(btn, delta);
  _spinnerTimeout = setTimeout(() => {
    _spinnerInterval = setInterval(() => {
      stepInput(btn, delta);
    }, 80);
  }, 400);
}

function stopSpinnerRepeat() {
  clearTimeout(_spinnerTimeout);
  clearInterval(_spinnerInterval);
  _spinnerTimeout = null;
  _spinnerInterval = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spinner-btn').forEach(btn => {
    const delta = parseInt(btn.dataset.delta, 10);
    if (isNaN(delta)) return;

    const start = (e) => {
      e.preventDefault();
      startSpinnerRepeat(btn, delta);
    };
    const stop = () => stopSpinnerRepeat();

    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', stop);
    btn.addEventListener('touchcancel', stop);
  });
});


// ===== 3. ФОРМУЛЫ =====
function abilityModifier(score) { return Math.floor((score - 10) / 2); }
function proficiencyBonus(level) { if (level <= 0) return 0; return 2 + Math.floor((level - 1) / 4); }
function maxHp(level, conMod) { if (level <= 0) return 0; const raw = 5 * level + 3 * conMod * level; return Math.max(1, raw); }
function carryCapacity(strScore, conScore) { return (strScore + conScore) * 3; }
function baseWalkSpeed(dexScore) { return dexScore * 3; }
function initiative(dexMod, bonus = 0) { return dexMod + bonus; }
function willSave(chaMod, wisMod, profBonus, bonus = 0) { return Math.max(chaMod, wisMod) + profBonus + bonus; }
function xpToNextLevel(level) {
  if (level < 1 || level >= 20) return 0;
  const xpTable = { 1:300, 2:600, 3:1800, 4:3800, 5:5100, 6:9000, 7:11000, 8:14000, 9:16000, 10:21000, 11:15000, 12:20000, 13:20000, 14:25000, 15:30000, 16:30000, 17:40000, 18:40000, 19:50000 };
  return xpTable[level] || 0;
}
function armorClass(baseAc, dexMod, shieldBonus = 0, dexApplies = true, dexCap = null) {
  if (!dexApplies) return baseAc + shieldBonus;
  const dexContrib = dexCap !== null ? Math.min(dexMod, dexCap) : dexMod;
  return baseAc + dexContrib + shieldBonus;
}
function applySpeedScale(baseSpeed, scale) {
  if (scale === undefined || scale === null) return null;
  if (scale >= 10) return Math.floor(scale);
  return Math.floor(baseSpeed * scale);
}

// ===== 4. УТИЛИТЫ РАБОТЫ С JSON-ПУТЯМИ =====
function getByPath(obj, path) { return path.split('.').reduce((o, key) => o?.[key], obj); }
function setByPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) target[keys[i]] = {};
    target = target[keys[i]];
  }
  const last = keys[keys.length - 1];
  const num = Number(value);
  // FIX: Preserve empty strings for text fields, only convert to null for truly empty numeric fields
  if (value === '' && (path.includes('abilities.') || path.includes('bonuses.') || path.includes('level') || path.includes('xp') || path.includes('hp.'))) {
    target[last] = null;
  } else if (value === '') {
    target[last] = '';
  } else {
    target[last] = isNaN(num) ? value : num;
  }
}

// ===== 5. АВТОКОМПЛИТ =====
function setupAutocomplete(input, dropdown, getOptions, onSelect) {
  let selectedIndex = -1;
  function renderDropdown(filter = '') {
    const options = getOptions().filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));
    dropdown.innerHTML = ''; selectedIndex = -1;
    if (options.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'autocomplete-item no-results'; noRes.textContent = 'Нет совпадений';
      dropdown.appendChild(noRes);
    } else {
      options.forEach((opt, idx) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item'; div.textContent = opt;
        div.addEventListener('click', () => { input.value = opt; onSelect(opt); dropdown.classList.remove('active'); });
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
  if (!input.contains(e.target) && !dropdown.contains(e.target)) {dropdown.classList.remove('active');}
  });
}

function initSpeciesAutocomplete() {
  const input = document.getElementById('speciesInput');
  const dropdown = document.getElementById('speciesDropdown');
  if (!input || !dropdown) return;
  setupAutocomplete(input, dropdown, () => Array.from(speciesMap.keys()).sort(), (val) => {
    setByPath(character, 'species', val);
    character.race = '';
    const raceInput = document.getElementById('raceInput');
    if (raceInput) raceInput.value = '';
    detectNaturalEquipment(val, '');
    if (typeof syncAppearanceFromCharacter === 'function') syncAppearanceFromCharacter();
    recalcAll();
  });
}

function initRaceAutocomplete() {
  const input = document.getElementById('raceInput');
  const dropdown = document.getElementById('raceDropdown');
  if (!input || !dropdown) return;
  setupAutocomplete(input, dropdown, () => getSpeciesRaces(character.species), (val) => {
    setByPath(character, 'race', val);
    detectNaturalEquipment(character.species, val);
    if (typeof syncAppearanceFromCharacter === 'function') syncAppearanceFromCharacter();
    recalcAll();
  });
}

// ===== 6. ДВУСТОРОННЯЯ СИНХРОНИЗАЦИЯ С ИСПОЛЬЗОВАНИЕМ ДЕЛЕГИРОВАНИЯ СОБЫТИЙ =====

// Track which elements we've already bound to avoid duplicate listeners
function bindInputElement(el) {
  if (el._boundToCharacter) return;
  el._boundToCharacter = true;

  const path = el.getAttribute('data-path');
  if (!path) return;

  const val = getByPath(character, path);
  if (el.tagName === 'SELECT') el.value = val ?? '';
  else if (el.type === 'number') el.value = val ?? '';
  else el.value = val ?? '';

  // Use BOTH input and change events for maximum compatibility
  const handler = (e) => {
    setByPath(character, path, e.target.value);
    recalcAll();
  };

  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

function bindInputs() {
  // Bind all existing elements
  document.querySelectorAll('[data-path]').forEach(bindInputElement);
}

// ===== 6.1. СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ В character ПЕРЕД ВЫВОДОМ JSON =====

function syncAllToCharacter() {
  // 1. Sync all data-path inputs
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path');
    if (path) {
      setByPath(character, path, el.value);
    }
  });

  // 2. Sync weapon data
  if (typeof saveCurrentWeaponSlot === 'function') {
    saveCurrentWeaponSlot();
  }
  if (typeof syncWeaponSlotsToCharacter === 'function') {
    syncWeaponSlotsToCharacter();
  }

  // 3. Sync armor data
  if (typeof syncArmorToCharacter === 'function') {
    syncArmorToCharacter();
  }

  // 4. Sync inventory — защита от TDZ и отсутствия inventoryApp
  try {
    if (typeof inventoryApp !== 'undefined' && inventoryApp !== null && inventoryApp.getData) {
      character.inventory = inventoryApp.getData();
    }
  } catch (e) {
    // inventoryApp не определён или недоступен — пропускаем
  }

  // 5. Sync magic data
  if (character.magic) {
    const manaRb = document.getElementById('manaRb');
    const manaCurrent = document.getElementById('manaCurrent');
    if (manaRb) character.magic.rb = Number(manaRb.value) || 1;
    if (manaCurrent) character.magic.manaCurrent = Number(manaCurrent.value) || 0;
  }

  // 6. Sync skills
  // Skills are already synced via click handlers on prof buttons

  // 7. Sync features (personality traits)
  syncFeaturesToCharacter();

  // 8. Sync toggle states
  character.isMage = !!character.isMage;
  character.isPsionic = !!character.isPsionic;

    // 9. Sync psionics
  if (typeof getPsionicsData === 'function') {
    character.psionics = getPsionicsData();
  }

  // 10. Sync appearance
  if (typeof getAppearanceData === 'function') {
    const domAppearance = getAppearanceData();
    // Защита: если DOM пуст (вкладка не открывалась), но в character уже есть данные — не затираем
    const domHasRows = (domAppearance.traumas?.length || 0)
                     + (domAppearance.mutations?.length || 0)
                     + (domAppearance.modifications?.length || 0) > 0;
    const charHasRows = (character.appearance?.traumas?.length || 0)
                      + (character.appearance?.mutations?.length || 0)
                      + (character.appearance?.modifications?.length || 0) > 0;

    if (domHasRows || !charHasRows) {
      character.appearance = domAppearance;
    }
    // Иначе: оставляем character.appearance из импортированного JSON
  }

  // 11. Sync proficiencies
  if (typeof syncProficiencies === 'function') {
    syncProficiencies();
  }
}
// ===== 6.5. ПЕРЕСЧЁТ ВСЕХ ЗНАЧЕНИЙ =====
// ===== EFFECT ENGINE (Appearance: mutations, traumas, modules) =====

function collectAppearanceEffects() {
  const appearance = character.appearance || {};
  const result = {
    bonuses: { ac: 0, hp: 0, speedWalk: 0, initiative: 0, will: 0, manaMax: 0, ppMax: 0 },
    bonusSources: { hp: [], speedWalk: [], skills: {} },
    skillConditions: {},
    speedScales: { walk: 0, swim: 0, climb: 0, fly: 0, burrow: 0 },
    naturalWeapons: [],
    naturalArmors: [],
    size: 0
  };

  const sources = [
    { data: appearance.mutations || [], dataKey: 'mutations' },
    { data: appearance.traumas || [], dataKey: 'traumas' },
    { data: appearance.modifications || [], dataKey: 'modifications' }
  ];

  for (const source of sources) {
    for (const row of source.data) {
      if (!row.type) continue;
      const fullItem = (typeof findFullItem === 'function') ? findFullItem(row.type, source.dataKey) : null;
      if (!fullItem || !fullItem.effects) continue;

      for (const eff of fullItem.effects) {
        switch (eff.type) {
          case 'bonus':
            applyAppearanceBonusEffect(result, eff);
            break;
          case 'skill_condition':
            applyAppearanceSkillCondition(result, eff);
            break;
          case 'speed_scale':
            applyAppearanceSpeedScale(result, eff);
            break;
          case 'natural_weapon':
            result.naturalWeapons.push({ ...eff, _source: row.type });
            break;
          case 'natural_armor':
            result.naturalArmors.push({ ...eff, _source: row.type });
            break;
          case 'size':
            result.size += (Number(eff.value) || 0);
            break;
        }
      }
    }
  }

  // Neutralization: advantage + disadvantage cancel each other
  for (const skillName of Object.keys(result.skillConditions)) {
    const conds = result.skillConditions[skillName];
    const hasAdv = conds.some(c => c.condition === 'advantage');
    const hasDis = conds.some(c => c.condition === 'disadvantage');
    if (hasAdv && hasDis) {
      result.skillConditions[skillName] = conds.filter(c =>
        c.condition !== 'advantage' && c.condition !== 'disadvantage'
      );
      if (result.skillConditions[skillName].length === 0) {
        delete result.skillConditions[skillName];
      }
    }
  }

  return result;
}

function applyAppearanceBonusEffect(result, eff) {
  const target = eff.target;
  const value = Number(eff.value) || 0;
  const unit = eff.unit || 'value';

  if (target === 'ac') {
    result.bonuses.ac += value;
  } else if (target === 'hp') {
    if (unit === 'per_level') {
      result.bonuses.hp += value * (Number(character.level) || 1);
    } else if (unit === 'percent') {
      result.bonusSources.hp.push({ value, type: 'percent', source: 'appearance' });
    } else {
      result.bonuses.hp += value;
    }
  } else if (target === 'speedWalk') {
    if (unit === 'percent') {
      // Процентные бонусы к скорости от appearance конвертируем в speed_scale,
      // чтобы применялись вместе с расовым скейлом (травмы/мутации/модули)
      const scaleValue = (Number(eff.value) || 0) / 100;
      result.speedScales['walk'] = (result.speedScales['walk'] || 0) + scaleValue;
    } else {
      result.bonuses.speedWalk += value;
    }
  } else if (target === 'skills' && eff.skill) {
    if (!result.bonusSources.skills[eff.skill]) result.bonusSources.skills[eff.skill] = 0;
    result.bonusSources.skills[eff.skill] += value;
  }
}

function applyAppearanceSkillCondition(result, eff) {
  const skill = eff.skill;
  const condition = eff.condition;
  if (!skill || !condition) return;
  if (!result.skillConditions[skill]) result.skillConditions[skill] = [];
  result.skillConditions[skill].push({ condition, context: eff.context || '' });
}

function applyAppearanceSpeedScale(result, eff) {
  const target = eff.target || 'walk';
  const value = Number(eff.value) || 0;
  result.speedScales[target] = (result.speedScales[target] || 0) + value;
}

function mergeSkillConditions(baseConditions, appearanceConditions) {
  const merged = {};
  for (const skill of Object.keys(baseConditions || {})) {
    merged[skill] = baseConditions[skill];
  }
  for (const skill of Object.keys(appearanceConditions || {})) {
    if (!merged[skill]) {
      merged[skill] = appearanceConditions[skill];
    } else {
      const combined = [...merged[skill], ...appearanceConditions[skill]];
      const hasAdv = combined.some(c => c.condition === 'advantage');
      const hasDis = combined.some(c => c.condition === 'disadvantage');
      if (hasAdv && hasDis) {
        merged[skill] = combined.filter(c => c.condition !== 'advantage' && c.condition !== 'disadvantage');
        if (merged[skill].length === 0) delete merged[skill];
      } else {
        merged[skill] = combined;
      }
    }
  }
  return merged;
}

function recalcAll() {
  try {
    // СНАЧАЛА синхронизируем все данные из UI в character
    syncAllToCharacter();

    // Apply appearance effects (mutations → traumas → modules)
    const appearanceEffects = collectAppearanceEffects();
    character._appearanceEffects = appearanceEffects;

    const level = Math.max(1, Number(character.level) || 1);
    const pb = proficiencyBonus(level);

    // Характеристики (без расовых бонусов)
    const baseAbilities = {};
    const baseMods = {};
    const abilityMods = {};
    for (const key of ['str','dex','con','int','wis','cha']) {
      const raw = character.abilities?.[key];
      const base = (raw !== null && raw !== undefined && !Number.isNaN(Number(raw))) ? Number(raw) : 10;
      const bonus = Number(character.bonuses?.[key]) || 0;
      baseAbilities[key] = base;
      baseMods[key] = abilityModifier(base);
      abilityMods[key] = baseMods[key] + bonus;
    }
    window.computedAbilityMods = abilityMods;

    // Модификаторы характеристик (базовые, для HP и т.п.)
    const mods = baseMods;

    // HP
    const conMod = mods.con;
    const hpBonus = Number(character.bonuses?.hp) || 0;
    const hpPercent = (character.bonusSources?.hp || [])
      .filter(b => b.type === 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    const appHpBonus = appearanceEffects.bonuses.hp;
    const appHpPercent = (appearanceEffects.bonusSources.hp || [])
      .filter(b => b.type === 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    const maxHpVal = Math.max(1, Math.round((maxHp(level, conMod) + hpBonus + appHpBonus) * (1 + (hpPercent + appHpPercent) / 100)));

    // AC
    recalcArmorClass();
    const armor = character._computedArmor || { baseAc: 10, dexApplies: true, dexMax: null };
    const dexMod = abilityMods.dex;
    const dexCap = armor.dexMax;
    const dexContrib = armor.dexApplies ? (dexCap !== null && dexCap !== undefined ? Math.min(dexMod, dexCap) : dexMod) : 0;
    const acBonus = Number(character.bonuses?.ac) || 0;
    const shieldBonus = Number(character.combat?.shieldBonus) || 0;
    const appAcBonus = appearanceEffects.bonuses.ac;
    const totalAc = Math.max(0, (Number(armor.baseAc) || 10) + dexContrib + shieldBonus + acBonus + appAcBonus);

    // Инициатива
    const initBonus = Number(character.bonuses?.initiative) || 0;
    const initPercent = (character.bonusSources?.initiative || [])
      .filter(b => b.type === 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    const initVal = Math.round((initiative(dexMod, initBonus)) * (1 + initPercent / 100));

    // Воля
    const willBonus = Number(character.bonuses?.will) || 0;
    const willVal = willSave(abilityMods.cha, abilityMods.wis, pb, willBonus);

    // Скорость
    const baseSpeed = baseWalkSpeed(baseAbilities.dex);

    // 1. Сначала считаем итоговый масштаб скорости:
    //    начальный скейл расы/вида + модификаторы от appearance (травмы/мутации/модули)
    const appWalkScale = appearanceEffects.speedScales.walk || 0;
    const racialScale = getRacialSpeedScale(character.species, character.race);

    let scaledSpeed = baseSpeed;

    if (racialScale !== null && racialScale !== undefined) {
      const numScale = Number(racialScale);
      if (!Number.isNaN(numScale)) {
        if (numScale >= 10) {
          // Абсолютное значение в футах (например, 30)
          const finalScale = Math.max(0, 1 + appWalkScale);
          scaledSpeed = Math.max(0, Math.floor(numScale * finalScale));
        } else {
          // Множитель (например, ×1, ×1.5): складываем с appearance scale
          const finalScale = Math.max(0, numScale + appWalkScale);
          scaledSpeed = Math.floor(baseSpeed * finalScale);
        }
      }
    } else {
      // Нет расового скейла — считаем базу ×1
      const finalScale = Math.max(0, 1 + appWalkScale);
      scaledSpeed = Math.floor(baseSpeed * finalScale);
    }

    // 2. Потом применяем числовые и процентные бонусы
    const speedBonus = Number(character.bonuses?.speedWalk) || 0;
    const speedPercent = (character.bonusSources?.speedWalk || [])
      .filter(b => b.type === 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    const appSpeedBonus = appearanceEffects.bonuses.speedWalk || 0;


    let speedVal = Math.round((scaledSpeed + speedBonus + appSpeedBonus) * (1 + speedPercent / 100));

    // Грузоподъёмность
    const carryCap = carryCapacity(baseAbilities.str, baseAbilities.con);
    try {
      if (typeof inventoryApp !== 'undefined' && inventoryApp !== null && inventoryApp.carryCapacity !== undefined) {
        inventoryApp.carryCapacity = carryCap;
        inventoryApp.updateDisplay();
      }
    } catch (e) {
      // inventoryApp недоступен
    }

    // XP до следующего уровня
    const xpNext = xpToNextLevel(level);

    // ===== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ =====
    const updateComputed = (selector, val) => {
      const elements = document.querySelectorAll(`[data-computed="${selector}"]`);
      const displayVal = (val === undefined || val === null || Number.isNaN(val)) ? '—' : String(val);

      elements.forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          el.value = displayVal;
        } else {
          el.textContent = displayVal;
        }
      });
    };

    // Основные вычисляемые значения
    updateComputed('hp', maxHpVal);
    updateComputed('ac', totalAc);
    updateComputed('initiative', (initVal >= 0 ? '+' : '') + initVal);
    updateComputed('willSave', (willVal >= 0 ? '+' : '') + willVal);
    updateComputed('speedWalk', speedVal);
    updateComputed('speedSwim', baseAbilities.dex * 2);
    updateComputed('speedClimb', baseAbilities.dex * 2);
    updateComputed('carry', carryCap);
    updateComputed('profBonus', '+' + pb);
    updateComputed('xpNext', xpNext);

    // Модификаторы характеристик (чистые, без бонусов)
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(a => {
      const val = baseMods[a];
      updateComputed(`mod.${a}`, (val >= 0 ? '+' : '') + val);
    });

    // Спасброски
    if (!character.saveProf) character.saveProf = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    if (!character.bonusSources.saves) character.bonusSources.saves = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
    if (!character.bonuses.saves) character.bonuses.saves = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    const saves = {};
    for (const key of ['str','dex','con','int','wis','cha']) {
      const profLevel = character.saveProf?.[key] || 0;
      const profVal = getProficiencyValue(String(profLevel), pb);
      const numericBonus = (character.bonusSources?.saves?.[key] || [])
        .filter(b => b.type !== 'percent')
        .reduce((s, b) => s + (Number(b.value) || 0), 0);
      const percentBonus = (character.bonusSources?.saves?.[key] || [])
        .filter(b => b.type === 'percent')
        .reduce((s, b) => s + (Number(b.value) || 0), 0);
      saves[key] = Math.round((abilityMods[key] + profVal + numericBonus) * (1 + percentBonus / 100));
      character.bonuses.saves[key] = numericBonus;
    }
    window.computedSaves = saves;

    // Обновление отображения спасбросков
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(a => {
      updateComputed(`save.${a}`, (saves[a] >= 0 ? '+' : '') + saves[a]);
    });

    // Обновление кнопок владения спасбросками
    document.querySelectorAll('#savesGrid .prof-btn').forEach(btn => {
      const saveKey = btn.dataset.save;
      const profLevel = parseInt(btn.dataset.prof);
      const active = (character.saveProf?.[saveKey] || 0) === profLevel;
      btn.classList.remove('active', 'active-green', 'active-blue');
      if (active) {
        btn.classList.add('active');
        if (profLevel === 2) btn.classList.add('active-green');
        if (profLevel === 3) btn.classList.add('active-blue');
      }
    });

    // Цветовые состояния хитов
    const hpCurrentInput = document.querySelector('[data-path="hp.current"]');
    if (hpCurrentInput && !hpCurrentInput.classList.contains('hp-current')) {
      hpCurrentInput.classList.add('hp-current');
    }
    if (hpCurrentInput) {
      const current = Number(character.hp.current) || 0;
      const pct = maxHpVal > 0 ? current / maxHpVal : 0;
      hpCurrentInput.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
      if (!character.hp.current && character.hp.current !== 0) hpCurrentInput.classList.add('hp-empty');
      else if (pct >= 0.5) hpCurrentInput.classList.add('hp-green');
      else if (pct >= 0.25) hpCurrentInput.classList.add('hp-orange');
      else hpCurrentInput.classList.add('hp-red');
    }

    // Ограничение текущих хитов максимальным значением
    if (character.hp.current > maxHpVal) {
      character.hp.current = maxHpVal;
      if (hpCurrentInput) hpCurrentInput.value = maxHpVal;
    }
    if (character.hp.temp < 0) character.hp.temp = 0;

    // Временные хиты
    const hpTemp = document.getElementById('hp-temp');
    if (hpTemp && !hpTemp.classList.contains('hp-temp')) {
      hpTemp.classList.add('hp-temp');
    }
    if (hpTemp) {
      const temp = Number(character.hp.temp) || 0;
      hpTemp.classList.remove('hp-temp-active', 'hp-temp-empty');
      if (temp > 0) hpTemp.classList.add('hp-temp-active');
      else hpTemp.classList.add('hp-temp-empty');
    }

    // Скорость полёта
    const flyCard = document.getElementById('flyCard');
    const { species, race } = getRacialData(character.species, character.race);
    let flySpeed = null;
    if (race && race.speed_fly) flySpeed = race.speed_fly;
    else if (species && species.speed_fly) flySpeed = species.speed_fly;
    if (flySpeed !== null && flyCard) {
      flyCard.classList.remove('hidden');
      updateComputed('speedFly', flySpeed);
    } else if (flyCard) {
      flyCard.classList.add('hidden');
    }

    // Расовые черты
    renderTraits();

    // Мана
    updateMana();

    // Псионика
    if (character.isPsionic && typeof renderPsionics === 'function') {
      renderPsionics();
    }

        // Псионика — главный экран
    const mainPsionicGroup = document.getElementById('mainPsionicGroup');
    if (mainPsionicGroup) {
      mainPsionicGroup.style.display = character.isPsionic ? 'block' : 'none';
    }
    if (character.isPsionic && typeof getPsionicMaxPP === 'function') {
      const maxPP = getPsionicMaxPP();
      updateComputed('ppMax', maxPP);
      const mainPpCurrent = document.getElementById('mainPpCurrent');
      if (mainPpCurrent) {
        let current = Number(mainPpCurrent.value) || 0;
        if (current > maxPP) { current = maxPP; mainPpCurrent.value = current; }
        if (typeof psionicState !== 'undefined') psionicState.ppCurrent = current;

        mainPpCurrent.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
        if (!mainPpCurrent.value && mainPpCurrent.value !== '0') mainPpCurrent.classList.add('hp-empty');
        else if (current >= maxPP * 0.5) mainPpCurrent.classList.add('hp-green');
        else if (current >= maxPP * 0.25) mainPpCurrent.classList.add('hp-orange');
        else mainPpCurrent.classList.add('hp-red');
      }
    }

    // Навыки
    // Merge appearance skill conditions
    character._mergedSkillConditions = mergeSkillConditions(character.skillConditions, appearanceEffects.skillConditions);
    // Merge appearance skill bonuses
    for (const skillName of Object.keys(appearanceEffects.bonusSources.skills || {})) {
      if (!character.bonuses.skills) character.bonuses.skills = {};
      if (!character.bonuses.skills[skillName]) character.bonuses.skills[skillName] = 0;
    }
    if (typeof renderSkills === 'function') renderSkills();

    // Вдохновение
    renderInspiration();

    // Оружие
    if (typeof recalcWeaponHitBonus === 'function') recalcWeaponHitBonus();
    if (typeof recalcWeaponDamage === 'function') recalcWeaponDamage();

    // JSON preview
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);

    // Sidebar
    refreshSidebar();

  } catch (err) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА в recalcAll():', err);
    console.error('Stack:', err.stack);
  }
}
// ===== 6.6. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
function setSaveProf(ability, level) {
  if (!character.saveProf) character.saveProf = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  character.saveProf[ability] = level;
  recalcAll();
}

function init() {
  loadOrigins();
  loadSkills();
  loadWeaponData();
  loadArmorData();
  loadTraitsData();
  loadNaturalEquipment().then(() => {
    detectNaturalEquipment(character.species, character.race);
  });
  loadMagicData();
  bindInputs();

  // Setup MutationObserver to auto-bind new elements with data-path
  setupDynamicBinding();

  updateDynamicTabs();
  updateToggleButtons();
  if (typeof initSidebar === 'function') initSidebar();
  if (typeof setupWeaponAutocomplete === 'function') setupWeaponAutocomplete();
  if (typeof setupWeaponListeners === 'function') setupWeaponListeners();
  if (typeof setupWeaponDurabilityListeners === 'function') setupWeaponDurabilityListeners();
  recalcAll();
}

// ===== 6.7. MutationObserver ДЛЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ =====

function setupDynamicBinding() {
  const observer = new MutationObserver((mutations) => {
    let shouldRebind = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute && node.hasAttribute('data-path')) {
              bindInputElement(node);
            }
            if (node.querySelectorAll) {
              const newInputs = node.querySelectorAll('[data-path]');
              newInputs.forEach(bindInputElement);
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ===== 7. ЭКСПОРТ / ИМПОРТ JSON =====
function exportJSON() {
  // Sync everything before export
  syncAllToCharacter();

  if (currentNaturalArmorIndex < 0) {
    armorSlots[currentArmorSlot] = JSON.parse(JSON.stringify(character.armor));
  }
  character.armorSets = JSON.parse(JSON.stringify(armorSlots));
  // Save weapon slots into character for export
  character.weaponSlots = JSON.parse(JSON.stringify(weaponSlots));
  character.currentWeaponSlot = currentWeaponSlot;
  character.currentNaturalWeaponIndex = currentNaturalWeaponIndex;
  character.currentNaturalArmorIndex = currentNaturalArmorIndex;
  const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (character.name || 'character') + '.json'; a.click(); URL.revokeObjectURL(url);
}

function importJSON(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
character = deepMerge({
  // 1. Основная информация
  name: "", species: "", race: "", level: 1, xp: 0,

  // 2. Внешность
  appearance: null,

  // 3. Личность и черты
  personality: { background: "", beliefs: "", fears: "", goals: "" },
  features: { personality: [], physical: [], supernatural: [], experience: [] },

  // 4. Характеристики и спасброски
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saveProf: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  inspiration: { str: false, dex: false, con: false, int: false, wis: false, cha: false },

  // 5. Боевые параметры
  hp: { current: 0, temp: 0 },
  combat: { baseAc: 10, shieldBonus: 0, dexCap: null },
  armor: [],
  armorSets: [[], [], [], [], []],

  // 6. Бонусы
  bonuses: {
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
    ac: 0, initiative: 0, will: 0, hp: 0,
    speedWalk: 0, manaMax: 0, ppMax: 0,
    skills: {},
    saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  },
  bonusSources: {
    hp: [], initiative: [], will: [],
    speedWalk: [], manaMax: [], ppMax: [],
    skills: {},
    saves: { str: [], dex: [], con: [], int: [], wis: [], cha: [] }
  },

  // 7. Навыки
  skills: {},
  skillConditions: {},

  // 8. Владения
  proficiencies: { languages: [], weapons: [], armor: [], tools: [] },

  // 9. Магия
  isMage: false,
  magic: { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] },

  // 10. Псионика
  isPsionic: false,
  psionics: { discipline: 'telekinesis', level: 1, ppCurrent: 0, overloadCount: 0, overloadDice: 4 },

  // 11. Инвентарь
  inventory: { storages: [], items: [], modifiers: [] },

  // 12. Умения
  abilitiesList: [],

  // 13. Оружие и слоты
  weaponSlots: [null, null, null, null, null],
  currentWeaponSlot: 0,
  currentNaturalWeaponIndex: -1,

  // 14. Заметки
  notes: "",

  // 15. Служебные
  currentNaturalArmorIndex: -1,
    raceForm: ""
    }, data);
      document.querySelectorAll('[data-path]').forEach(el => {
        const path = el.getAttribute('data-path');
        const val = getByPath(character, path); el.value = val ?? '';
      });
      if (character.inventory) inventoryApp.loadData(character.inventory);
      if (character.armorSets && Array.isArray(character.armorSets)) {
        armorSlots = JSON.parse(JSON.stringify(character.armorSets));
        const activeSet = armorSlots[currentArmorSlot] || [];
        character.armor = JSON.parse(JSON.stringify(activeSet));
        if (activeSet.length > 0) loadArmorFromData(activeSet);
      } else if (character.armor && Array.isArray(character.armor)) {
        armorSlots[0] = JSON.parse(JSON.stringify(character.armor));
        character.armor = JSON.parse(JSON.stringify(character.armor));
        loadArmorFromData(character.armor);
      }
      updateArmorSlotStyles();

      // Restore weapon slots
      if (character.weaponSlots && Array.isArray(character.weaponSlots)) {
        weaponSlots = JSON.parse(JSON.stringify(character.weaponSlots));
        currentWeaponSlot = character.currentWeaponSlot || 0;
        const wData = weaponSlots[currentWeaponSlot];
        if (wData) {
          loadWeaponSlotData(wData);
        } else {
          clearWeaponFields();
        }
        updateWeaponSlotStyles();
        document.querySelectorAll('#weaponSlots .weapon-slot-btn').forEach((el, i) => {
          el.classList.toggle('active', i === currentWeaponSlot);
        });
      }
      if (!character.bonuses.skills) character.bonuses.skills = {};
      if (!character.bonusSources.skills) character.bonusSources.skills = {};
      currentNaturalWeaponIndex = -1;
      currentNaturalArmorIndex = -1;
      if (character.magic) setMagicData(character.magic);
      else setMagicData(null);

      const savedMana = data.magic?.manaCurrent;
if (savedMana !== undefined) {
  character.magic.manaCurrent = savedMana;
  const el = document.getElementById('manaCurrent');
  if (el) el.value = savedMana;
}

      // Restore psionics
      if (typeof setPsionicsData === 'function') {
        setPsionicsData(character.psionics);
      }

      // Restore appearance
      if (typeof loadAppearanceData === 'function') {
        loadAppearanceData(character.appearance);
      }
      if (typeof syncAppearanceFromCharacter === 'function') {
        syncAppearanceFromCharacter();
      }

      // Restore natural equipment indices
      if (character.currentNaturalWeaponIndex !== undefined) {
        currentNaturalWeaponIndex = character.currentNaturalWeaponIndex;
      }
      if (character.currentNaturalArmorIndex !== undefined) {
        currentNaturalArmorIndex = character.currentNaturalArmorIndex;
      }

      // Restore features
      loadFeaturesFromCharacter();

      // Restore proficiencies
      if (typeof loadProficienciesFromCharacter === 'function') {
        loadProficienciesFromCharacter();
      }

      if (character.bonusSources) {
        for (const field of Object.keys(character.bonusSources)) {
          if (field === 'skills') {
            // skills is an object { skillName: [bonuses] }, not an array
            if (!character.bonusSources.skills) character.bonusSources.skills = {};
            for (const skillName of Object.keys(character.bonusSources.skills)) {
              const arr = character.bonusSources.skills[skillName];
              if (Array.isArray(arr)) {
                character.bonusSources.skills[skillName] = arr.map(b => ({
                  value: b.value !== undefined ? b.value : 0,
                  source: b.source || '',
                  type: b.type || 'value'
                }));
              }
            }
            continue;
          }
          // Other fields are arrays of bonuses
          const arr = character.bonusSources[field];
          if (Array.isArray(arr)) {
            character.bonusSources[field] = arr.map(b => ({
              value: b.value !== undefined ? b.value : 0,
              source: b.source || '',
              type: b.type || 'value'
            }));
          }
        }
      }
      recalcAll();
    } catch (err) { alert('Ошибка чтения JSON: ' + err.message); }
  };
  reader.readAsText(file); input.value = '';
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else { target[key] = source[key]; }
  }
  return target;
}

function resetCharacter() {
  if (!confirm('Сбросить все данные персонажа?')) return;

  character = {
    // 1. Основная информация
    name: "", species: "", race: "", level: 1, xp: 0,

    // 2. Внешность
    appearance: null,

    // 3. Личность и черты
    personality: { background: "", beliefs: "", fears: "", goals: "" },
    features: { personality: [], physical: [], supernatural: [], experience: [] },

    // 4. Характеристики и спасброски
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProf: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    inspiration: { str: false, dex: false, con: false, int: false, wis: false, cha: false },

    // 5. Боевые параметры
    hp: { current: 0, temp: 0 },
    combat: { baseAc: 10, shieldBonus: 0, dexCap: null },
    armor: [],
    armorSets: [[], [], [], [], []],

    // 6. Бонусы
    bonuses: {
      str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
      ac: 0, initiative: 0, will: 0, hp: 0,
      speedWalk: 0, manaMax: 0, ppMax: 0,
      skills: {},
      saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
    },
    bonusSources: {
      hp: [], initiative: [], will: [],
      speedWalk: [], manaMax: [], ppMax: [],
      skills: {},
      saves: { str: [], dex: [], con: [], int: [], wis: [], cha: [] }
    },

    // 7. Навыки
    skills: {},
    skillConditions: {},

    // 8. Владения
    proficiencies: { languages: [], weapons: [], armor: [], tools: [] },

    // 9. Магия
    isMage: false,
    magic: { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] },

    // 10. Псионика
    isPsionic: false,
    psionics: { discipline: 'telekinesis', level: 1, ppCurrent: 0, overloadCount: 0, overloadDice: 4 },

    // 11. Инвентарь
    inventory: { storages: [], items: [], modifiers: [] },

    // 12. Умения
    abilitiesList: [],

    // 13. Оружие и слоты
    weaponSlots: [null, null, null, null, null],
    currentWeaponSlot: 0,
    currentNaturalWeaponIndex: -1,

    // 14. Заметки
    notes: "",

    // 15. Служебные
    currentNaturalArmorIndex: -1,
    raceForm: ""
  };

  // Очистка UI-полей
  const speciesInput = document.getElementById('speciesInput');
  const raceInput = document.getElementById('raceInput');
  if (speciesInput) speciesInput.value = '';
  if (raceInput) raceInput.value = '';

  inventoryApp.loadData(character.inventory);
  armorSlots = [[], [], [], [], []];
  currentArmorSlot = 0;
  weaponSlots = [null, null, null, null, null];
  currentWeaponSlot = 0;
  currentNaturalWeaponIndex = -1;
  currentNaturalArmorIndex = -1;

  clearArmorList();
  clearWeaponFields();
  updateArmorSlotStyles();
  updateWeaponSlotStyles();

  const abilitiesList = document.getElementById('abilitiesList');
  if (abilitiesList) {
    abilitiesList.innerHTML = '<div class="ability-row-placeholder">Пассивные и активные умения, таланты, черты, способности класса...</div>';
  }

  // Очистка черт
  ['personality', 'physical', 'supernatural', 'experience'].forEach(cat => {
    const list = document.getElementById('features-' + cat);
    if (list) {
      list.innerHTML = '<div class="feature-placeholder">Черты характера, убеждения, привязанности, слабости…</div>';
    }
  });

  // Очистка владений
  ['languages', 'weapons', 'armor', 'tools'].forEach(cat => {
    const list = document.getElementById('prof-' + cat);
    if (list) list.innerHTML = '';
  });

  if (typeof refreshSidebar === 'function') refreshSidebar();

  // Re-bind всех инпутов
  document.querySelectorAll('[data-path]').forEach(el => {
    el._boundToCharacter = false;
    const path = el.getAttribute('data-path');
    const val = getByPath(character, path);
    if (el.tagName === 'SELECT') el.value = val ?? '';
    else if (el.type === 'number') el.value = val ?? '';
    else el.value = val ?? '';
  });
  bindInputs();

  document.querySelectorAll('[data-toggle]').forEach(btn => btn.classList.remove('active'));
  renderInspiration();
  recalcAll();
}

// ===== 8. БОНУСНЫЙ ДИАЛОГ =====

function openBonusModal(field, label) {
  BonusModalState.currentField = field;
  BonusModalState.currentLabel = label;
  BonusModalState.currentSkillName = null;
  const condBlock = document.getElementById('skillConditionBlock');
  if (condBlock) condBlock.classList.add('hidden');
  if (!character.bonusSources) character.bonusSources = {};

  if (field === 'skills') {
    if (!character.bonusSources.skills) character.bonusSources.skills = {};
    if (!character.bonusSources.skills[label]) character.bonusSources.skills[label] = [];
    BonusModalState.editingBonuses = JSON.parse(JSON.stringify(character.bonusSources.skills[label])).map(b => ({
      value: b.value !== undefined ? b.value : 0,
      source: b.source || '',
      type: b.type || 'value'
    }));
  } else if (field.startsWith('save.')) {
    const saveKey = field.split('.')[1];
    if (!character.bonusSources.saves || typeof character.bonusSources.saves !== 'object' || Array.isArray(character.bonusSources.saves)) {
      character.bonusSources.saves = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
    }
    if (!character.bonusSources.saves[saveKey]) character.bonusSources.saves[saveKey] = [];
    BonusModalState.editingBonuses = JSON.parse(JSON.stringify(character.bonusSources.saves[saveKey])).map(b => ({
      value: b.value !== undefined ? b.value : 0,
      source: b.source || '',
      type: b.type || 'value'
    }));
  } else {
    if (!character.bonusSources[field]) character.bonusSources[field] = [];
    BonusModalState.editingBonuses = JSON.parse(JSON.stringify(character.bonusSources[field])).map(b => ({
      value: b.value !== undefined ? b.value : 0,
      source: b.source || '',
      type: b.type || 'value'
    }));
  }
  const titleEl = document.getElementById('bonusModalTitle');
  if (titleEl) titleEl.textContent = 'Бонусы: ' + label;
  renderBonusList();
  openModal('bonusModal');
}

function renderBonusList() {
  const list = document.getElementById('bonusList');
  if (!list) return;
  list.innerHTML = '';
  BonusModalState.editingBonuses.forEach((b, i) => {
    const isPercent = b.type === 'percent';
    const displayValue = b.value !== undefined && b.value !== null ? b.value : 0;
    const row = document.createElement('div');
    row.className = 'modifier-row bonus-row';
    row.dataset.index = i;
    row.innerHTML = `
      <div class="bonus-type-toggle" onclick="toggleBonusType(${i})" title="${isPercent ? 'Процентный бонус' : 'Числовой бонус'}">
        <div class="bonus-type-indicator ${isPercent ? 'percent' : 'value'}">
          <span class="bonus-type-icon">${isPercent ? '%' : '#'}</span>
          <span class="bonus-type-label">${isPercent ? '%' : '±'}</span>
        </div>
      </div>
      <input type="number" class="field-input ${isPercent ? 'bonus-percent' : 'bonus-value'}" value="${displayValue}" onchange="updateBonus(${i}, 'value', this.value)" placeholder="${isPercent ? 'Процент' : 'Значение'}" style="width:90px;text-align:center;">
      <input type="text" class="field-input" value="${escapeHtml(b.source || '')}" onchange="updateBonus(${i}, 'source', this.value)" placeholder="Источник (способность)" style="flex:1;">
      <button class="btn btn-small btn-secondary" onclick="removeBonusRow(${i})" style="padding:4px 10px;background:linear-gradient(135deg,#e74c3c,#c0392b);">🗑️</button>
    `;
    list.appendChild(row);
  });
  updateBonusTotals();
}

function toggleBonusType(index) {
  if (!BonusModalState.editingBonuses[index]) return;
  BonusModalState.editingBonuses[index].type = BonusModalState.editingBonuses[index].type === 'percent' ? 'value' : 'percent';
  renderBonusList();
}

function updateBonusTotals() {
  const numericTotal = BonusModalState.editingBonuses
    .filter(b => b.type !== 'percent')
    .reduce((s, b) => s + (Number(b.value) || 0), 0);
  const percentTotal = BonusModalState.editingBonuses
    .filter(b => b.type === 'percent')
    .reduce((s, b) => s + (Number(b.value) || 0), 0);

  const numericEl = document.getElementById('bonusTotalNumeric');
  const percentEl = document.getElementById('bonusTotalPercent');
  const finalEl = document.getElementById('bonusTotalFinal');

  if (numericEl) numericEl.textContent = (numericTotal >= 0 ? '+' : '') + numericTotal;
  if (percentEl) percentEl.textContent = (percentTotal >= 0 ? '+' : '') + percentTotal + '%';

  if (finalEl) {
    if (BonusModalState.currentField === 'manaMax' || BonusModalState.currentField === 'hp' || BonusModalState.currentField === 'speedWalk') {
      finalEl.textContent = `${numericTotal >= 0 ? '+' : ''}${numericTotal} × ${100 + percentTotal}%`;
    } else {
      finalEl.textContent = (numericTotal >= 0 ? '+' : '') + numericTotal;
    }
  }
}

function updateBonus(i, field, val) {
  if (field === 'value') {
    const parsed = parseFloat(val);
    BonusModalState.editingBonuses[i].value = isNaN(parsed) ? 0 : parsed;
  } else {
    BonusModalState.editingBonuses[i].source = val;
  }
  updateBonusTotals();
}

function addBonusRow() {
  BonusModalState.editingBonuses.push({ value: 0, source: '', type: 'value' });
  renderBonusList();
}

function removeBonusRow(i) {
  BonusModalState.editingBonuses.splice(i, 1);
  renderBonusList();
}

function setSkillCondition(condition) {
  if (!BonusModalState.currentSkillName) return;
  if (!character.skillConditions) character.skillConditions = {};
  if (condition) {
    character.skillConditions[BonusModalState.currentSkillName] = condition;
  } else {
    delete character.skillConditions[BonusModalState.currentSkillName];
  }
  updateConditionButtons(BonusModalState.currentSkillName);
  if (typeof renderSkills === 'function') renderSkills();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function updateConditionButtons(skillName) {
  const cond = character.skillConditions?.[skillName];
  document.getElementById('condNone')?.classList.toggle('active', !cond);
  document.getElementById('condAdvantage')?.classList.toggle('active', cond === 'advantage');
  document.getElementById('condDisadvantage')?.classList.toggle('active', cond === 'disadvantage');
}

function closeBonusModal() {
  closeModal('bonusModal');
  BonusModalState.currentField = null;
}

function saveBonusModal() {
  if (BonusModalState.currentField === null) return;

  // Ensure bonus structures exist
  if (!character.bonuses) {
    character.bonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ac: 0, initiative: 0, will: 0, hp: 0, speedWalk: 0, manaMax: 0, skills: {}, saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } };
  }
  if (!character.bonusSources) {
    character.bonusSources = { hp: [], initiative: [], will: [], speedWalk: [], manaMax: [], skills: {}, saves: { str: [], dex: [], con: [], int: [], wis: [], cha: [] } };
  }

  if (BonusModalState.currentField === 'skills') {
    const skillName = BonusModalState.currentLabel;
    if (!character.bonusSources.skills) character.bonusSources.skills = {};
    character.bonusSources.skills[skillName] = BonusModalState.editingBonuses.filter(b => b.source || b.value !== 0 || b.type === 'percent');
    const numericTotal = character.bonusSources.skills[skillName]
      .filter(b => b.type !== 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    if (!character.bonuses.skills) character.bonuses.skills = {};
    character.bonuses.skills[skillName] = numericTotal;
    // Force immediate re-render of skills grid
    if (typeof renderSkills === 'function') renderSkills();
  } else if (BonusModalState.currentField.startsWith('save.')) {
    const saveKey = BonusModalState.currentField.split('.')[1];
    if (!character.bonusSources) character.bonusSources = {};
    if (!character.bonusSources.saves || typeof character.bonusSources.saves !== 'object' || Array.isArray(character.bonusSources.saves)) {
      character.bonusSources.saves = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
    }
    if (!character.bonusSources.saves[saveKey]) character.bonusSources.saves[saveKey] = [];
    character.bonusSources.saves[saveKey] = BonusModalState.editingBonuses.filter(b => b.source || b.value !== 0 || b.type === 'percent');
    const numericTotal = character.bonusSources.saves[saveKey]
      .filter(b => b.type !== 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    if (!character.bonuses) character.bonuses = {};
    if (!character.bonuses.saves) character.bonuses.saves = {};
    character.bonuses.saves[saveKey] = numericTotal;
  } else {
    character.bonusSources[BonusModalState.currentField] = BonusModalState.editingBonuses.filter(b => b.source || b.value !== 0 || b.type === 'percent');
    const numericTotal = character.bonusSources[BonusModalState.currentField]
      .filter(b => b.type !== 'percent')
      .reduce((s, b) => s + (Number(b.value) || 0), 0);
    character.bonuses[BonusModalState.currentField] = numericTotal;
  }
  closeBonusModal();
  recalcAll();
}

// ===== ВДОХНОВЕНИЕ =====
function toggleInspiration(ability) {
  if (!character.inspiration) {
    character.inspiration = { str: false, dex: false, con: false, int: false, wis: false, cha: false };
  }
  character.inspiration[ability] = !character.inspiration[ability];
  renderInspiration();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function renderInspiration() {
  document.querySelectorAll('.inspiration-cell').forEach(cell => {
    const ability = cell.dataset.ability;
    const active = character.inspiration?.[ability] || false;
    cell.classList.toggle('active', active);
  });
}