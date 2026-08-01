// ============================================================
// UI MODULE — Интерфейс: табы, сайдбар, модальные окна
// ============================================================

// ===== MODAL HELPERS =====
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  if (el.tagName === 'DIALOG' && typeof el.showModal === 'function') {
    el.showModal();
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  if (el.tagName === 'DIALOG' && typeof el.close === 'function') {
    el.close();
  }
}

// ===== ВКЛАДКИ =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  if (tabId === 'tab-inventory') inventoryApp.draw();
}

// ===== ДИНАМИЧЕСКИЕ ВКЛАДКИ (МАГ / ПСИОНИК) =====
function toggleClass(classKey) {
  character[classKey] = !character[classKey];
  updateDynamicTabs(); updateToggleButtons();
  recalcAll();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function updateDynamicTabs() {
  const magicTab = document.querySelector('.tab-btn[data-tab="tab-magic"]');
  const psionicTab = document.querySelector('.tab-btn[data-tab="tab-psionic"]');
  if (character.isMage) magicTab?.classList.remove('hidden');
  else {
    magicTab?.classList.add('hidden');
    if (magicTab?.classList.contains('active')) switchTab('tab-notes');
  }
  if (character.isPsionic) psionicTab?.classList.remove('hidden');
  else {
    psionicTab?.classList.add('hidden');
    if (psionicTab?.classList.contains('active')) switchTab('tab-notes');
  }
}

function updateToggleButtons() {
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    const key = btn.dataset.toggle;
    btn.classList.toggle('active', !!character[key]);
  });
}

// ===== SIDEBAR NAVIGATION =====
let sidebarCollapsed = false;

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const body = document.body;

  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  body.classList.toggle('sidebar-collapsed-body', sidebarCollapsed);
  toggle.textContent = sidebarCollapsed ? '▶' : '◀';
  toggle.title = sidebarCollapsed ? 'Развернуть навигацию' : 'Свернуть навигацию';
}

function getCardTitleText(cardTitleEl) {
  let text = '';
  for (const node of cardTitleEl.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
      text += node.textContent;
    }
  }
  return text.trim() || cardTitleEl.textContent.trim();
}

function refreshSidebar() {
  buildSidebar();
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    updateSidebarForTab(activeTab.id);
  }
}

