// ============================================================
// PSIONICS MODULE — Псионика: дисциплины, PP, перегрузка, приёмы
// ============================================================

let _psionicsInited = false;
/* ==========================================================
   1. ДАННЫЕ ДИСЦИПЛИН
   ========================================================== */
const PSIONIC_LEVELS = ['α', 'β', 'δ', 'ε', 'ζ', 'τ', 'ω'];

const DISCIPLINES = {
  telekinesis: {
    name: 'Телекинез',
    keyAbility: 'int',
    keyAbilityName: 'Интеллект',
    stats: {
      maxWeightMult:  [1, 2, 4, 8, 16, 32, 64],
      distanceMult:   [4, 6, 10, 16, 24, 34, 46],
      targetsBase:    [1, 0, 3, 6, 10, 15, 21],
      saveBase:       [10, 12, 14, 16, 18, 20, 22],
      checkBonusBase: [0, 0, 2, 3, 4, 5, 6]
    },
    techniques: [
      { name: 'Сдвиг',            level: 1, pp: 2, castTime: 'Действие',
        desc: 'Сдвигает цель на 2×ИНТ м в любом направлении. Существо совершает спасбросок Силы. При провале — отлетает на полную дистанцию и падает. При успехе — сдвинуто на половину, стоит на ногах.' },
      { name: 'Притяжение',       level: 1, pp: 4, castTime: 'Действие',
        desc: 'Цель весом до максимального веса летит к вам в руку. Существо может сопротивляться спасброском Силы; при провале притягивается к вам вплотную.' },
      { name: 'Замирание',        level: 1, pp: 4, castTime: 'Действие',
        desc: 'Цель зависает в воздухе, неподвижно. Существо в начале каждого своего хода совершает спасбросок Силы (СЛ из таблицы). При провале — скорость 0, помеха на броски атаки и проверки Ловкости. За повторную трату PP эффект продляется.' },
      { name: 'Клик',             level: 1, pp: 2, castTime: 'Действие',
        desc: 'Точная манипуляция на расстоянии: повернуть ключ в замке, нажать кнопку, вытащить предмет из кармана и прочее. СЛ определяет Мастер.' },
      { name: 'Толчок',           level: 2, pp: 4, castTime: 'Действие',
        desc: 'Швырок объекта или чистый силовой импульс. Атака по КД цели. Урон от метания: 1[макс. PL]d6 за каждые полные 5 кг веса. Толчок таким способом: 1d8 + Б.проверки дроб. урона.' },
      { name: 'Буря',             level: 2, pp: 4, castTime: 'Действие',
        desc: 'Вы вращаете мелкие объекты (осколки, пыль, гравий) в небольшой области вокруг (выберите 1 свободную клетку). До начала вашего следующего хода вы получаете +1 КД при атаках с этой стороны, а любое существо, которое проходит по этой клетке или стоит на ней, получает 1d6 руб. урона. За повторную трату PP эффект продляется.' },
      { name: 'Отражение',        level: 2, pp: 4, castTime: 'Реакция',
        desc: 'Реакцией отклонить летящий снаряд, стрелу или пулю. Совершите проверку телекинеза против СЛ атаки снаряда. При успехе снаряд отлетает в сторону или падает.' }
    ]
  },

  phasing: {
    name: 'Фазирование',
    keyAbility: 'dex',
    keyAbilityName: 'Ловкость',
    stats: {
      distanceMult:   [0, 0, 4, 6, 8, 10, 12],
      targetsBase:    [1, 1, 2, 3, 4, 5, 6],
      saveBase:       [null, 10, 12, 14, 15, 16, 17],
      checkBonusBase: [0, 1, 2, 3, 4, 5, 6]
    },
    techniques: [
      { name: 'Фазовый шаг',      level: 1, pp: 2, castTime: 'Действие',
        desc: 'Вы на мгновение становитесь нематериальным и проходите сквозь одно препятствие толщиной до 30 см. Одежда и предметы в руках выпадают (уровень α).' },
      { name: 'Призрачное тело',  level: 2, pp: 4, castTime: 'Действие',
        desc: 'Вы и экипировка становитесь нематериальными на 1 раунд. Можете ходить по воздуху и воде. Другие существа при прямом контакте могут быть затянуты, если согласны или провалят спасбросок.' },
      { name: 'Селективное фазирование', level: 3, pp: 6, castTime: 'Действие',
        desc: 'Фазируете отдельные части тела, позволяя проходить удары сквозь вас. +2 КД до начала вашего следующего хода.' },
      { name: 'Электронная дезориентация', level: 3, pp: 4, castTime: 'Действие',
        desc: 'Проходя сквозь электронику, вы вызываете сбой в одном устройстве в пределах касания.' }
    ]
  },

  telepathy: {
    name: 'Телепатия',
    keyAbility: 'wis',
    keyAbilityName: 'Воля',
    stats: {
      chips:          [2, 4, 6, 8, 10, 12, 14],
      distanceMult:   [1, 2, 3, 4, 5, 6, 7],
      alliesBase:     [null, 1, 2, 4, 6, 8, 10],
      saveBase:       [10, 12, 14, 15, 16, 17, 18],
      checkBonusBase: [0, 1, 2, 3, 4, 5, 6]
    },
    techniques: [
      { name: 'Проникновение',    level: 1, pp: 1, castTime: 'Действие',
        desc: 'Мини-игра: положить свою фишку в любой внешний сектор или передвинуть из внешнего в соседний внешний.' },
      { name: 'Щит',              level: 1, pp: 2, castTime: 'Реакция',
        desc: 'Мини-игра: несоюзные фишки не могут попасть в этот сектор.' },
      { name: 'Атака',            level: 1, pp: 1, castTime: 'Действие',
        desc: 'Мини-игра: удалите любую чужую фишку из сектора, где есть хотя бы 1 ваша/союзная фишка.' },
      { name: 'Синхронизация',    level: 1, pp: 0, castTime: 'Действие',
        desc: 'Мини-игра: фишки телепата, с которым вы провели это действие, считаются союзными.' },
      { name: 'Углубление',       level: 2, pp: 1, castTime: 'Действие',
        desc: 'Мини-игра: переместите свою фишку из смежного внешнего сектора во внутренний.' },
      { name: 'Воздействие',      level: 2, pp: 1, castTime: 'Действие',
        desc: 'Мини-игра: активируйте эффект любого сектора, в котором есть ваша фишка. Соревнование Телепатии нападающего и Воли/Телепатии жертвы.' },
      { name: 'Разрушение',       level: 3, pp: 2, castTime: 'Действие',
        desc: 'Мини-игра: нанесите столько 1d4 псих. урона жертве, сколько фишек находится в выбранном вами секторе, если там нет чужих фишек.' },
      { name: 'Созидание',        level: 3, pp: 2, castTime: 'Действие',
        desc: 'Мини-игра: восстановите столько 1d4 хитов жертве, сколько фишек находится в выбранном вами секторе, если там нет чужих фишек.' }
    ]
  }
};

