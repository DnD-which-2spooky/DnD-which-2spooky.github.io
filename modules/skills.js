// ============================================================
// SKILLS MODULE — Навыки: сортировка, фильтры, владение
// ============================================================

let skillsData = [];
const skillsUrl = 'data/skills.json';

async function loadSkills() {
  try {
    const res = await fetch(skillsUrl);
    const data = await res.json();
    skillsData = data.skills || [];
    renderSkills();
  } catch (e) {
    console.error('Не удалось загрузить skills.json:', e);
  }
}

function getSkillAbilityMod(charData) {
  let chars;
  if (Array.isArray(charData)) {
    chars = charData;
  } else {
    chars = [charData];
  }
  const firstChar = chars[0].toLowerCase();
  return window.computedAbilityMods?.[firstChar] || 0;
}

function getProfValueForSkill(profLevel, pb) {
  const lvl = parseInt(profLevel) || 0;
  if (lvl === 0) return 0;
  if (lvl === 1) return Math.floor(pb / 2);
  if (lvl === 2) return pb;
  if (lvl === 3) return pb * 2;
  return 0;
}

function formatChar(charData) {
  if (Array.isArray(charData)) return charData.join('/');
  return charData;
}

let skillsSort = { field: 'name', dir: 1 };
let skillsFilter = 'all';

function sortSkills(field) {
  const btn = document.querySelector(`.skills-sort-btn[data-sort="${field}"]`);
  if (skillsSort.field === field) {
    skillsSort.dir *= -1;
  } else {
    skillsSort.field = field;
    skillsSort.dir = 1;
  }
  document.querySelectorAll('.skills-sort-btn').forEach(b => {
    b.classList.remove('active');
    const arrow = b.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = '';
  });
  if (btn) {
    btn.classList.add('active');
    const arrow = btn.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = skillsSort.dir === 1 ? '▲' : '▼';
  }
  renderSkills();
}

function filterType(type) {
  skillsFilter = type;
  document.querySelectorAll('.skills-filter-btn').forEach(b => b.classList.remove('active', 'active-passive', 'active-multi'));
  const btn = document.querySelector(`.skills-filter-btn[data-filter="${type}"]`);
  if (btn) {
    if (type === 'passive') btn.classList.add('active-passive');
    else if (type === 'multi') btn.classList.add('active-multi');
    else btn.classList.add('active');
  }
  renderSkills();
}

function filterSkills() {
  renderSkills();
}