function buildSidebar() {
  const container = document.getElementById('sidebarContent');
  if (!container) return;
  container.innerHTML = '';

  const tabs = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    const tabId = tab.id;
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!tabBtn) return;

    const tabName = tabBtn.textContent.trim();
    const cards = Array.from(tab.querySelectorAll('.card')).filter(card => {
      const parentSubtab = card.closest('.sub-tab-content');
      if (parentSubtab) {
        return parentSubtab.classList.contains('active');
      }
      return true;
    });
    if (cards.length === 0) return;

    const section = document.createElement('div');
    section.className = 'sidebar-section';
    section.dataset.tabId = tabId;

    const label = document.createElement('div');
    label.className = 'sidebar-section-label';
    label.textContent = tabName;
    section.appendChild(label);

    cards.forEach((card, index) => {
      const titleEl = card.querySelector('.card-title');
      if (!titleEl) return;

      const titleText = getCardTitleText(titleEl);
      if (!titleText) return;

      let anchorId = card.id;
      if (!anchorId) {
        anchorId = `nav-${tabId}-card-${index}`;
        card.id = anchorId;
      }
      card.style.scrollMarginTop = '20px';

      const link = document.createElement('div');
      link.className = 'sidebar-link';
      link.dataset.target = anchorId;
      link.dataset.tab = tabId;
      link.title = titleText;
      link.innerHTML = `<span class="sidebar-link-dot"></span><span class="sidebar-link-text">${escapeHtml(titleText)}</span>`;

      link.addEventListener('click', () => {
        switchTab(tabId);
        requestAnimationFrame(() => {
          setTimeout(() => {
            const targetCard = document.getElementById(anchorId);
            if (targetCard) {
              targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
              targetCard.classList.remove('nav-highlight');
              void targetCard.offsetWidth;
              targetCard.classList.add('nav-highlight');
              setTimeout(() => targetCard.classList.remove('nav-highlight'), 1500);
            }
          }, 60);
        });

        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('expanded-mobile');
          sidebarCollapsed = true;
          document.getElementById('sidebarToggle').textContent = '▶';
        }
      });

      section.appendChild(link);
    });

    // ─── Динамические подпункты (subitems) ───
    if (tabId === 'tab-combat') {
      const armorItems = getArmorSubitems();
      if (armorItems.length > 0) {
        const subContainer = document.createElement('div');
        subContainer.className = 'sidebar-subitems';
        armorItems.forEach(sub => {
          const link = document.createElement('div');
          link.className = 'sidebar-link sidebar-subitem';
          link.innerHTML = `<span class="sidebar-link-dot" style="width:4px;height:4px;opacity:0.5;"></span><span class="sidebar-link-text">${escapeHtml(sub.label)}</span>`;
          link.setAttribute('onclick', sub.onclick);
          subContainer.appendChild(link);
        });
        section.appendChild(subContainer);
      }
    }

    if (tabId === 'tab-traits') {
      const activeSubtabBtn = document.querySelector('#traitsSubtabsContainer .sub-tab-btn.active');
      const activeSubtabId = activeSubtabBtn ? activeSubtabBtn.dataset.subtab : null;

      let traitItems = [];
      if (activeSubtabId === 'traits-abilities') {
        traitItems = getAbilitiesSubitems();
      } else if (activeSubtabId === 'traits-racial') {
        traitItems = getRacialTraitsSubitems();
      }

      if (traitItems.length > 0) {
        const subContainer = document.createElement('div');
        subContainer.className = 'sidebar-subitems';
        traitItems.forEach(sub => {
          const link = document.createElement('div');
          link.className = 'sidebar-link sidebar-subitem';
          link.innerHTML = `<span class="sidebar-link-dot" style="width:4px;height:4px;opacity:0.5;"></span><span class="sidebar-link-text">${escapeHtml(sub.label)}</span>`;
          link.setAttribute('onclick', sub.onclick);
          subContainer.appendChild(link);
        });
        section.appendChild(subContainer);
      }
    }
    // ──────────────────────────────────────────

    if (section.children.length > 1) {
      container.appendChild(section);
    }
  });
}

function updateSidebarForTab(activeTabId) {
  document.querySelectorAll('.sidebar-section').forEach(section => {
    section.style.display = section.dataset.tabId === activeTabId ? 'block' : 'none';
  });
  setTimeout(updateActiveSidebarLink, 100);
}

function updateActiveSidebarLink() {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  const tabId = activeTab.id;
  const cards = activeTab.querySelectorAll('.card');
  if (cards.length === 0) return;

  const scrollPos = window.scrollY + 120;
  let activeCard = null;

  for (const card of cards) {
    if (card.offsetTop <= scrollPos) {
      activeCard = card;
    }
  }

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
    if (activeCard && link.dataset.target === activeCard.id && link.dataset.tab === tabId) {
      link.classList.add('active');
    }
  });
}

// Override switchTab to update sidebar
const _originalSwitchTab = switchTab;
switchTab = function(tabId) {
  _originalSwitchTab(tabId);
  updateSidebarForTab(tabId);
};

function initSidebar() {
  buildSidebar();
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    updateSidebarForTab(activeTab.id);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveSidebarLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      document.getElementById('sidebar').classList.remove('expanded-mobile');
    }
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('expanded-mobile') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('expanded-mobile');
        sidebarCollapsed = true;
        document.getElementById('sidebarToggle').textContent = '▶';
      }
    }
  });
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function closeItemModal() {
  closeModal('itemModal');
  editingItem = null;
}

