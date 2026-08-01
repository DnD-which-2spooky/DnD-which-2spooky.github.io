// ============================================
// APPEARANCE EDITOR MODULE
// Вкладка "Внешность" — редактор внешности персонажа
// ============================================

// === ЗАГРУЖАЕМЫЕ ДАННЫЕ ===
let appearanceData = {
  traumas: [],
  mutations: [],
  modifications: []
};

const DATA_URLS = {
  traumas: 'data/traumas.json',
  mutations: 'data/mutations.json',
  modifications: 'data/modules.json'
};

// === КАТЕГОРИИ ЧАСТЕЙ ТЕЛА ===
const BODY_PARTS = [
  { label: "Голова", value: "head" },
  { label: "Шея", value: "neck" },
  { label: "Верхняя часть груди", value: "upper_chest" },
  { label: "Живот", value: "abdomen" },
  { label: "Таз", value: "pelvis" },
  { label: "Левая нога", value: "left_leg" },
  { label: "Правая нога", value: "right_leg" },
  { label: "Левая рука", value: "left_arm" },
  { label: "Правая рука", value: "right_arm" },
  { label: "Всё тело", value: "whole_body" }
];

// === DOM-элементы ===
let appEls = {};

// === ЗАГРУЗКА ДАННЫХ ИЗ JSON ===
async function loadAppearanceDataFromFiles() {
  try {
    const [traumasRes, mutationsRes, modulesRes] = await Promise.all([
      fetch(DATA_URLS.traumas),
      fetch(DATA_URLS.mutations),
      fetch(DATA_URLS.modifications)
    ]);

    const traumasRaw = await traumasRes.json();
    const mutationsRaw = await mutationsRes.json();
    const modulesRaw = await modulesRes.json();

    // Фильтруем пустые/битые записи
    appearanceData.traumas = (traumasRaw || [])
      .filter(t => t.name && t.category)
      .map(t => ({ name: t.name, category: t.category, description: t.description || '', effect: t.effect || '', effects: t.effects || [] }));

    appearanceData.mutations = (mutationsRaw || [])
      .filter(m => m.name && m.category)
      .map(m => ({ name: m.name, category: m.category, description: m.description || '', effect: m.effect || '', effects: m.effects || [] }));

    // Модули (модификации) — используем name как отображаемое имя
    appearanceData.modifications = (modulesRaw || [])
      .filter(m => m.name && m.category)
      .map(m => ({
        name: m.name,
        category: m.category,
        model: m.model || '',
        spheres: m.spheres || [],
        description: m.description || '',
        effect: m.effect || '',
        effects: m.effects || [],
        cost: m.cost || ''
      }));

    console.log('[Appearance] Данные загружены:', {
      traumas: appearanceData.traumas.length,
      mutations: appearanceData.mutations.length,
      modifications: appearanceData.modifications.length
    });
  } catch (e) {
    console.error('[Appearance] Ошибка загрузки данных:', e);
    appearanceData = { traumas: [], mutations: [], modifications: [] };
  }
}

// === ИНИЦИАЛИЗАЦИЯ ===
async function initAppearanceEditor() {
  // Сначала загружаем внешние данные
  await loadAppearanceDataFromFiles();

  appEls.skinColor = document.getElementById('skinColor');
  appEls.ageToggle = document.getElementById('ageToggle');
  appEls.ageSelect = document.getElementById('ageSelect');
  appEls.species   = document.getElementById('appearance-species');
  appEls.race      = document.getElementById('appearance-race');
  appEls.bodyType  = document.getElementById('bodyType');
  appEls.refresh   = document.getElementById('appRefresh');
  appEls.search    = document.getElementById('appSearch');

  // Заполнение вида и расы из персонажа
  const charData = (typeof character !== 'undefined' && character) ? character : {
    species: "Человек",
    race: "Славянин"
  };
  if (appEls.species) appEls.species.value = charData.species || '';
  if (appEls.race)    appEls.race.value    = charData.race    || '';

  // 18+ тоггл
  if (appEls.ageToggle) {
    appEls.ageToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      syncAppearanceToCharacter();
    });
  }

  // Кнопка обновления
  if (appEls.refresh) {
    appEls.refresh.addEventListener('click', function() {
      console.log('[Appearance] Refresh preview');
    });
  }

  // Кнопка поиска
  if (appEls.search) {
    appEls.search.addEventListener('click', function() {
      console.log('[Appearance] Open search');
    });
  }

  // === КНОПКА СПРАВКИ (?) ===
  initHelpButton();

  // Подписка на изменение цвета кожи
  if (appEls.skinColor) {
    appEls.skinColor.addEventListener('input', function() {
      console.log('[Appearance] Skin color:', this.value);
      syncAppearanceToCharacter();
    });
  }

  // Автосохранение базовых полей
  document.querySelectorAll('input[name="gender"]').forEach(el => {
    el.addEventListener('change', syncAppearanceToCharacter);
  });
  if (appEls.ageSelect) appEls.ageSelect.addEventListener('change', syncAppearanceToCharacter);
  if (appEls.bodyType) appEls.bodyType.addEventListener('change', syncAppearanceToCharacter);
}

