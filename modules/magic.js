// ============================================================
// MAGIC MODULE — Магия: школы, чародейство, заклинания, банк душ
// ============================================================

let schoolsData = [];
let spellsData = [];
let magicConfig = {};
const schoolsUrl = 'data/schools.json';
const spellsUrl = 'data/spells.json';
const magicConfigUrl = 'data/magic.json';

const ABILITY_NAMES = {
  str: 'СИЛ', dex: 'ЛОВ', con: 'ТЕЛ',
  int: 'ИНТ', wis: 'МДР', cha: 'ХАР'
};

let activeMagicSubtabs = new Set();

// ===== ЗАГРУЗКА =====
async function loadMagicData() {
  try {
    const sRes = await fetch(schoolsUrl);
    const sData = await sRes.json();
    schoolsData = sData.schools || [];
  } catch (e) {
    console.error('Не удалось загрузить schools.json:', e);
  }
  try {
    const pRes = await fetch(spellsUrl);
    const pData = await pRes.json();
    spellsData = pData.spells || [];
  } catch (e) {
    console.error('Не удалось загрузить spells.json:', e);
  }
  try {
    const cfgRes = await fetch(magicConfigUrl);
    magicConfig = await cfgRes.json();
  } catch (e) {
    console.warn('Не удалось загрузить magic.json:', e);
    magicConfig = { schoolIcons: {}, spellCardLayout: {} };
  }

  if (!character.magic) {
    character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  }
  const manaRb = document.getElementById('manaRb');
  const manaCurrent = document.getElementById('manaCurrent');
  if (manaRb) {
    manaRb.value = character.magic.rb;
    manaRb.oninput = (e) => updateManaRb(e.target.value);
  }
  if (manaCurrent) manaCurrent.value = character.magic.manaCurrent;
  renderMagicSchools();
  renderSpellsTable();
  updateMana();
}

function getSchoolIcon(schoolName) {
  return (magicConfig.schoolIcons && magicConfig.schoolIcons[schoolName]) || '📖';
}



// ===== МАНА =====
function getAbilityMod(ability) {
  const score = Number(character.abilities[ability]) || 10;
  return abilityModifier(score);
}

function getProfBonus() {
  return proficiencyBonus(Number(character.level) || 1);
}

function getTotalSchoolLevels() {
  if (!character.magic) return 0;
  return character.magic.schools.reduce((sum, s) => sum + (Number(s.level) || 0), 0);
}

function getUniqueAbilityMods() {
  const mods = {};
  if (!character.magic) return mods;
  for (const s of character.magic.schools) {
    const data = schoolsData.find(sd => sd.name === s.name);
    if (!data) continue;
    let abilities = data.ability || '';
    if (Array.isArray(abilities)) {
      for (const a of abilities) {
        const key = a.toLowerCase();
        mods[key] = getAbilityMod(key);
      }
    } else if (abilities) {
      const key = abilities.toLowerCase();
      mods[key] = getAbilityMod(key);
    }
  }
  return mods;
}

function updateMana() {
  if (!character.magic) return;
  if (!schoolsData || schoolsData.length === 0) return;
  const rb = Number(document.getElementById('manaRb')?.value) || 1;
  character.magic.rb = rb;

  const totalLevels = getTotalSchoolLevels();
  const uniqueMods = getUniqueAbilityMods();
  const totalMods = Object.values(uniqueMods).reduce((a, b) => a + b, 0);
  const baseMana = 10 + 2 * totalLevels + totalMods * rb;
  const numericBonus = Number(character.bonuses.manaMax) || 0;
  const percentBonuses = (character.bonusSources.manaMax || [])
    .filter(b => b.type === 'percent')
    .reduce((s, b) => s + (Number(b.value) || 0), 0);
  const multiplier = 1 + percentBonuses / 100;
  const manaMax = Math.round((baseMana + numericBonus) * multiplier);

  const manaMaxEl = document.getElementById('manaMax');
  if (manaMaxEl) manaMaxEl.textContent = manaMax;

  const manaCurrentEl = document.getElementById('manaCurrent');
  if (manaCurrentEl) {
    let current = Number(manaCurrentEl.value) || 0;
    if (current > manaMax) { current = manaMax; manaCurrentEl.value = current; }
    character.magic.manaCurrent = current;

    let pct = manaMax > 0 ? current / manaMax : 0;
    manaCurrentEl.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
    if (!manaCurrentEl.value && manaCurrentEl.value !== '0') manaCurrentEl.classList.add('hp-empty');
    else if (pct >= 0.5) manaCurrentEl.classList.add('hp-green');
    else if (pct >= 0.25) manaCurrentEl.classList.add('hp-orange');
    else manaCurrentEl.classList.add('hp-red');
  }

  const statsEl = document.getElementById('manaStats');
  if (statsEl) {
    const entries = Object.entries(uniqueMods);
    if (entries.length === 0) {
      statsEl.innerHTML = '<span class="mana-empty">Хар-ки: —</span>';
    } else {
      statsEl.innerHTML = entries.map(([k, v]) => {
        const valClass = v > 0 ? 'ability-value' : v < 0 ? 'ability-value negative' : 'ability-value zero';
        return `<div class="ability-badge"><span class="ability-name">${ABILITY_NAMES[k] || k.toUpperCase()}</span><span class="${valClass}">${v >= 0 ? '+' : ''}${v}</span></div>`;
      }).join('');
    }
  }

  updateMagicSchoolsValues();
  updateAllSpellsManaCost();

  document.querySelectorAll('[data-computed="manaMax"]').forEach(el => {
    el.textContent = manaMax;
  });

  const mainManaCurrent = document.getElementById('mainManaCurrent');
  if (mainManaCurrent && character.magic) {
    mainManaCurrent.value = character.magic.manaCurrent || 0;
  }

  const mainManaGroup = document.getElementById('mainManaGroup');
  if (mainManaGroup) {
    mainManaGroup.style.display = character.isMage ? 'block' : 'none';
  }

  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);

  const manaShortRest = document.getElementById('manaShortRest');
  if (manaShortRest) {
    manaShortRest.textContent = Math.floor(manaMax / 4);
  }

  // Обновляем открытые вкладки, зависящие от характеристик и уровня школы
  if (character.magic && character.magic.schools) {
    character.magic.schools.forEach((s, i) => {
      if (s.name === 'Некромантия') {
        refreshNecromancyTab(i);
      }
      if (s.name === 'Теургия') {
        refreshTheurgyTab(i);
      }
    });
  }
}

// ===== ОТДЫХ (мана) =====
function restMana(type) {
  const maxMana = Number(document.getElementById('manaMax')?.textContent) || 0;
  const manaCurrentInput = document.getElementById('manaCurrent');
  if (!manaCurrentInput || maxMana <= 0) return;

  let current = Number(manaCurrentInput.value) || 0;

  if (type === 'short') {
    const restore = Math.floor(maxMana / 4);
    current = Math.min(maxMana, current + restore);
  } else if (type === 'long') {
    const restore = Math.floor(maxMana / 2);
    current = Math.min(maxMana, current + restore);
  }

  manaCurrentInput.value = current;
  if (character.magic) character.magic.manaCurrent = current;
  updateMana();
}

function updateManaRb(value) {
  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  character.magic.rb = Number(value) || 1;
  updateMana();
}

// ===== ШКОЛЫ =====
function getEffectiveModifier(schoolData) {
  let abilities = schoolData.ability || '';
  if (Array.isArray(abilities)) {
    const mods = abilities.map(a => getAbilityMod(a.toLowerCase()));
    return Math.floor(mods.reduce((a, b) => a + b, 0) / mods.length);
  }
  return abilities ? getAbilityMod(abilities.toLowerCase()) : 0;
}

