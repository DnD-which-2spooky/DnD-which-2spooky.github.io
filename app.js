// ============================================================
// APP ENTRY POINT — Инициализация и запуск приложения
// ============================================================

// Глобальная инициализация приложения
async function initApp() {
  // Загружаем данные
  await loadOrigins();
  await loadSkills();
  await loadWeaponData();
  await loadArmorData();
  await loadNaturalEquipment();
  await loadMagicData();
  await loadTraitsData();

  // Привязываем инпуты
  bindInputs();

  // Setup MutationObserver for dynamic elements
  setupDynamicBinding();

  // Инициализируем UI
  initSidebar();
  updateDynamicTabs();
  updateToggleButtons();

  // Инициализируем автокомплит оружия
  setupWeaponAutocomplete();
  setupWeaponDurabilityListeners();
  setupWeaponListeners();
  setupWeaponAutoSave();

  // Инициализируем инвентарь (DOM уже готов)
  if (typeof initInventoryApp === 'function') {
    initInventoryApp();
  }

  if (typeof initPsionics === 'function') {
    initPsionics();
  }

  if (typeof loadProficienciesFromCharacter === 'function') {
  loadProficienciesFromCharacter();
}

  // Загружаем начальные данные
  updateWeaponSlotStyles();
  updateArmorSlotStyles();
  initAppearanceTab();

  // Первичный пересчёт
  recalcAll();

  console.log('Character sheet initialized successfully');
}

// Запускаем приложение когда DOM готов
document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// APPEARANCE TAB INTEGRATION
// ============================================================

function toggleAppearance() {
  const btn = document.querySelector('[data-toggle="isAppearance"]');
  const tabBtn = document.getElementById('tab-appearance-btn');

  if (!btn || !tabBtn) return;

  btn.classList.toggle('active');
  const isActive = btn.classList.contains('active');

  if (isActive) {
    tabBtn.classList.remove('hidden');
    if (typeof syncAppearanceFromCharacter === 'function') syncAppearanceFromCharacter();
  } else {
    tabBtn.classList.add('hidden');
    // If appearance tab is currently active, switch to notes
    if (tabBtn.classList.contains('active')) {
      switchTab('tab-notes');
    }
  }

  // Save state to character
  if (typeof character !== 'undefined' && character) {
    character.isAppearance = isActive;
  }
}



// Initialize appearance state from character data
function initAppearanceTab() {
  const btn = document.querySelector('[data-toggle="isAppearance"]');
  const tabBtn = document.getElementById('tab-appearance-btn');

  if (!btn || !tabBtn) return;

  // Check if character has appearance enabled
  const isEnabled = (typeof character !== 'undefined' && character && character.isAppearance) || false;

  if (isEnabled) {
    btn.classList.add('active');
    tabBtn.classList.remove('hidden');
    if (typeof syncAppearanceFromCharacter === 'function') syncAppearanceFromCharacter();
  } else {
    btn.classList.remove('active');
    tabBtn.classList.add('hidden');
  }
}