// === СПРАВОЧНАЯ КНОПКА И МОДАЛЬНОЕ ОКНО ===

function initHelpButton() {
  // Ищем верхний бар или создаём кнопку рядом с appRefresh/appSearch
  const toolbar = appEls.refresh ? appEls.refresh.parentElement :
                  appEls.search ? appEls.search.parentElement : null;

  if (!toolbar) return;

  // Проверяем, не создана ли уже
  if (document.getElementById('appHelp')) return;

  const helpBtn = document.createElement('button');
  helpBtn.id = 'appHelp';
  helpBtn.className = 'toolbar-btn help-btn';
  helpBtn.title = 'Справочник персонажа';
  helpBtn.innerHTML = '?';
  helpBtn.style.cssText = 'margin-left:8px;min-width:32px;height:32px;border-radius:50%;font-weight:bold;cursor:pointer;';

  helpBtn.addEventListener('click', openHelpModal);
  toolbar.appendChild(helpBtn);
}

function getPartLabel(value) {
  const found = BODY_PARTS.find(p => p.value === value);
  return found ? found.label : value;
}

function findFullItem(name, dataKey) {
  const list = appearanceData[dataKey] || [];
  return list.find(item => item.name === name) || null;
}

function openHelpModal() {
  // Удаляем старое окно, если есть
  const oldModal = document.getElementById('appearanceHelpModal');
  if (oldModal) oldModal.remove();

  const currentData = getAppearanceData();

  const modal = document.createElement('dialog');
  modal.id = 'appearanceHelpModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = buildHelpModalHTML(currentData);

  document.body.appendChild(modal);
  modal.showModal();

  // Закрытие по клику на фон или крестик
  modal.addEventListener('click', function(e) {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      modal.close();
      modal.remove();
    }
  });
}

function buildHelpModalHTML(data) {
  const sections = [];

  // --- ТРАВМЫ ---
  if (data.traumas && data.traumas.length > 0) {
    const items = data.traumas.map(row => {
      const full = findFullItem(row.type, 'traumas');
      return renderItemCard(row.type, row.part, full, 'trauma');
    }).join('');
    sections.push(`<div class="help-section"><h3>Травмы</h3>${items}</div>`);
  }

  // --- МУТАЦИИ ---
  if (data.mutations && data.mutations.length > 0) {
    const items = data.mutations.map(row => {
      const full = findFullItem(row.type, 'mutations');
      return renderItemCard(row.type, row.part, full, 'mutation');
    }).join('');
    sections.push(`<div class="help-section"><h3>Мутации</h3>${items}</div>`);
  }

  // --- МОДИФИКАЦИИ ---
  if (data.modifications && data.modifications.length > 0) {
    const items = data.modifications.map(row => {
      const full = findFullItem(row.type, 'modifications');
      return renderItemCard(row.type, row.part, full, 'modification');
    }).join('');
    sections.push(`<div class="help-section"><h3>Модификации</h3>${items}</div>`);
  }

  const content = sections.length ? sections.join('') :
    '<div class="help-empty">У персонажа пока нет травм, мутаций или модификаций.</div>';

  return `
    <div class="modal" style="max-width:720px;width:95%;">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
        <div class="modal-title" style="margin-bottom:0;">Справочник персонажа</div>
        <button class="modal-close" title="Закрыть" style="background:none;border:none;color:var(--text-secondary);font-size:24px;cursor:pointer;line-height:1;transition:color 0.2s;">×</button>
      </div>
      <div class="modal-body" style="gap:0;">
        ${content}
      </div>
    </div>
    <style>
      #appearanceHelpModal .modal-close:hover { color: var(--accent); }
      .help-section { margin-bottom: 28px; }
      .help-section:last-child { margin-bottom: 0; }
      .help-section h3 {
        margin: 0 0 14px 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--accent);
        font-weight: 700;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }
      .help-card {
        background: rgba(26, 34, 26, 0.5);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
      }
      .help-card:hover {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-glow);
        transform: translateY(-1px);
      }
      .help-card-title {
        font-weight: 800;
        font-size: 15px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      .help-card-meta {
        font-size: 11px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .help-card-desc {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 10px;
      }
      .help-card-effect {
        font-size: 13px;
        color: var(--green);
        line-height: 1.5;
        background: rgba(125, 166, 125, 0.08);
        padding: 10px 12px;
        border-radius: 8px;
        border-left: 3px solid var(--green);
      }
      .help-card-extra {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .help-empty {
        text-align: center;
        color: var(--text-secondary);
        padding: 40px 20px;
        font-style: italic;
        font-size: 14px;
      }
      .help-tag {
        display: inline-flex;
        align-items: center;
        background: var(--input-bg);
        border: 1px solid var(--border);
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    </style>
  `;
}