function saveItemModal() {
  if (!editingItem) return;
  editingItem.name = document.getElementById('itemName').value || 'Предмет';
  editingItem.w = parseInt(document.getElementById('itemW').value) || 1;
  editingItem.h = parseInt(document.getElementById('itemH').value) || 1;
  editingItem.weight = parseFloat(document.getElementById('itemWeight').value) || 0;
  editingItem.cost = parseInt(document.getElementById('itemCost').value) || 0;
  editingItem.description = document.getElementById('itemDesc').value;
  closeItemModal();
  inventoryApp.draw();
  inventoryApp.updateDisplay();
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function closeStorageModal() {
  closeModal('storageModal');
  inventoryApp.editingStorage = null;
}

function saveStorageModal() {
  const s = inventoryApp.editingStorage;
  if (!s) return;
  s.name = document.getElementById('storName').value || 'Хранилище';
  s.w = parseInt(document.getElementById('storW').value) || 1;
  s.h = parseInt(document.getElementById('storH').value) || 1;
  s.weightScale = parseFloat(document.getElementById('storScale').value) || 1;
  s.showMini = document.getElementById('storMini').checked;
  closeStorageModal();
  inventoryApp.draw();
  inventoryApp.updateDisplay();
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function closeModifierModal() {
  closeModal('modifierModal');
}

function saveModifierModal() {
  inventoryApp.modifiers = inventoryApp.editingModifiers.filter(m => m.description || m.percentage);
  closeModifierModal();
  inventoryApp.updateDisplay();
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function closeAddSchoolModal() {
  closeModal('addSchoolModal');
}

function closeAddSpellModal() {
  closeModal('addSpellModal');
}

function closeArtifactSpellModal() {
  closeModal('artifactSpellModal');
}

function closeManaFormulaModal() {
  closeModal('manaFormulaModal');
  editingSpellIndex = null;
}

function closeAddSoulModal() {
  closeModal('addSoulModal');
  window._addSoulSchoolIndex = null;
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function showContextMenu(x, y) {
  const m = document.getElementById('contextMenu');
  m.style.left = x + 'px';
  m.style.top = y + 'px';
  m.classList.add('active');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#contextMenu')) {
    document.getElementById('contextMenu').classList.remove('active');
  }
});

function ctxRotate() {
  if (inventoryApp.ctxTarget) {
    const it = inventoryApp.ctxTarget;
    [it.w, it.h] = [it.h, it.w];
    inventoryApp.draw();
  }
  document.getElementById('contextMenu').classList.remove('active');
}

function ctxDelete() {
  if (inventoryApp.ctxTarget) {
    inventoryApp.items = inventoryApp.items.filter(i => i !== inventoryApp.ctxTarget);
    inventoryApp.updateDisplay();
    inventoryApp.draw();
    character.inventory = inventoryApp.getData();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  } else if (inventoryApp.ctxTargetStorage) {
    const s = inventoryApp.ctxTargetStorage;
    const fallback = inventoryApp.storages.find(st => st !== s);
    inventoryApp.items.forEach(i => {
      if (i.storageId === s.id) {
        if (fallback) {
          i.storageId = fallback.id;
          const step = fallback.showMini ? MINI : CELL;
          i.x = fallback.x + step; i.y = fallback.y + step;
          inventoryApp.snapToGrid(i, fallback);
        } else {
          inventoryApp.items = inventoryApp.items.filter(item => item !== i);
        }
      }
    });
    inventoryApp.storages = inventoryApp.storages.filter(st => st !== s);
    inventoryApp.updateDisplay();
    inventoryApp.draw();
    character.inventory = inventoryApp.getData();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }
  document.getElementById('contextMenu').classList.remove('active');
}

function ctxEdit() {
  if (inventoryApp.ctxTarget) openItemModal(inventoryApp.ctxTarget);
  else if (inventoryApp.ctxTargetStorage) inventoryApp.openStorageSettings(inventoryApp.ctxTargetStorage);
  document.getElementById('contextMenu').classList.remove('active');
}


// ===== TAB BUTTON EVENT DELEGATION =====
// Automatically handles clicks on all tab buttons via data-tab attribute
// Works for dynamically added tabs as well
document.addEventListener('DOMContentLoaded', () => {
  const tabsNav = document.querySelector('.tabs-nav');
  if (tabsNav) {
    tabsNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn && btn.dataset.tab) {
        e.preventDefault();
        switchTab(btn.dataset.tab);
      }
    });
  }
});