function renderSkills() {
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;
  if (!skillsData || skillsData.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:20px;">Загрузка навыков...</div>';
    return;
  }

  const search = (document.getElementById('skillsSearch')?.value || '').toLowerCase();
  const pb = proficiencyBonus(Number(character.level) || 1);
  const pbEl = document.getElementById('skillsPbDisplay');
  if (pbEl) pbEl.textContent = 'БМ: ' + (pb >= 0 ? '+' : '') + pb;

  let filtered = skillsData.filter(s => {
    if (skillsFilter !== 'all') {
      if (skillsFilter === 'multi') {
        const chars = s.characteristic;
        if (!Array.isArray(chars) || chars.length <= 1) return false;
      } else if (s.type !== skillsFilter) {
        return false;
      }
    }
    if (search && !s.name.toLowerCase().includes(search)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let valA, valB;
    switch(skillsSort.field) {
      case 'name': valA = a.name; valB = b.name; break;
      case 'char': valA = formatChar(a.characteristic); valB = formatChar(b.characteristic); break;
      case 'type': valA = a.type; valB = b.type; break;
      case 'mod':
        valA = getSkillAbilityMod(a.characteristic) + getProfValueForSkill(character.skills?.[a.name] || 0, pb) + (Number(character.bonuses.skills?.[a.name]) || 0);
        valB = getSkillAbilityMod(b.characteristic) + getProfValueForSkill(character.skills?.[b.name] || 0, pb) + (Number(character.bonuses.skills?.[b.name]) || 0);
        break;
      default: valA = a.name; valB = b.name;
    }
    if (valA < valB) return -1 * skillsSort.dir;
    if (valA > valB) return 1 * skillsSort.dir;
    return 0;
  });

  let html = '';
  let lastGroup = null;
  const groupField = skillsSort.field === 'char' ? 'characteristic' : skillsSort.field === 'type' ? 'type' : null;

  function isMultiChar(skill) {
    return Array.isArray(skill.characteristic) && skill.characteristic.length > 1;
  }

  filtered.forEach(skill => {
    if (groupField) {
      const gk = formatChar(skill[groupField]);
      if (gk !== lastGroup) {
        const label = groupField === 'characteristic' ? gk : (gk === 'active' ? '⚔️ Активные' : '👁️ Пассивные');
        html += `<div class="skill-section-header"><span class="skill-section-title">${label}</span></div>`;
        lastGroup = gk;
      }
    }

    const baseMod = getSkillAbilityMod(skill.characteristic);
    const profLevel = character.skills?.[skill.name] || 0;
    const profVal = getProfValueForSkill(profLevel, pb);
    const skillBonus = Number(character.bonuses?.skills?.[skill.name]) || 0;
    const total = baseMod + profVal + skillBonus;
    const sign = total >= 0 ? '+' : '';
    const modClass = total > 0 ? '' : total < 0 ? 'negative' : 'zero';
    const derivedClass = skill.type === 'passive' ? 'derived' : '';

    const profBtns = [0, 1, 2, 3].map(lvl => {
      const isActive = profLevel === lvl;
      let cls = isActive ? 'active' : '';
      if (isActive && lvl === 2) cls += ' active-green';
      if (isActive && lvl === 3) cls += ' active-blue';
      const labels = ['0', '½', 'БМ', '2×'];
      const titles = ['Нет владения', 'БМ/2', 'БМ', 'БМ×2'];
      return `<button class="prof-btn ${cls}" data-skill="${escapeHtml(skill.name)}" data-prof="${lvl}" title="${titles[lvl]}">${labels[lvl]}</button>`;
    }).join('');

    const multiCharClass = isMultiChar(skill) ? 'multi-char' : '';
    const multiCharBadge = isMultiChar(skill) ? '<div class="skill-multi-badge" title="Мульти-характеристика"></div>' : '';

    const mergedConds = character._mergedSkillConditions?.[skill.name];
    let cond = null;
    if (mergedConds && mergedConds.length > 0) {
      const adv = mergedConds.find(c => c.condition === 'advantage');
      const dis = mergedConds.find(c => c.condition === 'disadvantage');
      if (adv && !dis) cond = 'advantage';
      else if (dis && !adv) cond = 'disadvantage';
    }
    const conditionBadge = cond ? `
      <div class="skill-condition-badge ${cond}" title="${cond === 'advantage' ? 'Преимущество' : 'Помеха'}"></div>
    ` : '';

    html += `
      <div class="skill-card ${derivedClass} ${multiCharClass}" data-skill-name="${escapeHtml(skill.name)}">
        <div class="skill-badges">
          <div class="skill-type-badge ${skill.type}"></div>
          ${multiCharBadge}
          ${conditionBadge}
        </div>
        <div class="skill-name">${escapeHtml(skill.name)}${skill.derived_from ? ` <span style="color:var(--text-secondary);font-size:9px;">(${escapeHtml(skill.derived_from)})</span>` : ''}</div>
        <div class="skill-char">${formatChar(skill.characteristic)}</div>
        <div class="skill-mod-row">
          <div class="skill-mod-value ${modClass}">${sign}${total}</div>
          <span class="skill-bonus-cog" onclick="event.stopPropagation(); openSkillBonusModal('${escapeHtml(skill.name)}')" title="Настроить бонусы">⚙️</span>
          <div class="prof-toggle">${profBtns}</div>
        </div>
        <div class="skill-desc">${escapeHtml(skill.description)}</div>
      </div>
    `;
  });

  grid.innerHTML = html;

  grid.querySelectorAll('.prof-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const skillName = btn.dataset.skill;
      const profLevel = parseInt(btn.dataset.prof);
      if (!character.skills) character.skills = {};
      character.skills[skillName] = profLevel;
      renderSkills();
      const preview = document.getElementById('jsonPreview');
      if (preview) preview.textContent = JSON.stringify(character, null, 2);
    });
  });
}

function openSkillBonusModal(skillName) {
  BonusModalState.currentField = 'skills';
  BonusModalState.currentLabel = skillName;
  BonusModalState.currentSkillName = skillName;
  if (!character.bonusSources.skills) character.bonusSources.skills = {};
  if (!character.bonusSources.skills[skillName]) character.bonusSources.skills[skillName] = [];

  BonusModalState.editingBonuses = JSON.parse(JSON.stringify(character.bonusSources.skills[skillName])).map(b => ({
    value: b.value || 0,
    source: b.source || '',
    type: b.type || 'value'
  }));

  const titleEl = document.getElementById('bonusModalTitle');
  if (titleEl) titleEl.textContent = 'Бонусы: ' + skillName;
  renderBonusList();
  const condBlock = document.getElementById('skillConditionBlock');
  if (condBlock) {
    condBlock.classList.remove('hidden');
    updateConditionButtons(skillName);
  }
  document.getElementById('bonusModal').classList.add('active');
}