function renderItemCard(name, partValue, fullData, kind) {
  if (!name) return '';

  const partLabel = getPartLabel(partValue) || '—';
  const desc = fullData && fullData.description ? fullData.description : 'Описание отсутствует.';
  const effect = fullData && fullData.effect ? fullData.effect : '';

  let extraHTML = '';
  if (kind === 'modification' && fullData) {
    const model = fullData.model ? `<span class="help-tag">Модель: ${fullData.model}</span>` : '';
    const cost = fullData.cost ? `<span class="help-tag">Стоимость: ${fullData.cost}</span>` : '';
    const spheres = fullData.spheres && fullData.spheres.length
      ? `<span class="help-tag">Сферы: ${fullData.spheres.join(', ')}</span>` : '';
    extraHTML = `<div class="help-card-extra">${model}${cost}${spheres}</div>`;
  }

  return `
    <div class="help-card">
      <div class="help-card-title">${name}</div>
      <div class="help-card-meta">${partLabel}</div>
      <div class="help-card-desc">${desc}</div>
      ${effect ? `<div class="help-card-effect"><strong>Эффект:</strong><br>${effect.replace(/\n/g, '<br>')}</div>` : ''}
      ${extraHTML}
    </div>
  `;
}

// === ДИНАМИЧЕСКИЕ СТРОКИ ===
function createPartSelect() {
  const sel = document.createElement('select');
  sel.className = 'field-input styled-select part-select';
  sel.innerHTML = '<option value="" disabled selected>Часть тела</option>' +
    BODY_PARTS.map(function(p) { return '<option value="' + p.value + '">' + p.label + '</option>'; }).join('');
  return sel;
}

function createTypeSelect(dataKey, partValue) {
  const sel = document.createElement('select');
  sel.className = 'field-input styled-select type-select';
  sel.disabled = true;
  sel.innerHTML = '<option value="" disabled selected>—</option>';
  if (partValue) {
    const items = appearanceData[dataKey].filter(function(i) { return i.category === partValue; });
    sel.innerHTML = items.length
      ? '<option value="" disabled selected>Выберите...</option>' + items.map(function(i) { return '<option value="' + i.name + '">' + i.name + '</option>'; }).join('')
      : '<option value="" disabled selected>Нет данных</option>';
    sel.disabled = items.length === 0;
  }
  return sel;
}