function renderMagicSchools() {
  const container = document.getElementById('magicSchoolsList');
  if (!container || !character.magic) return;
  container.innerHTML = '';

  character.magic.schools.forEach((school, index) => {
    const data = schoolsData.find(s => s.name === school.name);
    if (!data) return;

    const card = document.createElement('div');
    card.className = 'magic-school-card';
    card.dataset.schoolIndex = index;
    card.dataset.schoolType = 'school';
    card.dataset.schoolName = data.name;
    card.onclick = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      openSchoolDetailTab(data.name, 'school', index);
    };

    let abilities = Array.isArray(data.ability) ? data.ability.filter(Boolean) : [data.ability].filter(Boolean);
    const abilityDisplay = abilities.map(a => ABILITY_NAMES[a.toLowerCase()] || a.toUpperCase()).join('/');

    const level = Number(school.level) || 1;
    const mult = data.has_multiplier ? (Number(school.multiplier) || data.multiplier_default || 1.0) : 1.0;

    let resourceHtml = '';
    if (data.resource_type === 'list') {
      const options = (data.resource_list || []).map(r =>
        `<option value="${escapeHtml(r)}" ${r === (school.resourceValue || '') ? 'selected' : ''}>${escapeHtml(r)}</option>`
      ).join('');
      resourceHtml = `
        <label class="field-label" style="font-size:10px;">${escapeHtml(data.resource_name || 'Ресурс')}</label>
        <select class="field-input" style="padding:4px 8px;font-size:12px;min-width:100px;" onchange="updateSchoolResource(${index}, this.value)">${options}</select>
      `;
    } else if (data.name === 'Теургия') {
      const wisMod = Math.max(0, getAbilityMod('wis'));
      const level = Number(school.level) || 1;
      const maxGrace = level * wisMod;
      const currentGrace = Number(school.graceCurrent) || 0;
      const graceColor = currentGrace >= maxGrace ? '#e74c3c' : '#7da67d';
      const deityOptions = (data.religions || []).map(r =>
        `<option value="${escapeHtml(r.name)}" ${r.name === school.deity ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
      ).join('');
      resourceHtml = `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <select class="field-input" style="padding:4px 8px;font-size:12px;min-width:140px;" onchange="updateTheurgyDeity(${index}, this.value)">
            <option value="">— Бог —</option>
            ${deityOptions}
          </select>
          <span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(data.resource_name || 'Благодать')}:</span>
          <span style="background:#1a221a;padding:4px 10px;border-radius:6px;font-weight:800;font-size:13px;color:${graceColor};border:1px solid ${graceColor}40;" class="school-resource-val theurgy-grace-${index}">${currentGrace} / ${maxGrace}</span>
        </div>
      `;
    } else {
      if (data.resource_formula === 'necromancy_souls') {
        const chaMod = Math.max(0, abilityModifier(Number(character.abilities.cha) || 10));
        const bonus = Number(school.souls?.bonus) || 0;
        const maxSouls = Math.max(1, (Number(school.level) || 1) * chaMod + bonus);
        const currentSouls = (school.souls?.captured || []).length;
        const fillPercent = maxSouls > 0 ? currentSouls / maxSouls : 0;
        const soulColor = fillPercent >= 1 ? '#e74c3c' : fillPercent >= 0.7 ? '#e67e22' : '#7da67d';
        const warning = fillPercent >= 1 ? ' <span style="color:#e74c3c;font-size:11px;font-weight:700;">⚠️ ПЕРЕПОЛНЕН!</span>' : '';
        resourceHtml = `<div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(data.resource_name || 'Ресурс')}:</span>
          <span style="background:#1a221a;padding:4px 10px;border-radius:6px;font-weight:800;font-size:13px;color:${soulColor};border:1px solid ${soulColor}40;" class="school-resource-val">${currentSouls} / ${maxSouls}</span>
          ${warning}
        </div>`;
      } else {
        resourceHtml = `<span style="background:#fff3cd20;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;color:#f0e6d2;" class="school-resource-val">0</span>
          <span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(data.resource_name || 'Ресурс')}</span>`;
      }
    }

    let multiplierHtml = '';
    if (data.has_multiplier) {
      multiplierHtml = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--text-secondary);">Предрасположенность:</span>
          <input type="number" class="field-input magic-school-level" step="0.1" min="0" max="10" value="${mult}"
            oninput="updateSchoolMultiplier(${index}, this.value)" style="width:60px;text-align:center;">
        </div>`;
    }

    card.innerHTML = `
      <div class="magic-school-header">
        <div class="magic-school-name">${escapeHtml(data.name)}</div>
        <div class="magic-school-ability">Скейл: ${abilityDisplay}</div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:11px;color:var(--text-secondary);">Бонус:</span>
          <div class="magic-school-mod">+0</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
          <span class="school-click-hint">👆 Открыть</span>
          <span style="font-size:11px;color:var(--text-secondary);">Уровень:</span>
          <input type="number" class="field-input magic-school-level" min="1" max="20" value="${level}"
            oninput="updateSchoolLevel(${index}, this.value)" style="width:60px;text-align:center;">
          <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); removeMagicRow(${index})" style="background:linear-gradient(135deg,#e74c3c,#c0392b);padding:4px 10px;">✖</button>
        </div>
      </div>
      <div class="magic-school-stats">
        <div class="magic-school-stat">Атака: +0</div>
        <div class="magic-school-stat">Спасбросок: 0</div>
        <div class="magic-school-stat">Подготовлено: +0</div>
        ${multiplierHtml}
      </div>
      <div class="magic-school-resource">${resourceHtml}</div>
    `;
    container.appendChild(card);
  });

  character.magic.sorcery.forEach((sorc, index) => {
    const card = document.createElement('div');
    card.className = 'sorcery-card';
    card.dataset.sorceryIndex = index;
    card.dataset.schoolType = 'sorcery';
    card.dataset.schoolName = sorc.patron || 'Чародейство';
    card.onclick = (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      openSchoolDetailTab(sorc.patron || 'Чародейство', 'sorcery', index);
    };
    card.innerHTML = `
      <div class="sorcery-label">✨ Чародейство</div>
      <span style="font-size:12px;color:var(--text-secondary);">Покровитель:</span>
      <select class="field-input" style="padding:4px 8px;font-size:12px;min-width:120px;" onchange="updateSorceryPatron(${index}, this.value)">
        <option value="Феи" ${sorc.patron === 'Феи' ? 'selected' : ''}>Феи</option>
        <option value="Демоны" ${sorc.patron === 'Демоны' ? 'selected' : ''}>Демоны</option>
        <option value="Драконы" ${sorc.patron === 'Драконы' ? 'selected' : ''}>Драконы</option>
        <option value="Небожители" ${sorc.patron === 'Небожители' ? 'selected' : ''}>Небожители</option>
        <option value="Древние" ${sorc.patron === 'Древние' ? 'selected' : ''}>Древние</option>
      </select>
      <span class="school-click-hint">👆 Открыть</span>
      <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); removeSorceryRow(${index})" style="margin-left:auto;background:linear-gradient(135deg,#e74c3c,#c0392b);padding:4px 10px;">✖</button>
    `;
    container.appendChild(card);
  });

  updateMagicSchoolsValues();
}

function updateMagicSchoolsValues() {
  if (!character.magic) return;
  const container = document.getElementById('magicSchoolsList');
  if (!container) return;
  const cards = container.querySelectorAll('.magic-school-card');
  cards.forEach((card, index) => {
    const schoolChar = character.magic.schools[index];
    if (!schoolChar) return;
    const data = schoolsData.find(s => s.name === schoolChar.name);
    if (!data) return;

    const mod = getEffectiveModifier(data);
    const level = Number(schoolChar.level) || 1;
    const prof = getProfBonus();
    const mult = data.has_multiplier ? (Number(schoolChar.multiplier) || data.multiplier_default || 1.0) : 1.0;

    const attack = Math.round((prof + mod + level) * mult);
    const save = Math.round((8 + level + mod) * mult);
    const prep = Math.round((prof + mod + level) * mult);

    const modEl = card.querySelector('.magic-school-mod');
    if (modEl) modEl.textContent = (mod >= 0 ? '+' : '') + mod;

    const stats = card.querySelectorAll('.magic-school-stat');
    if (stats[0]) stats[0].textContent = `Атака: ${attack >= 0 ? '+' : ''}${attack}`;
    if (stats[1]) stats[1].textContent = `Спасбросок: ${save}`;
    if (stats[2]) stats[2].textContent = `Подготовлено: ${prep}`;
    if (data.name === 'Теургия') {
      const wisMod = Math.max(0, getAbilityMod('wis'));
      const maxGrace = level * wisMod;
      const currentGrace = Number(schoolChar.graceCurrent) || 0;
      const graceColor = currentGrace >= maxGrace ? '#e74c3c' : '#7da67d';
      const resEl = card.querySelector(`.theurgy-grace-${index}`);
      if (resEl) {
        resEl.textContent = `${currentGrace} / ${maxGrace}`;
        resEl.style.color = graceColor;
        resEl.style.borderColor = graceColor + '40';
      }
    } else if (data.resource_type === 'number') {
      const resEl = card.querySelector('.school-resource-val');
      if (resEl) {
        if (data.resource_formula === 'necromancy_souls') {
          const chaMod = Math.max(0, abilityModifier(Number(character.abilities.cha) || 10));
          const bonus = Number(schoolChar.souls?.bonus) || 0;
          const maxSouls = Math.max(1, level * chaMod + bonus);
          const currentSouls = (schoolChar.souls?.captured || []).length;
          const fillPercent = maxSouls > 0 ? currentSouls / maxSouls : 0;
          const soulColor = fillPercent >= 1 ? '#e74c3c' : fillPercent >= 0.7 ? '#e67e22' : '#7da67d';
          resEl.textContent = `${currentSouls} / ${maxSouls}`;
          resEl.style.color = soulColor;
          resEl.style.borderColor = soulColor + '40';
        } else {
          resEl.textContent = level * mod;
        }
      }
    }
  });
}

function updateSchoolLevel(index, value) {
  if (!character.magic?.schools[index]) return;
  character.magic.schools[index].level = Number(value) || 1;
  updateMagicSchoolsValues();
  updateMana();
  refreshNecromancyTab(index);
  refreshTheurgyTab(index);
}

function updateSchoolMultiplier(index, value) {
  if (!character.magic?.schools[index]) return;
  character.magic.schools[index].multiplier = Number(value) || 1;
  updateMagicSchoolsValues();
  updateMana();
}