/* ==========================================================
   2. СОСТОЯНИЕ ПСИОНИКИ
   ========================================================== */
let psionicState = {
  discipline: 'telekinesis',
  level: 1,
  ppCurrent: 0,
  overloadCount: 0,
  overloadDice: 4
};

/* ==========================================================
   3. ИНИЦИАЛИЗАЦИЯ
   ========================================================== */
function initPsionics() {
  if (_psionicsInited) {
    if (character.psionics) setPsionicsData(character.psionics);
    else renderPsionics();
    return;
  }
  _psionicsInited = true;

  const discSelect = document.getElementById('psionicDiscipline');
  const levelSelect = document.getElementById('psionicDisciplineLevel');
  const ppCurrentInput = document.getElementById('psionicPpCurrent');

  if (discSelect) {
    discSelect.addEventListener('change', (e) => {
      psionicState.discipline = e.target.value;
      if (character.psionics) character.psionics.discipline = e.target.value;
      renderPsionics();
      if (typeof recalcAll === 'function') recalcAll();
    });
  }

  if (levelSelect) {
    levelSelect.addEventListener('change', (e) => {
      psionicState.level = parseInt(e.target.value);
      if (character.psionics) character.psionics.level = psionicState.level;
      renderPsionics();
      if (typeof recalcAll === 'function') recalcAll();
    });
  }

  if (ppCurrentInput) {
    ppCurrentInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value) || 0;
      const maxPP = getPsionicMaxPP();
      if (val > maxPP) {
        val = maxPP;
        e.target.value = val;
      }
      if (val < 0) {
        val = 0;
        e.target.value = val;
      }
      psionicState.ppCurrent = val;
      if (character.psionics) character.psionics.ppCurrent = val;
      updatePpDisplay();
      if (typeof recalcAll === 'function') recalcAll();
    });
  }

  if (character.psionics) {
    psionicState = { ...psionicState, ...character.psionics };
    if (discSelect) discSelect.value = psionicState.discipline;
    if (levelSelect) levelSelect.value = psionicState.level;
  } else {
    character.psionics = { ...psionicState };
  }

  renderPsionics();
  clampPpCurrent();
}