function addRowWithData(type, rowData) {
  const container = document.getElementById(type + 'List');
  if (!container) return;

  const dataKey = type === 'modification' ? 'modifications' : type + 's';

  const row = document.createElement('div');
  row.className = 'entry-row';

  const partSel = createPartSelect();
  if (rowData && rowData.part) partSel.value = rowData.part;

  const typeSel = createTypeSelect(dataKey, (rowData && rowData.part) || null);

  // FIX: если сохранённого значения нет в текущем справочнике — добавляем его вручную,
  // чтобы импорт не терял данные при незагруженных/изменённых JSON-файлах.
  if (rowData && rowData.type) {
    const alreadyExists = Array.from(typeSel.options).some(opt => opt.value === rowData.type);
    if (!alreadyExists) {
      const opt = document.createElement('option');
      opt.value = rowData.type;
      opt.textContent = rowData.type;
      typeSel.appendChild(opt);
    }
    typeSel.value = rowData.type;
  }
  if (rowData && rowData.part) typeSel.disabled = false;

  typeSel.addEventListener('change', function() {
  syncAppearanceToCharacter();
  if (typeof recalcAll === 'function') recalcAll();
  });

  const look = document.createElement('div');
  look.className = 'look-field';
  look.textContent = 'КАК ЭТО ВЫГЛЯДИТ';

  const del = document.createElement('button');
  del.className = 'remove-btn';
  del.innerHTML = '×';
  del.title = 'Удалить';
  del.onclick = function() { row.remove(); syncAppearanceToCharacter(); };

  partSel.addEventListener('change', function() {
    const currentTypeSel = row.querySelector('.type-select');
    const newSel = createTypeSelect(dataKey, partSel.value);
    newSel.addEventListener('change', function() {
      syncAppearanceToCharacter();
      if (typeof recalcAll === 'function') recalcAll();
    });
    if (currentTypeSel) {
      row.replaceChild(newSel, currentTypeSel);
    } else {
      row.insertBefore(newSel, look);
    }
    syncAppearanceToCharacter();
    if (typeof recalcAll === 'function') recalcAll();
  });

  row.appendChild(partSel);
  row.appendChild(typeSel);
  row.appendChild(look);
  row.appendChild(del);
  container.appendChild(row);
}

// Глобальная функция для onclick из HTML
function addRow(type) {
  addRowWithData(type, { part: '', type: '' });
}

// === ЭКСПОРТ ДАННЫХ ===
function getAppearanceData() {
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const ageToggle = document.getElementById('ageToggle');

  function collectRows(type) {
    const container = document.getElementById(type + 'List');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.entry-row')).map(function(row) {
      const selects = row.querySelectorAll('select');
      return {
        part: selects[0] ? selects[0].value : null,
        type: selects[1] ? selects[1].value : null
      };
    }).filter(function(r) { return r.part; });
  }

  return {
    skinColor: appEls.skinColor ? appEls.skinColor.value : '#c68642',
    ageRestricted: ageToggle ? ageToggle.classList.contains('active') : false,
    gender: genderEl ? genderEl.value : null,
    ageGroup: appEls.ageSelect ? appEls.ageSelect.value : null,
    bodyType: appEls.bodyType ? appEls.bodyType.value : null,
    traumas: collectRows('trauma'),
    mutations: collectRows('mutation'),
    modifications: collectRows('modification')
  };
}

// === ЗАГРУЗКА ДАННЫХ ===
function loadAppearanceData(data) {
  if (!data) return;
  if (appEls.skinColor && data.skinColor) appEls.skinColor.value = data.skinColor;
  if (appEls.ageToggle) appEls.ageToggle.classList.toggle('active', !!data.ageRestricted);
  if (appEls.ageSelect && data.ageGroup) appEls.ageSelect.value = data.ageGroup;
  if (appEls.bodyType && data.bodyType) appEls.bodyType.value = data.bodyType;

  if (data.gender) {
    const g = document.getElementById('g-' + data.gender);
    if (g) g.checked = true;
  }

  // Очистка существующих динамических строк
  ['trauma', 'mutation', 'modification'].forEach(t => {
    const list = document.getElementById(t + 'List');
    if (list) list.innerHTML = '';
  });

  // Восстановление динамических строк
  if (data.traumas) data.traumas.forEach(t => addRowWithData('trauma', t));
  if (data.mutations) data.mutations.forEach(m => addRowWithData('mutation', m));
  if (data.modifications) data.modifications.forEach(m => addRowWithData('modification', m));
}

// === СИНХРОНИЗАЦИЯ С character ===
function syncAppearanceFromCharacter() {
  const charData = (typeof character !== 'undefined' && character) ? character : {};
  if (appEls.species) appEls.species.value = charData.species || '';
  if (appEls.race)    appEls.race.value    = charData.race    || '';
}

function syncAppearanceToCharacter() {
  if (typeof character !== 'undefined' && character) {
    character.appearance = getAppearanceData();
  }
  if (typeof detectNaturalEquipment === 'function') {
    detectNaturalEquipment(character.species, character.race);
  }
  if (typeof recalcAll === 'function') recalcAll();
}

// === АВТОЗАПУСК ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppearanceEditor);
} else {
  initAppearanceEditor();
}