function updateSchoolResource(index, value) {
  if (!character.magic?.schools[index]) return;
  character.magic.schools[index].resourceValue = value;
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function updateSorceryPatron(index, value) {
  if (!character.magic?.sorcery[index]) return;
  character.magic.sorcery[index].patron = value;
  const tabId = `magic-subtab-sorcery-${index}`;
  const tabBtn = document.querySelector(`[data-subtab="${tabId}"]`);
  if (tabBtn) {
    tabBtn.childNodes[0].textContent = value;
    const content = document.getElementById(tabId);
    if (content) {
      const titleEl = content.querySelector('.school-detail-title');
      if (titleEl) titleEl.textContent = value;
    }
  }
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

// ===== ДИНАМИЧЕСКИЕ САБ-ТАБЫ =====
function switchMagicSubtab(subtabId) {
  document.querySelectorAll('#magicSubtabsContainer .sub-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('#tab-magic .sub-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  const btn = document.querySelector(`#magicSubtabsContainer [data-subtab="${subtabId}"]`);
  if (btn) btn.classList.add('active');
  const content = document.getElementById(subtabId);
  if (content) content.classList.add('active');
}

function openSchoolDetailTab(name, type, index) {
  const tabId = `magic-subtab-${type}-${index}`;

  if (activeMagicSubtabs.has(tabId)) {
    switchMagicSubtab(tabId);
    return;
  }

  activeMagicSubtabs.add(tabId);

  const subtabsContainer = document.getElementById('magicSubtabsContainer');
  const tabBtn = document.createElement('button');
  tabBtn.className = 'sub-tab-btn magic-dynamic-tab';
  tabBtn.dataset.subtab = tabId;
  tabBtn.innerHTML = `${escapeHtml(name)} <span class="tab-close" onclick="event.stopPropagation(); closeSchoolDetailTab('${tabId}')">×</span>`;
  tabBtn.onclick = () => switchMagicSubtab(tabId);
  subtabsContainer.appendChild(tabBtn);

  const contentsContainer = document.getElementById('magicDynamicContents');
  const contentDiv = document.createElement('div');
  contentDiv.className = 'sub-tab-content';
  contentDiv.id = tabId;

  const subtitle = type === 'sorcery' ? 'Чародейство' : 'Школа магии';

  let iconHtml = '';
  let schoolData = null;
  if (type === 'school') {
    schoolData = schoolsData.find(s => s.name === name);
    if (schoolData && schoolData.icon) {
      iconHtml = `<div class="school-detail-icon school-svg-icon" data-icon="${escapeHtml(schoolData.icon)}"></div>`;
    } else {
      iconHtml = `<div class="school-detail-icon school-svg-icon">📖</div>`;
    }
  } else {
    iconHtml = `<div class="school-detail-icon">✨</div>`;
  }

  if (name === 'Некромантия' && type === 'school') {
    contentDiv.innerHTML = getNecromancyDetailHtml(index);
    loadSchoolIcon('icons/scull.svg', tabId);
  } else if (name === 'Теургия' && type === 'school') {
    contentDiv.innerHTML = getTheurgyDetailHtml(index);
    const theurgyChar = character.magic?.schools?.[index];
    const theurgyData = schoolsData.find(s => s.name === 'Теургия');
    const theurgyDeity = theurgyData?.religions?.find(r => r.name === theurgyChar?.deity);
    if (theurgyDeity && theurgyDeity.symbol) {
      loadSchoolIcon('icons/' + theurgyDeity.symbol, tabId);
    }
  } else {
    contentDiv.innerHTML = `
      <div class="school-detail-content">
        <div class="school-detail-header">
          ${iconHtml}
          <div>
            <div class="school-detail-title">${escapeHtml(name)}</div>
            <div class="school-detail-subtitle">${subtitle} — настройка и детали</div>
          </div>
        </div>
        <div class="school-detail-placeholder">
          <div class="placeholder-icon">🔮</div>
          <div class="placeholder-title">Раздел в разработке</div>
          <div class="placeholder-hint">Здесь будут детальные настройки ${type === 'sorcery' ? 'чародейства' : 'школы'}: специализации, бонусы, ограничения и прочие параметры.</div>
        </div>
      </div>
    `;
  }
  contentsContainer.appendChild(contentDiv);

  if (type === 'school' && schoolData && schoolData.icon) {
    loadSchoolIcon(schoolData.icon, tabId);
  }

  switchMagicSubtab(tabId);
}

async function loadSchoolIcon(iconFile, tabId) {
  try {
    const response = await fetch(iconFile);
    if (!response.ok) {
      console.warn(`Не удалось загрузить иконку: ${iconFile}`);
      return;
    }
    const svgText = await response.text();
    const contentDiv = document.getElementById(tabId);
    if (!contentDiv) return;
    const iconContainer = contentDiv.querySelector('.school-svg-icon');
    if (!iconContainer) return;
    iconContainer.innerHTML = svgText;
    const svg = iconContainer.querySelector('svg');
    if (svg) {
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.display = 'block';
    }
  } catch (e) {
    console.error('Ошибка загрузки иконки школы:', e);
  }
}

function closeSchoolDetailTab(tabId) {
  activeMagicSubtabs.delete(tabId);

  const tabBtn = document.querySelector(`#magicSubtabsContainer [data-subtab="${tabId}"]`);
  if (tabBtn) tabBtn.remove();

  const content = document.getElementById(tabId);
  if (content) content.remove();

  switchMagicSubtab('magic-schools');
}

function removeMagicRow(index) {
  const tabId = `magic-subtab-school-${index}`;
  if (activeMagicSubtabs.has(tabId)) {
    closeSchoolDetailTab(tabId);
  }
  if (character.magic) {
    character.magic.schools.splice(index, 1);
    renderMagicSchools();
    updateMana();
    reindexSchoolTabs('school');
  }
}

function removeSorceryRow(index) {
  const tabId = `magic-subtab-sorcery-${index}`;
  if (activeMagicSubtabs.has(tabId)) {
    closeSchoolDetailTab(tabId);
  }
  if (character.magic) {
    character.magic.sorcery.splice(index, 1);
    renderMagicSchools();
    updateMana();
    reindexSchoolTabs('sorcery');
  }
}

function reindexSchoolTabs(type) {
  const tabsToClose = [];
  activeMagicSubtabs.forEach(tabId => {
    if (tabId.startsWith(`magic-subtab-${type}-`)) {
      tabsToClose.push(tabId);
    }
  });
  tabsToClose.forEach(tabId => closeSchoolDetailTab(tabId));
}

// ===== ДОБАВЛЕНИЕ ШКОЛ / ЧАРОДЕЙСТВА =====
function showAddMagicMenu() {
  const list = document.getElementById('addSchoolList');
  if (!list) return;
  list.innerHTML = '';
  const addedNames = new Set((character.magic?.schools || []).map(s => s.name));
  for (const school of schoolsData) {
    if (addedNames.has(school.name)) continue;
    const div = document.createElement('div');
    div.className = 'add-school-item';
    div.textContent = school.name;
    div.onclick = () => { addMagicSchool(school); closeAddSchoolModal(); };
    list.appendChild(div);
  }
  if (list.children.length === 0) {
    list.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:12px;">Все школы уже добавлены</div>';
  }
  openModal('addSchoolModal');
}

function addMagicSchool(schoolData, level = 1) {
  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  const newSchool = {
    name: schoolData.name,
    level: level,
    multiplier: schoolData.multiplier_default || 1.0,
    resourceValue: (schoolData.resource_list || [])[0] || ''
  };
  if (schoolData.name === 'Теургия') {
    newSchool.deity = null;
    newSchool.graceCurrent = 0;
  }
  character.magic.schools.push(newSchool);
  renderMagicSchools();
  updateMana();
}

function addSorceryRow() {
  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  character.magic.sorcery.push({ patron: 'Феи' });
  renderMagicSchools();
  closeAddSchoolModal();
  updateMana();
}

// ===== ЗАКЛИНАНИЯ (Revised Frame-based cards) =====

let _modificationsCache = {}; // slug -> array
let _editingDebugIndex = null;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}
function getRussianName(name) {
  if (!name) return '';
  // Убираем английскую часть в квадратных скобках в конце
  let cleaned = name.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  // Сохраняем старую логику для формата "English / Русский"
  const m = cleaned.match(/[\/\-\–\|]\s*(.+)$/);
  if (m && /[а-яё]/i.test(m[1])) return m[1].trim();
  return cleaned;
}


async function loadModifications(slug) {
  if (_modificationsCache[slug] !== undefined) return _modificationsCache[slug];
  try {
    const res = await fetch(`data/modifications/${slug}.json`);
    if (!res.ok) { _modificationsCache[slug] = null; return null; }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.modifications || null);
    _modificationsCache[slug] = list;
    return list;
  } catch (e) {
    _modificationsCache[slug] = null;
    return null;
  }
}

function getSpellBaseData(spell) {
  if (spell.customSpellData) return spell.customSpellData;
  // Точное совпадение
  let found = spellsData.find(s => s.name === spell.name && s.school === spell.school);
  if (found) return found;
  // Fallback: ищем по «очищенному» русскому названию
  const russianName = getRussianName(spell.name);
  found = spellsData.find(s => getRussianName(s.name) === russianName && s.school === spell.school);
  return found || {};
}

function findSchoolRowByName(name) {
  return schoolsData.find(s => s.name === name);
}

function calculateSpellManaCost(spell) {
  const data = spell.customSpellData || spellsData.find(s => s.name === spell.name && s.school === spell.school) || {};
  const K = Number(data.mana_cost) || 0;
  const Cs = Number(data.circle) || 1;
  const Ls = Number(spell.customLevel) || 0;

  const schoolData = findSchoolRowByName(spell.school);
  const schoolChar = character.magic?.schools.find(s => s.name === spell.school);
  const L = Number(schoolChar?.level) || 0;
  const P = schoolData ? getEffectiveModifier(schoolData) : 0;
  const O = 1.0;

  let mana;
  if (L * Ls + P !== 0) {
    mana = K + Cs * Cs + (2 * (Ls + 1) * O) / (L * Ls + P);
  } else {
    mana = K + Cs * Cs;
  }

  if (spell.customManaFormula) {
    try {
      const context = { K, Cs, Ls, L, P, O, max: Math.max, min: Math.min, round: Math.round, int: Math.floor };
      const fn = new Function(...Object.keys(context), 'return (' + spell.customManaFormula + ');');
      mana = fn(...Object.values(context));
    } catch (e) {
      console.error('Ошибка формулы манакоста:', e);
    }
  }
  return Math.max(0, Math.round(mana));
}

function renderSpellsTable() {
  const grid = document.getElementById('spellsGrid');
  if (!grid || !character.magic) return;
  grid.innerHTML = '';

  if (character.magic.spells.length === 0) {
    grid.innerHTML = '<div class="placeholder-text" style="grid-column:1/-1;">Нет известных заклинаний. Нажмите «Добавить заклинание», чтобы начать.</div>';
    return;
  }

  character.magic.spells.forEach((spell, index) => {
    const data = getSpellBaseData(spell);
    const cost = calculateSpellManaCost(spell);
    const circle = data.circle || '—';
    const spellType = data.type || '—';

    const card = document.createElement('div');
    card.className = 'spell-card-frame';
    card.dataset.index = index;
    card.style.position = 'relative';
    card.onclick = (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('g')) return;
      selectSpellCard(index);
    };

    let componentsText = (data.components || '').trim();
    let castTime = '';
    const castTimeMatch = componentsText.match(/Время каста:\s*([^\n]+)/i);
    if (castTimeMatch) {
      castTime = castTimeMatch[1].trim();
      componentsText = componentsText.replace(/Время каста:[^\n]*\n?/i, '').trim();
    }

    const description = (data.description || '').trim();
    const effect = (data.effect || '').trim();
    const range = data.range || '—';

    card.innerHTML = `
      <svg class="spell-frame-svg" viewBox="0 0 781 1024" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="card-clip-${index}">
            <rect width="781" height="1024" rx="20"/>
          </clipPath>
        </defs>

        <g clip-path="url(#card-clip-${index})">
          <!-- Background -->
          <rect width="781" height="1024" fill="#232B22"/>

          <!-- Outer border -->
          <rect x="10" y="10" width="761" height="1004" rx="20" fill="none" stroke="#B8A16E" stroke-width="3"/>

          <g transform="translate(0, 10)">
          <!-- НАЗВАНИЕ -->
          <text x="30" y="20" fill="#B8A16E" font-size="12" font-weight="bold">НАЗВАНИЕ</text>
          <rect x="24" y="26" width="512" height="60" rx="12" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <text x="39" y="64" fill="white" font-size="24" font-weight="bold">${escapeHtml(getRussianName(spell.name))}</text>

          <!-- МАНАКОСТ -->
          <text x="570" y="20" text-anchor="middle" fill="#B8A16E" font-size="12" font-weight="bold">МАНАКОСТ</text>
          <circle cx="580" cy="58" r="28" fill="none" stroke="#7EC8E3" stroke-width="4"/>
          <text id="spellMana_${index}" x="580" y="66" text-anchor="middle" fill="#7EC8E3" font-size="20" font-weight="bold">${cost}</text>

          <!-- УРОВЕНЬ -->
          <text x="665" y="20" text-anchor="middle" fill="#B8A16E" font-size="12" font-weight="bold">УРОВЕНЬ</text>
          <circle cx="650" cy="58" r="28" fill="none" stroke="#B8A16E" stroke-width="4"/>
          <foreignObject x="622" y="40" width="56" height="36">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;">
              <input type="number" min="0" max="20" value="${spell.customLevel || 0}"
                     onchange="onSpellLevelChanged(${index}, this.value)" onclick="event.stopPropagation()"
                     style="width:44px;height:32px;background:transparent;border:none;color:#B8A16E;text-align:center;font-size:20px;font-weight:bold;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;outline:none;"/>
            </div>
          </foreignObject>

          <!-- КРУГ -->
          <text x="720" y="20" text-anchor="middle" fill="#B8A16E" font-size="12" font-weight="bold">КРУГ</text>
          <circle cx="720" cy="58" r="28" fill="none" stroke="#B8A16E" stroke-width="4"/>
          <text x="720" y="66" text-anchor="middle" fill="#B8A16E" font-size="20" font-weight="bold">${circle}</text>

          <!-- ШКОЛА / ТИП / ВРЕМЯ КАСТА -->
          <text x="20" y="110" fill="#B8A16E" font-size="12" font-weight="bold">ШКОЛА</text>
          <rect x="24" y="118" width="232" height="45" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <text x="39" y="148" fill="white" font-size="18">${escapeHtml(spell.school)}</text>

          <text x="275" y="110" fill="#B8A16E" font-size="12" font-weight="bold">ТИП</text>
          <rect x="279" y="118" width="232" height="45" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <text x="294" y="148" fill="white" font-size="18">${escapeHtml(spellType)}</text>

          <text x="530" y="110" fill="#B8A16E" font-size="12" font-weight="bold">ВРЕМЯ КАСТА</text>
          <rect x="534" y="118" width="222" height="45" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <text x="549" y="148" fill="white" font-size="18">${escapeHtml(castTime || '—')}</text>

          <!-- КОМПАНЕНТЫ -->
          <text x="20" y="180" fill="#B8A16E" font-size="12" font-weight="bold">КОМПАНЕНТЫ</text>
          <rect x="24" y="188" width="487" height="45" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <foreignObject x="34" y="192" width="467" height="38">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color:#8a9a8a;font-size:14px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;display:flex;align-items:center;height:100%;overflow:hidden;">
              ${escapeHtml(componentsText)}
            </div>
          </foreignObject>

          <!-- ДИСТАНЦИЯ -->
          <text x="530" y="180" fill="#B8A16E" font-size="12" font-weight="bold">ДИСТАНЦИЯ</text>
          <rect x="534" y="188" width="222" height="45" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <text x="549" y="218" fill="white" font-size="18">${escapeHtml(range)}</text>

          <!-- ОПИСАНИЕ -->
          <text x="20" y="250" fill="#B8A16E" font-size="12" font-weight="bold">ОПИСАНИЕ</text>
          <rect x="24" y="258" width="572" height="360" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <foreignObject x="34" y="268" width="552" height="340">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color:#e0e0e0;font-size:15px;line-height:1.5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;height:100%;overflow-y:auto;padding-right:6px;">
              ${escapeHtml(description).replace(/\n/g, '<br/>')}
            </div>
          </foreignObject>

          <!-- МОДИФИКАЦИИ -->
          <text x="610" y="250" fill="#B8A16E" font-size="12" font-weight="bold">МОДИФИКАЦИИ</text>
          <rect x="614" y="258" width="142" height="360" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <foreignObject x="619" y="268" width="132" height="340">
            <div xmlns="http://www.w3.org/1999/xhtml" id="modsList_${index}" data-slug="${slugify(spell.name)}" data-index="${index}"
                 style="color:#e0e0e0;font-size:13px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
              <span style="opacity:0.6;">Загрузка…</span>
            </div>
          </foreignObject>

          <!-- ЭФФЕКТ -->
          <text x="20" y="640" fill="#B8A16E" font-size="12" font-weight="bold">ЭФФЕКТ</text>
          <rect x="24" y="648" width="732" height="270" rx="8" fill="none" stroke="#2F3A2E" stroke-width="2"/>
          <foreignObject x="34" y="658" width="712" height="250">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color:#72D5FF;font-size:15px;line-height:1.5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;height:100%;overflow-y:auto;padding-right:6px;">
              ${escapeHtml(effect).replace(/\n/g, '<br/>')}
            </div>
          </foreignObject>
          </g> <!-- /content shift -->
        </g> <!-- /clip -->
      </svg>
    `;

    grid.appendChild(card);



     // === HTML-кнопки точно поверх SVG-координат ===
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    // Координаты в процентах от viewBox 781×1024 (с учётом сдвига translate(0,10))
    // Левый/правый края выровнены по краям контекстных полей (x=24 и x+width=756)
    overlay.innerHTML = `
      <button onclick="event.stopPropagation(); removeSpellByIndex(${index})"
        style="
          position: absolute;
          left: 3.07%; top: 91.9922%;
          width: auto; height: auto;
          background: #1A221A;
          border: 2px solid #e74c3c;
          border-radius: 10px;
          color: #e74c3c;
          font-size: 12px;
          font-weight: bold;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          cursor: pointer;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          margin: 0;
          line-height: 1;
          transition: all 0.15s ease;
          box-sizing: border-box;
          white-space: nowrap;
        "
        onmouseover="this.style.background='#2a1a1a'; this.style.transform='scale(1.03)'; this.style.boxShadow='0 0 14px rgba(231,76,60,0.5)';"
        onmouseout="this.style.background='#1A221A'; this.style.transform='scale(1)'; this.style.boxShadow='none';"
      >⚙ УДАЛИТЬ ⚙</button>

      <button onclick="event.stopPropagation(); editSpellParameters(${index})"
        style="
          position: absolute;
          right: 3.20%; top: 91.9922%;
          width: auto; height: auto;
          background: #1A221A;
          border: 2px solid #B8A16E;
          border-radius: 10px;
          color: #B8A16E;
          font-size: 12px;
          font-weight: bold;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          cursor: pointer;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          margin: 0;
          line-height: 1;
          transition: all 0.15s ease;
          box-sizing: border-box;
          white-space: nowrap;
        "
        onmouseover="this.style.background='#2a2a1a'; this.style.transform='scale(1.03)'; this.style.boxShadow='0 0 14px rgba(184,161,110,0.5)';"
        onmouseout="this.style.background='#1A221A'; this.style.transform='scale(1)'; this.style.boxShadow='none';"
      >⚙ ИЗМЕНИТЬ ПАРАМЕТРЫ ⚙</button>
    `;
    card.appendChild(overlay);
    // ==============================================

    renderModificationsForCard(index, slugify(spell.name), spell.customLevel || 0, spell.selectedModifications || []);
  });
}