/* ==========================================================
   4. РАСЧЁТ PP
   ========================================================== */
function getPsionicMaxPP() {
  const discipline = DISCIPLINES[psionicState.discipline];
  if (!discipline) return 0;

  const abilityKey = discipline.keyAbility;
  const abilityScore = Number(character.abilities?.[abilityKey]) || 10;
  const abilityMod = abilityModifier(abilityScore);

  const level = psionicState.level;
  const basePP = 5 + abilityMod + level * 2;

  const numericBonus = Number(character.bonuses?.ppMax) || 0;
  const percentBonuses = (character.bonusSources?.ppMax || [])
    .filter(b => b.type === 'percent')
    .reduce((s, b) => s + (Number(b.value) || 0), 0);
  const multiplier = 1 + percentBonuses / 100;

  return Math.max(0, Math.round((basePP + numericBonus) * multiplier));
}

function getShortRestPP() {
  return Math.floor(getPsionicMaxPP() / 2);
}

function clampPpCurrent() {
  const maxPP = getPsionicMaxPP();
  if (psionicState.ppCurrent > maxPP) {
    psionicState.ppCurrent = maxPP;
  }
  if (psionicState.ppCurrent < 0) {
    psionicState.ppCurrent = 0;
  }
  const input = document.getElementById('psionicPpCurrent');
  if (input) {
    input.value = psionicState.ppCurrent;
  }
  if (character.psionics) {
    character.psionics.ppCurrent = psionicState.ppCurrent;
  }
  updatePpDisplay();
}

/* ==========================================================
   5. РЕНДЕРИНГ
   ========================================================== */
function renderPsionics() {
  recalcPsionics();
  renderTkStats();
  renderTechniques();
  updatePpDisplay();
}

function recalcPsionics() {
  const maxPP = getPsionicMaxPP();
  const shortRest = getShortRestPP();

  const ppMaxEl = document.getElementById('psionicPpMax');
  const shortRestEl = document.getElementById('psionicShortRest');

  if (ppMaxEl) ppMaxEl.textContent = maxPP;
  if (shortRestEl) shortRestEl.textContent = shortRest;

  const discipline = DISCIPLINES[psionicState.discipline];
  const keyAbilityEl = document.querySelector('.psionic-key-ability');
  if (keyAbilityEl && discipline) {
    keyAbilityEl.textContent = `Ключевая характеристика: ${discipline.keyAbilityName}`;
  }

  if (!character.psionics) character.psionics = {};
  character.psionics.maxPP = maxPP;
  character.psionics.shortRest = shortRest;

  clampPpCurrent();
}

function updatePpDisplay() {
  const ppCurrentInput = document.getElementById('psionicPpCurrent');
  const ppMaxEl = document.getElementById('psionicPpMax');
  if (!ppCurrentInput || !ppMaxEl) return;

  const current = parseInt(ppCurrentInput.value) || 0;
  const max = parseInt(ppMaxEl.textContent) || 0;

  ppCurrentInput.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
  if (current === 0) ppCurrentInput.classList.add('hp-empty');
  else if (current >= max * 0.5) ppCurrentInput.classList.add('hp-green');
  else if (current >= max * 0.25) ppCurrentInput.classList.add('hp-orange');
  else ppCurrentInput.classList.add('hp-red');

  // Синхронизация с главной страницей
  const mainPpCurrent = document.getElementById('mainPpCurrent');
  if (mainPpCurrent) {
    mainPpCurrent.value = current;
    mainPpCurrent.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
    if (current === 0) mainPpCurrent.classList.add('hp-empty');
    else if (current >= max * 0.5) mainPpCurrent.classList.add('hp-green');
    else if (current >= max * 0.25) mainPpCurrent.classList.add('hp-orange');
    else mainPpCurrent.classList.add('hp-red');
  }
}

