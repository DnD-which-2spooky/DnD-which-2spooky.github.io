// ============================================================
// FEATURES MODULE — Черты персонажа, умения и подвкладки
// ============================================================

// Маппинг колонок редактора на поля list/type в traits.json
const TRAIT_CATEGORY_MAP = {
  personality:  ['Черты характера', 'Личность', 'Характер'],
  physical:     ['Физическая особенность', 'Физическое'],
  supernatural: ['Сверхъестественное', 'Сверхъестественные черты'],
  experience:   ['Жизненный опыт', 'Опыт', 'Жизненный']
};

// ===== Подвкладки «Умения и способности» =====
function switchTraitsSubtab(subtabId) {
  document.querySelectorAll('#traitsSubtabsContainer .sub-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('#tab-traits .sub-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  const btn = document.querySelector(`#traitsSubtabsContainer [data-subtab="${subtabId}"]`);
  if (btn) btn.classList.add('active');
  const content = document.getElementById(subtabId);
  if (content) content.classList.add('active');
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

// ===== УМЕНИЯ И ТАЛАНТЫ =====
function addAbilityRow(data = null) {
  const list = document.getElementById('abilitiesList');
  if (!list) return;

  const placeholder = list.querySelector('.ability-row-placeholder');
  if (placeholder) placeholder.remove();

  const row = document.createElement('div');
  row.className = 'ability-row';
  row.innerHTML = `
    <div class="fields-grid fields-grid-4" style="gap:14px;align-items:end;">
      <div class="field-group" style="min-width:0;">
        <label class="field-label">Название</label>
        <input type="text" class="field-input ability-name" placeholder="Например, Ярость берсерка" value="${escapeHtml(data?.name || '')}">
      </div>
      <div class="field-group">
        <label class="field-label">Источник</label>
        <select class="field-input ability-source">
          <option value="skills_tree" ${data?.source === 'skills_tree' ? 'selected' : ''}>Ветвь умений</option>
          <option value="event" ${data?.source === 'event' ? 'selected' : ''}>Событие</option>
          <option value="feat" ${data?.source === 'feat' ? 'selected' : ''}>Черта</option>
          <option value="other" ${data?.source === 'other' || !data?.source ? 'selected' : ''}>Прочее</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Тип</label>
        <select class="field-input ability-type">
          <option value="passive" ${data?.type === 'passive' || !data?.type ? 'selected' : ''}>Пассивное</option>
          <option value="action" ${data?.type === 'action' ? 'selected' : ''}>Действие</option>
          <option value="bonus" ${data?.type === 'bonus' ? 'selected' : ''}>Бонусное действие</option>
          <option value="reaction" ${data?.type === 'reaction' ? 'selected' : ''}>Реакция</option>
          <option value="rest" ${data?.type === 'rest' ? 'selected' : ''}>Отдых</option>
        </select>
      </div>
      <button class="btn btn-small" onclick="this.closest('.ability-row').remove(); syncAbilitiesToCharacter(); if(typeof refreshSidebar==='function')refreshSidebar(); recalcAll();" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">🗑️</button>
    </div>
    <div class="field-group mt-12">
      <textarea class="field-input ability-desc" rows="2" placeholder="Описание умения, механика, условия использования, перезарядка...">${escapeHtml(data?.description || '')}</textarea>
    </div>
  `;

  list.appendChild(row);

  const inputs = row.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    el.addEventListener('input', debounce(() => {
      syncAbilitiesToCharacter();
      if (typeof refreshSidebar === 'function') refreshSidebar();
      const jsonPreview = document.getElementById('jsonPreview');
      if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
    }, 300));
  });

  syncAbilitiesToCharacter();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

function syncAbilitiesToCharacter() {
  if (!character.abilitiesList) character.abilitiesList = [];
  const rows = document.querySelectorAll('#abilitiesList .ability-row');
  character.abilitiesList = [];
  rows.forEach(row => {
    character.abilitiesList.push({
      name: row.querySelector('.ability-name')?.value || '',
      source: row.querySelector('.ability-source')?.value || 'other',
      type: row.querySelector('.ability-type')?.value || 'passive',
      description: row.querySelector('.ability-desc')?.value || ''
    });
  });
}

function loadAbilitiesFromCharacter() {
  if (!character.abilitiesList || character.abilitiesList.length === 0) return;
  const list = document.getElementById('abilitiesList');
  if (!list) return;
  list.innerHTML = '';
  character.abilitiesList.forEach(ability => addAbilityRow(ability));
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

// ============================================================
// TRAITS DATA (data/traits.json)
// ============================================================
let traitsData = [];
let traitsMap = new Map();
let traitsNameMap = new Map();

async function loadTraitsData() {
  try {
    const res = await fetch('data/traits.json');
    const json = await res.json();
    traitsData = Array.isArray(json) ? json : (json.traits || []);
    traitsMap.clear();
    traitsNameMap.clear();
    for (const trait of traitsData) {
      if (trait.id) traitsMap.set(trait.id, trait);
      if (trait.name) traitsNameMap.set(trait.name, trait);
    }
  } catch (e) {
    console.error('Не удалось загрузить traits.json:', e);
  }
}

function getTraitById(id) { return traitsMap.get(id) || null; }
function getTraitByName(name) { return traitsNameMap.get(name) || null; }

function setupTraitAutocomplete(input, dropdown, onSelect, category = null) {
  let selectedIndex = -1;
  function renderDropdown(filter = '') {
    let options = traitsData.filter(t =>
      t.name && t.name.toLowerCase().includes(filter.toLowerCase())
    );

    // Фильтруем по категории колонки
    if (category) {
      const allowed = TRAIT_CATEGORY_MAP[category];
      if (allowed) {
        options = options.filter(t =>
          allowed.includes(t.list) || allowed.includes(t.type)
        );
      }
    }

    options = options.slice(0, 100);
    dropdown.innerHTML = '';
    selectedIndex = -1;
    if (options.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'autocomplete-item no-results';
      noRes.textContent = 'Нет совпадений';
      dropdown.appendChild(noRes);
    } else {
      options.forEach((opt) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `<strong>${escapeHtml(opt.name)}</strong> <span style="opacity:0.6;font-size:11px;">${escapeHtml(opt.type || '')}</span>`;
        div.addEventListener('click', () => {
          input.value = opt.name;
          onSelect(opt);
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
    if (!input.contains(e.target) && !dropdown.contains(e.target)) { dropdown.classList.remove('active'); }
  });
}

function openTraitInfo(traitIdOrName) {
  let trait = getTraitById(traitIdOrName);
  if (!trait) trait = getTraitByName(traitIdOrName);
  if (!trait) return;

  const title = document.getElementById('traitInfoTitle');
  const meta = document.getElementById('traitInfoMeta');
  const desc = document.getElementById('traitInfoDesc');
  const effectBlock = document.getElementById('traitInfoEffectBlock');
  const effect = document.getElementById('traitInfoEffect');

  if (title) title.textContent = trait.name;
  if (meta) meta.innerHTML = [
    trait.type ? `<span class="trait-meta-tag">${escapeHtml(trait.type)}</span>` : '',
    trait.list ? `<span class="trait-meta-tag">${escapeHtml(trait.list)}</span>` : '',
    trait.cost ? `<span class="trait-meta-tag">${trait.cost} ${trait.cost_type === 'points' ? 'очк.' : escapeHtml(trait.cost_type || '')}</span>` : ''
  ].filter(Boolean).join('');
  if (desc) desc.textContent = trait.description || 'Нет описания.';
  if (effectBlock && effect) {
    const hasEffect = !!(trait.effect || (trait.effects && trait.effects.length));
    effectBlock.style.display = hasEffect ? 'block' : 'none';
    if (hasEffect) {
      if (trait.effect) {
        effect.innerHTML = escapeHtml(trait.effect).replace(/\n/g, '<br>');
      } else if (trait.effects) {
        effect.innerHTML = trait.effects.map(eff =>
          `<div class="trait-effect-item">${escapeHtml(eff.text || '')}</div>`
        ).join('');
      }
    }
  }
  openModal('traitInfoModal');
}

// ========== PROFICIENCIES (Владения) ==========

function addProficiency(category, data = null) {
  const list = document.getElementById('prof-' + category);
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'proficiency-row';
  row.innerHTML = `
    <input type="text" class="field-input" placeholder="Название..." value="${escapeHtml(data || '')}">
    <button class="btn btn-small" onclick="this.closest('.proficiency-row').remove(); syncProficiencies(); if(typeof refreshSidebar==='function') refreshSidebar(); recalcAll();" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">🗑️</button>
  `;

  const input = row.querySelector('input');
  input.addEventListener('input', debounce(() => {
    syncProficiencies();
    if (typeof refreshSidebar === 'function') refreshSidebar();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }, 300));

  list.appendChild(row);
  syncProficiencies();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

function syncProficiencies() {
  if (!character.proficiencies) character.proficiencies = {};
  const categories = ['languages', 'weapons', 'armor', 'tools'];
  categories.forEach(cat => {
    const list = document.getElementById('prof-' + cat);
    if (!list) return;
    const inputs = list.querySelectorAll('.proficiency-row input');
    character.proficiencies[cat] = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
  });
}

function loadProficienciesFromCharacter() {
  if (!character.proficiencies) return;
  const categories = ['languages', 'weapons', 'armor', 'tools'];
  categories.forEach(cat => {
    const list = document.getElementById('prof-' + cat);
    if (!list) return;
    list.innerHTML = '';
    const items = character.proficiencies[cat] || [];
    items.forEach(item => addProficiency(cat, item));
  });
}

// ===== ЧЕРТЫ ПЕРСОНАЖА (компактный шаблон) =====
function addFeature(category, data = null) {
  const list = document.getElementById('features-' + category);
  if (!list) return;
  const placeholder = list.querySelector('.feature-placeholder');
  if (placeholder) placeholder.remove();

  const card = document.createElement('div');
  card.className = 'feature-card';
  card.dataset.traitId = data?.traitId || '';

  // Кнопки ? и 🗑️ перенесены на вторую строку — название занимает всю ширину
  card.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div class="autocomplete-wrap" style="position:relative;width:100%;">
        <input type="text" class="field-input feature-name-input" placeholder="Название черты" value="${escapeHtml(data?.name || '')}">
        <div class="autocomplete-dropdown feature-dropdown" style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:100;"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-small btn-secondary trait-info-btn" title="Подробнее">?</button>
        <button class="btn btn-small" onclick="this.closest('.feature-card').remove(); syncFeaturesToCharacter(); recalcAll();" style="background:linear-gradient(135deg,#e74c3c,#c0392b);padding:6px 10px;">🗑️</button>
      </div>
    </div>
  `;
  list.appendChild(card);

  const nameInput = card.querySelector('.feature-name-input');
  const dropdown = card.querySelector('.feature-dropdown');
  const infoBtn = card.querySelector('.trait-info-btn');

  // Автоподбор по названию (с фильтрацией по категории колонки)
  if (traitsData.length > 0) {
    setupTraitAutocomplete(nameInput, dropdown, (trait) => {
      card.dataset.traitId = trait.id || '';
      syncFeaturesToCharacter();
      const jsonPreview = document.getElementById('jsonPreview');
      if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
    }, category);
  }

  // Кнопка (?)
  infoBtn.addEventListener('click', () => {
    const traitId = card.dataset.traitId;
    const traitName = nameInput.value.trim();
    if (traitId) {
      openTraitInfo(traitId);
    } else if (traitName) {
      openTraitInfo(traitName);
    }
  });

  // Синхронизация при ручном вводе
  nameInput.addEventListener('input', debounce(() => {
    const currentTrait = getTraitById(card.dataset.traitId);
    if (!currentTrait || currentTrait.name !== nameInput.value.trim()) {
      card.dataset.traitId = '';
    }
    syncFeaturesToCharacter();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }, 300));

  // При загрузке: если traitId есть, но имя пустое — подставляем из базы
  if (data?.traitId && !data?.name) {
    const t = getTraitById(data.traitId);
    if (t) nameInput.value = t.name;
  }
}

function syncFeaturesToCharacter() {
  const categories = ['personality', 'physical', 'supernatural', 'experience'];
  if (!character.features) character.features = {};

  categories.forEach(cat => {
    const list = document.getElementById('features-' + cat);
    if (!list) return;
    const cards = list.querySelectorAll('.feature-card');

    // ЗАЩИТА: не стирать данные, если карточек ещё нет в DOM
    if (cards.length === 0) return;

    character.features[cat] = [];
    cards.forEach(card => {
      const nameInput = card.querySelector('.feature-name-input');
      const traitId = card.dataset.traitId || '';
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name && !traitId) return;

      let description = '';
      let effect = '';
      if (traitId) {
        const trait = getTraitById(traitId);
        if (trait) {
          description = trait.description || '';
          effect = trait.effect || '';
          if (!effect && trait.effects) {
            effect = trait.effects.map(e => e.text).join('\n');
          }
        }
      }

      const obj = { name, description, effect };
      if (traitId) obj.traitId = traitId;
      character.features[cat].push(obj);
    });
  });
}

function loadFeaturesFromCharacter() {
  if (!character.features) return;
  const categories = ['personality', 'physical', 'supernatural', 'experience'];

  categories.forEach(cat => {
    const list = document.getElementById('features-' + cat);
    if (!list || !character.features[cat]) return;
    list.innerHTML = '';
    character.features[cat].forEach(feature => addFeature(cat, feature));
  });
}

// Debounce helper (shared)
function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}