async function renderModificationsForCard(index, slug, level, selected) {
  const card = document.querySelector(`.spell-card-frame[data-index="${index}"]`);
  if (!card) return;

  let container = document.getElementById(`modsList_${index}`);
  if (!container) {
    const svg = card.querySelector('svg');
    if (svg) {
      const foreignObj = svg.querySelector(`foreignObject div#modsList_${index}`);
      if (foreignObj) container = foreignObj;
    }
  }
  if (!container) return;

  const mods = await loadModifications(slug);

  if (!mods || mods.length === 0) {
    container.innerHTML = '<span style="opacity:0.6;font-size:12px;color:#8a9a8a;">Нет модификаций</span>';
    return;
  }

  const maxSelect = Math.min(level, mods.length);
  let html = '';
  mods.forEach((mod, i) => {
    const isSelected = selected.includes(i);
    const name = escapeHtml(mod.name || '—');
    const desc = escapeHtml(mod.description || '');
    html += `
      <div class="mod-text-item ${isSelected ? 'selected' : ''}"
           onclick="event.stopPropagation(); toggleModification(${index}, ${i})"
           title="${desc}">
        <div class="mod-text-name">${name}</div>
        ${desc ? `<div class="mod-text-desc">${desc}</div>` : ''}
      </div>
    `;
  });

  if (level > 0) {
    html += `<div style="margin-top:4px;font-size:11px;color:#B8A16E;opacity:0.8;">Макс: ${maxSelect}</div>`;
  }

  container.innerHTML = html;
}