function updateMainPpCurrent(value) {
  if (!psionicState) return;
  let val = Number(value) || 0;
  const maxPP = getPsionicMaxPP();
  if (val > maxPP) val = maxPP;
  if (val < 0) val = 0;
  psionicState.ppCurrent = val;

  const ppInput = document.getElementById('psionicPpCurrent');
  if (ppInput) ppInput.value = val;

  updatePpDisplay();

  // Цветовое состояние на главном экране
  const mainPpCurrent = document.getElementById('mainPpCurrent');
  if (mainPpCurrent) {
    mainPpCurrent.classList.remove('hp-green', 'hp-orange', 'hp-red', 'hp-empty');
    if (!val && val !== 0) mainPpCurrent.classList.add('hp-empty');
    else if (val >= maxPP * 0.5) mainPpCurrent.classList.add('hp-green');
    else if (val >= maxPP * 0.25) mainPpCurrent.classList.add('hp-orange');
    else mainPpCurrent.classList.add('hp-red');
  }

  if (typeof recalcAll === 'function') recalcAll();
}

/* ==========================================================
   6. ТАБЛИЦА СТАТОВ ДИСЦИПЛИНЫ
   ========================================================== */
function renderTkStats() {
  const grid = document.getElementById('tkStatsGrid');
  if (!grid) return;

  const discipline = DISCIPLINES[psionicState.discipline];
  if (!discipline) {
    grid.innerHTML = '<div class="placeholder-text">Выберите дисциплину</div>';
    return;
  }

  const abilityKey = discipline.keyAbility;
  const abilityScore = Number(character.abilities?.[abilityKey]) || 10;
  const abilityMod = abilityModifier(abilityScore);
  const level = psionicState.level;
  const levelIndex = level - 1;

  const stats = discipline.stats;
  const rows = [];

  if (psionicState.discipline === 'telekinesis') {
    const maxWeight = (stats.maxWeightMult[levelIndex] || 0) * abilityMod;
    const distance = (stats.distanceMult[levelIndex] || 0) * abilityMod;
    // FIX: 1-й уровень — фиксированно 1 цель, со 2-го — base + ИНТ
    const maxTargets = levelIndex === 0 ? 1 : (stats.targetsBase[levelIndex] || 0) + abilityMod;
    const saveDC = (stats.saveBase[levelIndex] || 0) + abilityMod;
    const checkBonus = (stats.checkBonusBase[levelIndex] || 0) + abilityMod;

    rows.push(
      { label: 'Макс. вес', value: `${maxWeight} кг`, formula: `${stats.maxWeightMult[levelIndex]}×${discipline.keyAbilityName}` },
      { label: 'Дистанция', value: `${distance} м`, formula: `${stats.distanceMult[levelIndex]}×${discipline.keyAbilityName}` },
      { label: 'Макс. целей', value: `${maxTargets}`, formula: levelIndex === 0 ? '1' : `${stats.targetsBase[levelIndex]}+${discipline.keyAbilityName}` },
      { label: 'Спас. СЛ', value: `${saveDC}`, formula: `${stats.saveBase[levelIndex]}+${discipline.keyAbilityName}` },
      { label: 'Б. проверки', value: `+${checkBonus}`, formula: `${stats.checkBonusBase[levelIndex]}+${discipline.keyAbilityName}` }
    );
  } else if (psionicState.discipline === 'phasing') {
    const distance = levelIndex >= 2 ? `${(stats.distanceMult[levelIndex] || 0) * abilityMod} м` : '—';
    const maxTargets = (stats.targetsBase[levelIndex] || 0) + (levelIndex >= 1 ? abilityMod : 0);
    const saveDC = stats.saveBase[levelIndex] !== null ? `${(stats.saveBase[levelIndex] || 0) + abilityMod}` : '—';
    const checkBonus = (stats.checkBonusBase[levelIndex] || 0) + abilityMod;

    rows.push(
      { label: 'Дистанция', value: distance, formula: levelIndex >= 2 ? `${stats.distanceMult[levelIndex]}×${discipline.keyAbilityName}` : '—' },
      { label: 'Макс. целей', value: `${maxTargets}`, formula: `${stats.targetsBase[levelIndex]}+${levelIndex >= 1 ? discipline.keyAbilityName : '0'}` },
      { label: 'Спас. СЛ', value: saveDC, formula: stats.saveBase[levelIndex] !== null ? `${stats.saveBase[levelIndex]}+${discipline.keyAbilityName}` : '—' },
      { label: 'Б. проверки', value: `+${checkBonus}`, formula: `${stats.checkBonusBase[levelIndex]}+${discipline.keyAbilityName}` }
    );
  } else if (psionicState.discipline === 'telepathy') {
    const chips = stats.chips[levelIndex] || 0;
    const distance = (stats.distanceMult[levelIndex] || 0) * abilityMod;
    const allies = stats.alliesBase[levelIndex] !== null ? `${(stats.alliesBase[levelIndex] || 0) + abilityMod}` : '—';
    const saveDC = (stats.saveBase[levelIndex] || 0) + abilityMod;
    const checkBonus = (stats.checkBonusBase[levelIndex] || 0) + abilityMod;

    rows.push(
      { label: 'Фишки', value: `${chips}`, formula: 'фикс.' },
      { label: 'Дистанция', value: `${distance} м`, formula: `${stats.distanceMult[levelIndex]}×${discipline.keyAbilityName}` },
      { label: 'Союзники в сети', value: allies, formula: stats.alliesBase[levelIndex] !== null ? `${stats.alliesBase[levelIndex]}+${discipline.keyAbilityName}` : '—' },
      { label: 'Спас. СЛ', value: `${saveDC}`, formula: `${stats.saveBase[levelIndex]}+${discipline.keyAbilityName}` },
      { label: 'Б. проверки', value: `+${checkBonus}`, formula: `${stats.checkBonusBase[levelIndex]}+${discipline.keyAbilityName}` }
    );
  }

  grid.innerHTML = rows.map(r => `
    <div class="derived-card">
      <div class="derived-name">${r.label}</div>
      <div class="derived-value">${r.value}</div>
      <div class="derived-formula">${r.formula}</div>
    </div>
  `).join('');
}