function toggleModification(spellIndex, modIndex) {
  const spell = character.magic?.spells?.[spellIndex];
  if (!spell) return;
  if (!spell.selectedModifications) spell.selectedModifications = [];
  const level = spell.customLevel || 0;

  const idx = spell.selectedModifications.indexOf(modIndex);
  if (idx > -1) {
    spell.selectedModifications.splice(idx, 1);
  } else {
    if (spell.selectedModifications.length >= level) return;
    spell.selectedModifications.push(modIndex);
  }

  const slug = slugify(spell.name);
  renderModificationsForCard(spellIndex, slug, level, spell.selectedModifications);

  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function onSpellLevelChanged(index, value) {
  if (!character.magic?.spells[index]) return;
  const newLevel = Math.max(0, Math.min(20, Number(value) || 0));
  character.magic.spells[index].customLevel = newLevel;

  const spell = character.magic.spells[index];
  if (spell.selectedModifications) {
    spell.selectedModifications = spell.selectedModifications.filter((_, i) => i < newLevel);
  }

  updateSpellManaDisplay(index);

  const slug = slugify(spell.name);
  renderModificationsForCard(index, slug, newLevel, spell.selectedModifications || []);

  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}


function selectSpellCard(index) {
  document.querySelectorAll('.spell-card-frame').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.spell-card-frame[data-index="${index}"]`);
  if (card) card.classList.add('selected');
}

function removeSpellByIndex(index) {
  if (character.magic && index >= 0 && index < character.magic.spells.length) {
    character.magic.spells.splice(index, 1);
    renderSpellsTable();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }
}

function updateSpellManaDisplay(index) {
  const el = document.getElementById(`spellMana_${index}`);
  if (!el || !character.magic?.spells[index]) return;
  el.textContent = calculateSpellManaCost(character.magic.spells[index]);
}


function updateAllSpellsManaCost() {
  if (!character.magic) return;
  character.magic.spells.forEach((_, i) => updateSpellManaDisplay(i));
}

// ===== DEBUG / EDIT SPELL PARAMETERS =====
function editSpellParameters(index) {
  _editingDebugIndex = index;
  const spell = character.magic?.spells?.[index];
  if (!spell) return;
  const data = getSpellBaseData(spell);

  const dbgName = document.getElementById('dbgSpellName');
  if (dbgName) dbgName.value = getRussianName(spell.name);
  const dbgSchool = document.getElementById('dbgSpellSchool');
  if (dbgSchool) dbgSchool.value = spell.school;
  const dbgMana = document.getElementById('dbgSpellMana');
  if (dbgMana) dbgMana.value = data.mana_cost !== null && data.mana_cost !== undefined ? data.mana_cost : '';
  const dbgCircle = document.getElementById('dbgSpellCircle');
  if (dbgCircle) dbgCircle.value = data.circle || '';
  const dbgType = document.getElementById('dbgSpellType');
  if (dbgType) dbgType.value = data.type || '';
  const dbgCastTime = document.getElementById('dbgSpellCastTime');
  if (dbgCastTime) dbgCastTime.value = extractCastTime(data.components || '') || '';
  const dbgComponents = document.getElementById('dbgSpellComponents');
  if (dbgComponents) dbgComponents.value = stripCastTime(data.components || '');
  const dbgDescription = document.getElementById('dbgSpellDescription');
  if (dbgDescription) dbgDescription.value = data.description || '';
  const dbgEffect = document.getElementById('dbgSpellEffect');
  if (dbgEffect) dbgEffect.value = data.effect || '';
  const dbgRange = document.getElementById('dbgSpellRange');
  if (dbgRange) dbgRange.value = data.range || '';

  openModal('spellDebugModal');
}

function extractCastTime(components) {
  const m = components.match(/Время каста:\s*([^\n]+)/i);
  return m ? m[1].trim() : '';
}

function stripCastTime(components) {
  return components.replace(/Время каста:[^\n]*\n?/i, '').trim();
}

function saveSpellDebug() {
  if (_editingDebugIndex === null || !character.magic) return;
  const spell = character.magic.spells[_editingDebugIndex];
  if (!spell) return;

  let data = spell.customSpellData;
  if (!data) {
    const base = spellsData.find(s => s.name === spell.name && s.school === spell.school);
    data = base ? { ...base } : {};
  }

  data.mana_cost = parseInt(document.getElementById('dbgSpellMana').value) || 0;
  data.circle = parseInt(document.getElementById('dbgSpellCircle').value) || 1;
  data.type = document.getElementById('dbgSpellType').value;
  const castTime = document.getElementById('dbgSpellCastTime').value.trim();
  const comps = document.getElementById('dbgSpellComponents').value.trim();
  data.components = castTime ? (comps ? comps + '\nВремя каста: ' + castTime : 'Время каста: ' + castTime) : comps;
  const dbgDescription2 = document.getElementById('dbgSpellDescription');
  if (dbgDescription2) data.description = dbgDescription2.value;
  const dbgEffect2 = document.getElementById('dbgSpellEffect');
  if (dbgEffect2) data.effect = dbgEffect2.value;
  const dbgRange2 = document.getElementById('dbgSpellRange');
  if (dbgRange2) data.range = dbgRange2.value;

  spell.customSpellData = data;

  closeSpellDebugModal();
  renderSpellsTable();
  updateAllSpellsManaCost();

  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function closeSpellDebugModal() {
  closeModal('spellDebugModal');
  _editingDebugIndex = null;
}

// ===== ADD SPELLS =====
function showAddSpellDialog() {
  const activeSchools = new Set((character.magic?.schools || []).map(s => s.name));
  if (activeSchools.size === 0) { alert('Сначала добавьте хотя бы одну школу магии.'); return; }

  const available = spellsData.filter(s => activeSchools.has(s.school));
  const list = document.getElementById('spellList');
  if (!list) return;
  list.innerHTML = '';
  window._availableSpells = available;

  for (const spell of available) {
    const div = document.createElement('div');
    div.className = 'spell-list-item';
    div.innerHTML = `<span>${escapeHtml(getRussianName(spell.name))}</span><span class="spell-school-tag">${escapeHtml(spell.school)}</span>`;
    div.onclick = () => { addSpellToCharacter(spell); closeAddSpellModal(); };
    list.appendChild(div);
  }
  const spellSearch = document.getElementById('spellSearch');
  if (spellSearch) spellSearch.value = '';
  openModal('addSpellModal');
}

function filterSpellList() {
  const text = document.getElementById('spellSearch').value.toLowerCase();
  document.querySelectorAll('.spell-list-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(text) ? 'flex' : 'none';
  });
}

function addSpellToCharacter(spellData, customLevel = 0) {
  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  character.magic.spells.push({
    name: spellData.name,
    school: spellData.school,
    customLevel: customLevel,
    customManaFormula: '',
    customSpellData: null,
    selectedModifications: [],
    isArtifact: false
  });
  renderSpellsTable();
  updateAllSpellsManaCost();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}
// ===== АРТЕФАКТНЫЕ ЗАКЛИНАНИЯ =====
// ===== АРТЕФАКТНЫЕ ЗАКЛИНАНИЯ =====
function showArtifactSpellDialog() {
  const select = document.getElementById('artSpellSchool');
  if (!select) return;
  select.innerHTML = '';
  // Предлагаем ВСЕ доступные школы, не только активные у персонажа
  for (const s of schoolsData) {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    select.appendChild(opt);
  }

  document.getElementById('artSpellName').value = '';
  document.getElementById('artSpellCircle').value = 1;
  document.getElementById('artSpellType').value = '';
  document.getElementById('artSpellCastTime').value = '';
  document.getElementById('artSpellComponents').value = '';
  document.getElementById('artSpellDescription').value = '';
  document.getElementById('artSpellEffect').value = '';
  document.getElementById('artSpellManaCost').value = 0;
  document.getElementById('artSpellLevel').value = 0;
  document.getElementById('artSpellFormula').value = '';
  hideArtifactDropdown();
  openModal('artifactSpellModal');
}

function closeArtifactSpellModal() {
  closeModal('artifactSpellModal');
}

function hideArtifactDropdown() {
  const dd = document.getElementById('artSpellNameDropdown');
  if (dd) dd.classList.remove('active');
}

function onArtifactSpellNameInput(value) {
  const dropdown = document.getElementById('artSpellNameDropdown');
  if (!dropdown) return;
  if (!value.trim()) {
    dropdown.classList.remove('active');
    return;
  }
  const query = value.toLowerCase();
  const matches = spellsData.filter(s => {
    const ruName = getRussianName(s.name).toLowerCase();
    const enName = s.name.toLowerCase();
    return ruName.includes(query) || enName.includes(query);
  }).slice(0, 10);

  if (matches.length === 0) {
    dropdown.innerHTML = '<div class="autocomplete-item no-results">Нет совпадений</div>';
    dropdown.classList.add('active');
    return;
  }

  window._artifactSpellMatches = matches;
  dropdown.innerHTML = matches.map((s, i) => `
    <div class="autocomplete-item" onclick="selectArtifactSpellByIdx(${i})">
      <span>${escapeHtml(getRussianName(s.name))}</span>
      <span style="color:var(--text-secondary);font-size:11px;margin-left:auto;">${escapeHtml(s.school)}</span>
    </div>
  `).join('');
  dropdown.classList.add('active');
}

function selectArtifactSpellByIdx(idx) {
  if (!window._artifactSpellMatches || !window._artifactSpellMatches[idx]) return;
  const spell = window._artifactSpellMatches[idx];
  fillArtifactSpellFields(spell);
  hideArtifactDropdown();
}

function fillArtifactSpellFields(spell) {
  document.getElementById('artSpellName').value = getRussianName(spell.name);
  document.getElementById('artSpellSchool').value = spell.school || '';
  document.getElementById('artSpellCircle').value = spell.circle || 1;
  document.getElementById('artSpellType').value = spell.type || '';
  document.getElementById('artSpellManaCost').value = spell.mana_cost !== undefined ? spell.mana_cost : 0;

  const components = spell.components || '';
  const castTimeMatch = components.match(/Время каста:\s*([^\n]+)/i);
  if (castTimeMatch) {
    document.getElementById('artSpellCastTime').value = castTimeMatch[1].trim();
    document.getElementById('artSpellComponents').value = components.replace(/Время каста:[^\n]*\n?/i, '').trim();
  } else {
    document.getElementById('artSpellCastTime').value = '';
    document.getElementById('artSpellComponents').value = components;
  }

  const artDesc = document.getElementById('artSpellDescription');
  if (artDesc) artDesc.value = spell.description || '';
  const artEff = document.getElementById('artSpellEffect');
  if (artEff) artEff.value = spell.effect || '';
  const artRange = document.getElementById('artSpellRange');
  if (artRange) artRange.value = spell.range || '';
}

function saveArtifactSpell() {
  const name = document.getElementById('artSpellName').value.trim();
  if (!name) { alert('Название не может быть пустым.'); return; }

  const castTime = document.getElementById('artSpellCastTime').value.trim();
  let components = document.getElementById('artSpellComponents').value.trim();
  if (castTime) {
    components = components ? components + '\nВремя каста: ' + castTime : 'Время каста: ' + castTime;
  }

  const spellData = {
    name: name,
    school: document.getElementById('artSpellSchool').value,
    circle: parseInt(document.getElementById('artSpellCircle').value) || 1,
    type: document.getElementById('artSpellType').value,
    components: components,
    description: document.getElementById('artSpellDescription').value,
    effect: document.getElementById('artSpellEffect').value,
    mana_cost: parseInt(document.getElementById('artSpellManaCost').value) || 0,
    range: document.getElementById('artSpellRange')?.value || ''
  };

  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  character.magic.spells.push({
    name: spellData.name,
    school: spellData.school,
    customLevel: parseInt(document.getElementById('artSpellLevel').value) || 0,
    customManaFormula: document.getElementById('artSpellFormula').value.trim(),
    customSpellData: spellData,
    selectedModifications: [],
    isArtifact: true
  });

  renderSpellsTable();
  updateAllSpellsManaCost();
  closeArtifactSpellModal();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function editSpellManaFormula(index) {
  editingSpellIndex = index;
  const spell = character.magic?.spells[index];
  if (!spell) return;
  document.getElementById('manaFormulaInput').value = spell.customManaFormula || '';
  openModal('manaFormulaModal');
}

function saveManaFormula() {
  if (editingSpellIndex === null || !character.magic) return;
  character.magic.spells[editingSpellIndex].customManaFormula = document.getElementById('manaFormulaInput').value.trim();
  updateSpellManaDisplay(editingSpellIndex);
  closeManaFormulaModal();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

// ===== ТЕУРГИЯ =====
function refreshTheurgyTab(schoolIndex) {
  const tabId = `magic-subtab-school-${schoolIndex}`;
  if (!activeMagicSubtabs.has(tabId)) return;
  const content = document.getElementById(tabId);
  if (!content) return;
  const schoolChar = character.magic?.schools?.[schoolIndex];
  if (!schoolChar || schoolChar.name !== 'Теургия') return;
  content.innerHTML = getTheurgyDetailHtml(schoolIndex);
  const theurgyData = schoolsData.find(s => s.name === 'Теургия');
  const theurgyDeity = theurgyData?.religions?.find(r => r.name === schoolChar?.deity);
  if (theurgyDeity && theurgyDeity.symbol) {
    loadSchoolIcon('icons/' + theurgyDeity.symbol, tabId);
  }
}

function getTheurgyDetailHtml(schoolIndex) {
  const schoolChar = character.magic?.schools?.[schoolIndex];
  if (!schoolChar) return '';
  const schoolData = schoolsData.find(s => s.name === 'Теургия');
  if (!schoolData) return '';

  const wisMod = Math.max(0, getAbilityMod('wis'));
  const level = Number(schoolChar.level) || 1;
  const maxGrace = level * wisMod;
  const currentGrace = Number(schoolChar.graceCurrent) || 0;
  const graceColor = currentGrace >= maxGrace ? '#e74c3c' : '#7da67d';
  const deityName = schoolChar.deity || '';
  const deity = schoolData.religions.find(r => r.name === deityName);

  const deityOptions = schoolData.religions.map(r =>
    `<option value="${escapeHtml(r.name)}" ${r.name === deityName ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
  ).join('');

  const ritualsHtml = deity ? `
    <div class="theurgy-cards-grid">
      ${deity.rituals.map((ritual, i) => `
        <div class="theurgy-card">
          <div class="theurgy-card-media">
            ${ritual.icon
              ? `<img class="theurgy-card-image" src="icons/${escapeHtml(ritual.icon)}" alt="" onerror="this.style.display='none';this.parentElement.querySelector('.theurgy-card-image-placeholder').style.display='flex';">`
              : ''}
            <div class="theurgy-card-image-placeholder" style="${ritual.icon ? 'display:none;' : ''}">
              <span>🔥</span>
            </div>
          </div>
          <div class="theurgy-card-content">
            <div class="theurgy-card-header">
              <div class="theurgy-card-title">${escapeHtml(ritual.name)}</div>
              <div class="theurgy-card-effect">+${ritual.effect}</div>
            </div>
            <div class="theurgy-card-desc">${escapeHtml(ritual.description)}</div>
            <button class="theurgy-card-btn ritual" onclick="performRitual(${schoolIndex}, ${i})">Выполнить</button>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '<div class="theurgy-empty">Выберите бога, чтобы увидеть ритуалы</div>';

  const spendingsHtml = deity ? `
    <div class="theurgy-cards-grid">
      ${deity.spendings.map((spending, i) => {
        const canAfford = currentGrace >= spending.price;
        return `
        <div class="theurgy-card" style="opacity:${canAfford ? 1 : 0.5};">
          <div class="theurgy-card-media">
            ${spending.icon
              ? `<img class="theurgy-card-image" src="icons/${escapeHtml(spending.icon)}" alt="" onerror="this.style.display='none';this.parentElement.querySelector('.theurgy-card-image-placeholder').style.display='flex';">`
              : ''}
            <div class="theurgy-card-image-placeholder" style="${spending.icon ? 'display:none;' : ''}">
              <span>✨</span>
            </div>
          </div>
          <div class="theurgy-card-content">
            <div class="theurgy-card-header">
              <div class="theurgy-card-title">${escapeHtml(spending.name)}</div>
              <div class="theurgy-card-effect" style="color:${canAfford ? '#e67e22' : '#e74c3c'};">${spending.price} благ.</div>
            </div>
            <div class="theurgy-card-desc">${escapeHtml(spending.description)}</div>
            <div style="color:#72D5FF;font-size:13px;line-height:1.5;margin-bottom:8px;">${escapeHtml(spending.effect)}</div>
            <button class="theurgy-card-btn spending" onclick="useSpending(${schoolIndex}, ${i})" ${!canAfford ? 'disabled' : ''}>Использовать</button>
          </div>
        </div>
      `;
      }).join('')}
    </div>
  ` : '<div class="theurgy-empty">Выберите бога, чтобы увидеть траты</div>';

  const dogmasHtml = deity ? `
    <div style="margin-top:24px;">
      <div style="color:#B8A16E;font-size:12px;font-weight:bold;margin-bottom:10px;">ДОГМАТЫ</div>
      <ul style="margin:0;padding-left:20px;color:#e0e0e0;font-size:14px;line-height:1.7;">
        ${deity.dogmas.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <div class="school-detail-content">
      <div class="school-detail-header">
        <div class="school-detail-icon school-svg-icon theurgy-icon-bg">📖</div>
        <div>
          <div class="school-detail-title">Теургия</div>
          <div class="school-detail-subtitle">Школа магии — благодать и ритуалы</div>
        </div>
      </div>

      <div style="background:#1a221a;border:1px solid #2F3A2E;border-radius:12px;padding:18px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;">
          <label style="font-size:12px;color:var(--text-secondary);">Покровитель:</label>
          <select class="field-input" style="padding:8px 12px;font-size:14px;min-width:220px;" onchange="updateTheurgyDeity(${schoolIndex}, this.value)">
            <option value="">— Выберите бога —</option>
            ${deityOptions}
          </select>
          <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;color:var(--text-secondary);">Благодать:</span>
            <span style="background:#1a221a;padding:6px 14px;border-radius:8px;font-weight:800;font-size:15px;color:${graceColor};border:1px solid ${graceColor}40;">${currentGrace} / ${maxGrace}</span>
          </div>
        </div>
        ${deity ? `
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
          <span style="font-size:12px;color:var(--text-secondary);">Символ:</span>
          <img src="icons/${escapeHtml(deity.symbol)}" style="width:28px;height:28px;" onerror="this.style.display='none'">
          <span style="font-size:14px;color:#f0e6d2;">${escapeHtml(deity.name)}</span>
        </div>
        ` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:24px;">
        <div>
          <div style="color:#B8A16E;font-size:13px;font-weight:bold;margin-bottom:14px;letter-spacing:1px;">РИТУАЛЫ</div>
          ${ritualsHtml}
        </div>
        <div>
          <div style="color:#B8A16E;font-size:13px;font-weight:bold;margin-bottom:14px;letter-spacing:1px;">ТРАТЫ БЛАГОДАТИ</div>
          ${spendingsHtml}
        </div>
      </div>

      ${dogmasHtml}
    </div>
  `;
}

function updateTheurgyDeity(index, deityName) {
  if (!character.magic?.schools?.[index]) return;
  const school = character.magic.schools[index];
  if (school.deity !== deityName) {
    school.deity = deityName;
    school.graceCurrent = 0;
  }
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshTheurgyTab(index);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function performRitual(index, ritualIndex) {
  if (!character.magic?.schools?.[index]) return;
  const school = character.magic.schools[index];
  const schoolData = schoolsData.find(s => s.name === 'Теургия');
  if (!schoolData || !school.deity) return;
  const deity = schoolData.religions.find(r => r.name === school.deity);
  if (!deity || !deity.rituals[ritualIndex]) return;
  const ritual = deity.rituals[ritualIndex];
  const wisMod = Math.max(0, getAbilityMod('wis'));
  const maxGrace = (Number(school.level) || 1) * wisMod;
  let current = Number(school.graceCurrent) || 0;
  current = Math.min(maxGrace, current + (Number(ritual.effect) || 0));
  school.graceCurrent = current;
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshTheurgyTab(index);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function useSpending(index, spendingIndex) {
  if (!character.magic?.schools?.[index]) return;
  const school = character.magic.schools[index];
  const schoolData = schoolsData.find(s => s.name === 'Теургия');
  if (!schoolData || !school.deity) return;
  const deity = schoolData.religions.find(r => r.name === school.deity);
  if (!deity || !deity.spendings[spendingIndex]) return;
  const spending = deity.spendings[spendingIndex];
  const current = Number(school.graceCurrent) || 0;
  if (current < spending.price) return;
  school.graceCurrent = current - spending.price;
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshTheurgyTab(index);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

// ===== ИМПОРТ/ЭКСПОРТ =====
function setMagicData(data) {
  if (!data) {
    character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  } else {
    character.magic = {
      rb: data.rb || 1,
      manaCurrent: data.manaCurrent || 0,
      schools: (data.schools || []).map(s => ({
        ...s,
        souls: s.souls ? { ...s.souls, captured: (s.souls.captured || []).map(c => ({...c})) } : undefined
      })),
      sorcery: (data.sorcery || []).map(s => ({...s})),
      spells: (data.spells || []).map(s => ({
        ...s,
        selectedModifications: s.selectedModifications || []
      }))
    };
  }
  const manaRb = document.getElementById('manaRb');
  const manaCurrent = document.getElementById('manaCurrent');
  if (manaRb) {
    manaRb.value = character.magic.rb;
    manaRb.oninput = (e) => updateManaRb(e.target.value);
  }
  if (manaCurrent) manaCurrent.value = character.magic.manaCurrent;
  renderMagicSchools();
  renderSpellsTable();
  updateMana();
}

function updateMainManaCurrent(value) {
  if (!character.magic) character.magic = { rb: 1, manaCurrent: 0, schools: [], sorcery: [], spells: [] };
  character.magic.manaCurrent = Number(value) || 0;
  const manaCurrent = document.getElementById('manaCurrent');
  if (manaCurrent) manaCurrent.value = character.magic.manaCurrent;
  updateMana();
}

// ===== БАНК ДУШ (НЕКРОМАНТИЯ) =====
function refreshNecromancyTab(schoolIndex) {
  const tabId = `magic-subtab-school-${schoolIndex}`;
  if (!activeMagicSubtabs.has(tabId)) return;

  const content = document.getElementById(tabId);
  if (!content) return;

  const schoolChar = character.magic?.schools?.[schoolIndex];
  if (!schoolChar || schoolChar.name !== 'Некромантия') return;

  content.innerHTML = getNecromancyDetailHtml(schoolIndex);
  loadSchoolIcon('icons/scull.svg', tabId);
}

function getSoulColorHex(color) {
  const map = {
    'белый': '#f5f5f5', 'чёрный': '#1a1a1a', 'черный': '#1a1a1a',
    'оранжевый': '#e67e22', 'зелёный': '#27ae60', 'зеленый': '#27ae60',
    'голубой': '#3498db', 'красный': '#e74c3c'
  };
  return map[color?.toLowerCase()] || '#666';
}

function getNecromancyDetailHtml(schoolIndex) {
  const schoolChar = character.magic?.schools?.[schoolIndex];
  if (!schoolChar) return '';

  const chaMod = Math.max(0, abilityModifier(Number(character.abilities.cha) || 10));
  const level = Number(schoolChar.level) || 1;
  const bonus = Number(schoolChar.souls?.bonus) || 0;
  const maxSouls = Math.max(1, level * chaMod + bonus);
  const souls = schoolChar.souls?.captured || [];
  const currentSouls = souls.length;
  const fillPercent = maxSouls > 0 ? currentSouls / maxSouls : 0;

  const soulColor = fillPercent >= 1 ? '#e74c3c' : fillPercent >= 0.7 ? '#e67e22' : '#7da67d';

  const soulsListHtml = souls.map((soul, i) => {
    const colorEmoji = {
      'белый': '⚪', 'чёрный': '⬛', 'черный': '⬛', 'оранжевый': '🟠',
      'зелёный': '🟢', 'зеленый': '🟢', 'голубой': '🔵', 'красный': '🔴'
    }[soul.color?.toLowerCase()] || '⚫';

    const stateLabels = {
      'stored': 'Хранение', 'suppressed': 'Подавлена', 'absorbed': 'Поглощена',
      'released': 'Отпущена', 'ectoplasm': 'Эктоплазма', 'sacrificed': 'Жертвована',
      'transferred': 'Передана', 'dialog': 'Диалог'
    };

    return `
      <div class="soul-card" data-soul-index="${i}">
        <div class="soul-header">
          <div class="soul-color-indicator" style="background:${getSoulColorHex(soul.color)};"></div>
          <div class="soul-info">
            <div class="soul-name">${escapeHtml(soul.color || 'Неизвестно')} душа ${colorEmoji}</div>
            <div class="soul-meta">
              <span class="soul-sparkle">${escapeHtml(soul.sparkle || 'Обычная')}</span>
              <span class="soul-state-badge">${stateLabels[soul.state] || escapeHtml(soul.state)}</span>
            </div>
          </div>
          <div class="soul-actions">
            <select class="field-input soul-state-select" onchange="updateSoulState(${schoolIndex}, ${i}, this.value)" style="width:120px;padding:4px 8px;font-size:12px;">
              <option value="stored" ${soul.state === 'stored' ? 'selected' : ''}>Хранение</option>
              <option value="suppressed" ${soul.state === 'suppressed' ? 'selected' : ''}>Подавление</option>
              <option value="absorbed" ${soul.state === 'absorbed' ? 'selected' : ''}>Поглощение</option>
              <option value="ectoplasm" ${soul.state === 'ectoplasm' ? 'selected' : ''}>Эктоплазма</option>
              <option value="sacrificed" ${soul.state === 'sacrificed' ? 'selected' : ''}>Жертвование</option>
              <option value="transferred" ${soul.state === 'transferred' ? 'selected' : ''}>Передача</option>
              <option value="dialog" ${soul.state === 'dialog' ? 'selected' : ''}>Диалог</option>
              <option value="released" ${soul.state === 'released' ? 'selected' : ''}>Отпустить</option>
            </select>
            <button class="btn btn-small btn-secondary" onclick="removeSoul(${schoolIndex}, ${i})" style="background:linear-gradient(135deg,#e74c3c,#c0392b);padding:4px 10px;">✖</button>
          </div>
        </div>
        <div class="soul-properties">
          ${(soul.properties || []).map(p => `<span class="soul-prop-tag">${escapeHtml(p)}</span>`).join('')}
        </div>
        ${soul.source ? `<div class="soul-source">Источник: ${escapeHtml(soul.source)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="school-detail-content">
      <div class="school-detail-header">
        <div class="school-detail-icon school-svg-icon" style="background:linear-gradient(135deg,#2c3e50,#1a1a2e);"></div>
        <div>
          <div class="school-detail-title">Некромантия</div>
          <div class="school-detail-subtitle">Банк душ — управление захваченными душами</div>
        </div>
      </div>

      <div class="soul-bank-panel">
        <div class="soul-bank-stats">
          <div class="soul-bank-stat">
            <div class="soul-bank-label">Банк душ</div>
            <div class="soul-bank-value" style="color:${soulColor};">${currentSouls} / ${maxSouls}</div>
          </div>
          <div class="soul-bank-stat">
            <div class="soul-bank-label">Уровень школы</div>
            <div class="soul-bank-value">${level}</div>
          </div>
          <div class="soul-bank-stat">
            <div class="soul-bank-label">Мод. ХАР</div>
            <div class="soul-bank-value">${chaMod >= 0 ? '+' : ''}${chaMod}</div>
          </div>
          <div class="soul-bank-stat">
            <div class="soul-bank-label">Бонус</div>
            <div class="soul-bank-value">${bonus >= 0 ? '+' : ''}${bonus}</div>
          </div>
        </div>
        ${fillPercent >= 1 ? '<div class="soul-warning">⚠️ Банк переполнен! Риск катастрофы!</div>' :
          fillPercent >= 0.7 ? '<div class="soul-warning" style="color:#e67e22;">⚠️ Банк заполнен на ' + Math.round(fillPercent * 100) + '%</div>' : ''}
        <div class="soul-bonus-row">
          <label class="field-label" style="font-size:11px;">Доп. бонус к банку (B):</label>
          <input type="number" class="field-input" value="${bonus}" onchange="updateSoulBonus(${schoolIndex}, this.value)" style="width:80px;text-align:center;">
        </div>
      </div>

      <div class="soul-toolbar">
        <button class="btn btn-small" onclick="openAddSoulModal(${schoolIndex})">Захватить душу</button>
        <button class="btn btn-small btn-secondary" onclick="clearReleasedSouls(${schoolIndex})">Очистить применённые</button>
      </div>

      <div class="souls-list">
        ${soulsListHtml || '<div class="soul-empty">Нет захваченных душ. Нажмите «Захватить душу», чтобы добавить.</div>'}
      </div>

      <div class="soul-legend">
        <div class="soul-legend-title">Легенда цветов душ:</div>
        <div class="soul-legend-items">
          <span class="soul-legend-item"><span style="color:#fff;">⚪</span> Белый — ангельские</span>
          <span class="soul-legend-item"><span style="color:#333;">⬛</span> Чёрный — порождения бездны</span>
          <span class="soul-legend-item"><span style="color:#ff8c00;">🟠</span> Оранжевый — проклятые</span>
          <span class="soul-legend-item"><span style="color:#32cd32;">🟢</span> Зелёный — животные</span>
          <span class="soul-legend-item"><span style="color:#87ceeb;">🔵</span> Голубой — гуманоиды</span>
          <span class="soul-legend-item"><span style="color:#dc143c;">🔴</span> Красный — адские</span>
        </div>
      </div>
    </div>
  `;
}

function updateSoulBonus(schoolIndex, value) {
  if (!character.magic?.schools?.[schoolIndex]) return;
  if (!character.magic.schools[schoolIndex].souls) {
    character.magic.schools[schoolIndex].souls = { bonus: 0, captured: [] };
  }
  character.magic.schools[schoolIndex].souls.bonus = parseInt(value) || 0;
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshNecromancyTab(schoolIndex);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function updateSoulState(schoolIndex, soulIndex, newState) {
  if (!character.magic?.schools?.[schoolIndex]?.souls?.captured?.[soulIndex]) return;
  character.magic.schools[schoolIndex].souls.captured[soulIndex].state = newState;
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshNecromancyTab(schoolIndex);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function removeSoul(schoolIndex, soulIndex) {
  if (!character.magic?.schools?.[schoolIndex]?.souls?.captured) return;
  character.magic.schools[schoolIndex].souls.captured.splice(soulIndex, 1);
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshNecromancyTab(schoolIndex);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function clearReleasedSouls(schoolIndex) {
  if (!character.magic?.schools?.[schoolIndex]?.souls?.captured) return;
  const before = character.magic.schools[schoolIndex].souls.captured.length;
  character.magic.schools[schoolIndex].souls.captured =
    character.magic.schools[schoolIndex].souls.captured.filter(s => !['absorbed','ectoplasm','sacrificed','transferred','released'].includes(s.state));
  const removed = before - character.magic.schools[schoolIndex].souls.captured.length;
  if (removed > 0) {
    renderMagicSchools();
    updateMagicSchoolsValues();
    refreshNecromancyTab(schoolIndex);
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }
}

function openAddSoulModal(schoolIndex) {
  window._addSoulSchoolIndex = schoolIndex;
  document.getElementById('soulColor').value = 'голубой';
  document.getElementById('soulSparkle').value = 'Обычная';
  document.getElementById('soulProperties').value = '';
  document.getElementById('soulSource').value = '';
  openModal('addSoulModal');
}

function saveSoul() {
  const schoolIndex = window._addSoulSchoolIndex;
  if (schoolIndex === null || schoolIndex === undefined) return;
  if (!character.magic?.schools?.[schoolIndex]) return;
  if (!character.magic.schools[schoolIndex].souls) {
    character.magic.schools[schoolIndex].souls = { bonus: 0, captured: [] };
  }
  const props = document.getElementById('soulProperties').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const newSoul = {
    color: document.getElementById('soulColor').value,
    sparkle: document.getElementById('soulSparkle').value,
    properties: props,
    state: 'stored',
    source: document.getElementById('soulSource').value.trim()
  };
  character.magic.schools[schoolIndex].souls.captured.push(newSoul);
  closeAddSoulModal();
  renderMagicSchools();
  updateMagicSchoolsValues();
  refreshNecromancyTab(schoolIndex);
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}