/* ==========================================================
   7. ПРИЁМЫ
   ========================================================== */
function renderTechniques() {
  const container = document.getElementById('tkTechniquesList');
  if (!container) return;

  const discipline = DISCIPLINES[psionicState.discipline];
  if (!discipline) {
    container.innerHTML = '<div class="placeholder-text">Нет доступных приёмов</div>';
    return;
  }

  const level = psionicState.level;
  const available = discipline.techniques.filter(t => t.level <= level);

  if (available.length === 0) {
    container.innerHTML = '<div class="placeholder-text">На данном уровне приёмы отсутствуют</div>';
    return;
  }

  const grouped = {};
  available.forEach(t => {
    const lvlName = `Уровень ${PSIONIC_LEVELS[t.level - 1]}`;
    if (!grouped[lvlName]) grouped[lvlName] = [];
    grouped[lvlName].push(t);
  });

  container.innerHTML = Object.entries(grouped).map(([lvlName, techniques]) => `
    <div class="technique-group">
      <div class="technique-group-title">${escapeHtml(lvlName)}</div>
      ${techniques.map(t => `
        <div class="technique-card">
          <div class="technique-header">
            <span class="technique-name">${escapeHtml(t.name)}</span>
            <span class="technique-pp">${t.pp} PP</span>
            <span class="technique-cast">${escapeHtml(t.castTime)}</span>
          </div>
          <div class="technique-desc">${escapeHtml(t.desc)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

/* ==========================================================
   8. ОТДЫХ И ПЕРЕГРУЗКА
   ========================================================== */
function restPsionic(type) {
  const maxPP = getPsionicMaxPP();
  const ppCurrentInput = document.getElementById('psionicPpCurrent');
  if (!ppCurrentInput) return;

  if (type === 'short') {
    const restore = Math.floor(maxPP / 2);
    let current = parseInt(ppCurrentInput.value) || 0;
    current = Math.min(maxPP, current + restore);
    ppCurrentInput.value = current;
    psionicState.ppCurrent = current;
  } else if (type === 'long') {
    ppCurrentInput.value = maxPP;
    psionicState.ppCurrent = maxPP;
    psionicState.overloadCount = 0;
    psionicState.overloadDice = 4;
    updateOverloadDisplay();
  }

  if (character.psionics) {
    character.psionics.ppCurrent = psionicState.ppCurrent;
    character.psionics.overloadCount = psionicState.overloadCount;
    character.psionics.overloadDice = psionicState.overloadDice;
  }

  const mainPpCurrent = document.getElementById('mainPpCurrent');
  if (mainPpCurrent) mainPpCurrent.value = psionicState.ppCurrent;

  updatePpDisplay();
  if (typeof recalcAll === 'function') recalcAll();
}

function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function updateOverloadDisplay() {
  const info = document.getElementById('psionicOverloadInfo');
  const diceSpan = document.getElementById('overloadDice');
  if (!info || !diceSpan) return;

  if (psionicState.overloadCount > 0) {
    diceSpan.textContent = `d${psionicState.overloadDice}`;
    info.style.display = 'block';
  } else {
    info.style.display = 'none';
  }
}

/* ==========================================================
   9. ЭКСПОРТ / ИМПОРТ
   ========================================================== */
function getPsionicsData() {
  return {
    discipline: psionicState.discipline,
    level: psionicState.level,
    ppCurrent: psionicState.ppCurrent,
    overloadCount: psionicState.overloadCount,
    overloadDice: psionicState.overloadDice
  };
}

function setPsionicsData(data) {
  if (!data) return;
  psionicState = { ...psionicState, ...data };
  if (character.psionics) character.psionics = { ...psionicState };

  const discSelect = document.getElementById('psionicDiscipline');
  const levelSelect = document.getElementById('psionicDisciplineLevel');
  const ppCurrentInput = document.getElementById('psionicPpCurrent');

  if (discSelect) discSelect.value = psionicState.discipline;
  if (levelSelect) levelSelect.value = psionicState.level;
  if (ppCurrentInput) ppCurrentInput.value = psionicState.ppCurrent;

  const mainPpCurrent = document.getElementById('mainPpCurrent');
  if (mainPpCurrent) mainPpCurrent.value = psionicState.ppCurrent;

  renderPsionics();
  updateOverloadDisplay();
  clampPpCurrent();
}

/* ==========================================================
   10. СТИЛИ
   ========================================================== */
(function injectPsionicsStyles() {
  if (document.getElementById('psionics-styles')) return;

  const style = document.createElement('style');
  style.id = 'psionics-styles';
  style.textContent = `
    .psionic-pp-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-end;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(26, 34, 26, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .psionic-pp-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 160px;
    }
    .psionic-pp-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .psionic-overload-info {
      width: 100%;
      margin-top: 8px;
      padding: 10px 14px;
      background: rgba(231, 76, 60, 0.1);
      border: 1px solid rgba(231, 76, 60, 0.3);
      border-radius: 8px;
      color: #e74c3c;
      font-size: 13px;
      font-weight: 700;
    }
    .overload-warning {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .psionic-discipline-bar {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: flex-end;
      padding: 16px;
      background: rgba(26, 34, 26, 0.3);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .tk-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }
    .technique-group {
      margin-bottom: 20px;
    }
    .technique-group-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .technique-card {
      background: rgba(26, 34, 26, 0.5);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 10px;
      transition: all 0.2s ease;
    }
    .technique-card:hover {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .technique-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .technique-name {
      font-weight: 700;
      color: var(--accent);
      font-size: 14px;
      flex: 1;
    }
    .technique-pp {
      background: linear-gradient(135deg, var(--purple), #6a5a7e);
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .technique-cast {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .technique-desc {
      font-size: 13px;
      color: var(--text-primary);
      line-height: 1.5;
    }
    #psionicPpCurrent.hp-green { color: #7da67d !important; border-color: #27ae60 !important; box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.15), inset 0 1px 0 rgba(255,255,255,0.03); text-shadow: 0 0 8px rgba(125, 166, 125, 0.3); }
    #psionicPpCurrent.hp-orange { color: #e67e22 !important; border-color: #e67e22 !important; box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.15), inset 0 1px 0 rgba(255,255,255,0.03); text-shadow: 0 0 8px rgba(230, 126, 34, 0.3); }
    #psionicPpCurrent.hp-red { color: #e74c3c !important; border-color: #e74c3c !important; box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15), inset 0 1px 0 rgba(255,255,255,0.03); text-shadow: 0 0 8px rgba(231, 76, 60, 0.3); }
    #psionicPpCurrent.hp-empty { color: #5a6a5a !important; border-color: #3a4a3a !important; box-shadow: none; text-shadow: none; }
  `;
  document.head.appendChild(style);
})();

/* ==========================================================
   11. ЗАПУСК
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initPsionics();
});