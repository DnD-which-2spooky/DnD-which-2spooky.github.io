// ============================================================
// INVENTORY MODULE — Canvas-инвентарь: перетаскивание, хранилища
// ============================================================

const CELL = 30;
const MINI = 15;
const COLORS = ['#4aa4e0','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e91e63','#ff5722'];

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

function getCanvasMousePos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

class InventoryApp {
  constructor() {
    this.canvas = document.getElementById('inventoryCanvas');
    if (!this.canvas) {
      throw new Error('inventoryCanvas не найден в DOM. Убедитесь, что скрипт выполняется после DOMContentLoaded.');
    }
    this.ctx = this.canvas.getContext('2d');
    this.storages = [];
    this.items = [];
    this.dragItem = null;
    this.dragOffset = {x:0,y:0};
    this.hovered = null;
    this.ctxTarget = null;
    this.ctxTargetStorage = null;
    this.usePounds = false;
    this.carryCapacity = 0;
    this.modifiers = [];
    this.nextId = 1;
    this.editingStorage = null;
    this.editingModifiers = [];
    this.setupEvents();
    this.setupResizeHandle();
    this.addDefaultStorage();
    this.draw();
  }


  setupResizeHandle() {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';

    const handle = document.createElement('div');
    handle.className = 'inventory-resize-handle';
    handle.title = 'Растянуть вниз';
    handle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      cursor: ns-resize;
      background: linear-gradient(135deg, transparent 50%, #7da67d 50%);
      border-bottom-right-radius: 4px;
      z-index: 10;
      opacity: 0.6;
      transition: opacity 0.2s;
    `;
    handle.addEventListener('mouseenter', () => handle.style.opacity = '1');
    handle.addEventListener('mouseleave', () => handle.style.opacity = '0.6');
    wrap.appendChild(handle);

    let startY, startHeight;

    const onMove = (e) => {
      const dy = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(2000, startHeight + dy));
      this.canvas.height = newHeight;
      this.draw();
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Сохраняем в персонажа
      if (typeof character !== 'undefined' && character) {
        character.inventory = this.getData();
        const jsonPreview = document.getElementById('jsonPreview');
        if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
      }
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this.canvas.height;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });
  }

  addDefaultStorage() {
    this.storages.push({
      id: this.nextId++, x: 20, y: 20, w: 8, h: 8, name: 'Рюкзак',
      showMini: false, weightScale: 1,
      bgColor: '#2a3a2a', gridColor: '#4a5a4a', miniGridColor: '#5a6a5a'
    });
  }

  pxToCell(px) { return Math.floor(px / MINI); }
  cellToPx(c) { return c * MINI; }

  getStorageAt(mx, my) {
    for (let i = this.storages.length - 1; i >= 0; i--) {
      const s = this.storages[i];
      if (mx >= s.x && mx < s.x + s.w * CELL && my >= s.y && my < s.y + s.h * CELL) return s;
    }
    return null;
  }

  getStorageOrHeaderAt(mx, my) {
    for (let i = this.storages.length - 1; i >= 0; i--) {
      const s = this.storages[i];
      if (mx >= s.x && mx < s.x + s.w * CELL && my >= s.y && my < s.y + s.h * CELL) return s;
      if (mx >= s.x && mx < s.x + s.w * CELL && my >= s.y - 26 && my < s.y) return s;
    }
    return null;
  }

  getSettingsButtonAt(mx, my) {
    for (let i = this.storages.length - 1; i >= 0; i--) {
      const s = this.storages[i];
      const btnW = 20, btnH = 18;
      const btnX = s.x + s.w * CELL - btnW - 2;
      const btnY = s.y - 18;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) return s;
    }
    return null;
  }

  getItemAt(mx, my) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (mx >= it.x && mx < it.x + it.w * MINI && my >= it.y && my < it.y + it.h * MINI) return it;
    }
    return null;
  }

  isInsideStorage(it, storage) {
    return it.x >= storage.x && it.y >= storage.y &&
           it.x + it.w * MINI <= storage.x + storage.w * CELL &&
           it.y + it.h * MINI <= storage.y + storage.h * CELL;
  }

  isCenterInsideStorage(it, storage) {
    const cx = it.x + it.w * MINI / 2;
    const cy = it.y + it.h * MINI / 2;
    return cx >= storage.x && cx < storage.x + storage.w * CELL &&
           cy >= storage.y && cy < storage.y + storage.h * CELL;
  }

  collides(it, ignore = null) {
    for (const other of this.items) {
      if (other === it || other === ignore) continue;
      if (it.x < other.x + other.w * MINI && it.x + it.w * MINI > other.x &&
          it.y < other.y + other.h * MINI && it.y + it.h * MINI > other.y) return true;
    }
    return false;
  }

  snapToGrid(it, storage) {
    const cellSize = storage.showMini ? MINI : CELL;
    const relX = it.x - storage.x;
    const relY = it.y - storage.y;
    const cellX = Math.round(relX / cellSize);
    const cellY = Math.round(relY / cellSize);
    const maxCellX = Math.max(0, Math.floor((storage.w * CELL - it.w * MINI) / cellSize));
    const maxCellY = Math.max(0, Math.floor((storage.h * CELL - it.h * MINI) / cellSize));
    it.x = storage.x + Math.max(0, Math.min(cellX, maxCellX)) * cellSize;
    it.y = storage.y + Math.max(0, Math.min(cellY, maxCellY)) * cellSize;
    it.storageId = storage.id;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#1a221a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#2a3a2a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.canvas.width; x += MINI) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke(); }
    for (let y = 0; y < this.canvas.height; y += MINI) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke(); }

    for (const s of this.storages) {
      // Фон хранилища
      ctx.fillStyle = s.bgColor || '#2a3a2a';
      ctx.fillRect(s.x, s.y, s.w * CELL, s.h * CELL);

      // Основная рамка
      ctx.strokeStyle = s.gridColor || '#4a5a4a';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w * CELL, s.h * CELL);

      // Основная сетка
      ctx.strokeStyle = s.gridColor || '#4a5a4a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= s.w; i++) { ctx.beginPath(); ctx.moveTo(s.x + i * CELL, s.y); ctx.lineTo(s.x + i * CELL, s.y + s.h * CELL); ctx.stroke(); }
      for (let j = 0; j <= s.h; j++) { ctx.beginPath(); ctx.moveTo(s.x, s.y + j * CELL); ctx.lineTo(s.x + s.w * CELL, s.y + j * CELL); ctx.stroke(); }

      // Мини-сетка
      if (s.showMini) {
        ctx.strokeStyle = s.miniGridColor || '#5a6a5a';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= s.w * 2; i++) { ctx.beginPath(); ctx.moveTo(s.x + i * MINI, s.y); ctx.lineTo(s.x + i * MINI, s.y + s.h * CELL); ctx.stroke(); }
        for (let j = 0; j <= s.h * 2; j++) { ctx.beginPath(); ctx.moveTo(s.x, s.y + j * MINI); ctx.lineTo(s.x + s.w * CELL, s.y + j * MINI); ctx.stroke(); }
      }

      // Заголовок хранилища
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 13px Segoe UI';
      const textW = ctx.measureText(s.name).width;
      const padX = 6, padY = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(s.x - 2, s.y - 18, textW + padX * 2 + 4, 18, 6);
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#f0e6d2';
      ctx.fillText(s.name, s.x + padX, s.y - 5);
      ctx.shadowColor = 'transparent';

      // Кнопка настроек
      const btnW = 20, btnH = 18;
      const btnX = s.x + s.w * CELL - btnW - 2;
      const btnY = s.y - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#f0e6d2';
      ctx.font = 'bold 11px Segoe UI';
      ctx.fillText('?', btnX + 6, btnY + 13);
      ctx.shadowColor = 'transparent';
    }

    for (const it of this.items) {
      const col = COLORS[it.id % COLORS.length];
      // Фон предмета
      ctx.fillStyle = it.bgColor || (col + '40');
      ctx.fillRect(it.x, it.y, it.w * MINI, it.h * MINI);
      // Рамка предмета
      ctx.strokeStyle = it.borderColor || col;
      ctx.lineWidth = 2;
      ctx.strokeRect(it.x, it.y, it.w * MINI, it.h * MINI);
      // Текст предмета
      ctx.fillStyle = it.textColor || '#fff';
      ctx.font = `bold ${it.fontSize || 11}px Segoe UI`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = it.name.length > 10 ? it.name.slice(0, 9) + '…' : it.name;
      ctx.fillText(text, it.x + it.w * MINI / 2, it.y + it.h * MINI / 2);
      // Hover-эффект
      if (it === this.hovered || it === this.dragItem) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(it.x + 2, it.y + 2, it.w * MINI - 4, it.h * MINI - 4);
        ctx.setLineDash([]);
      }
    }
  }

  endDrag(e) {
    if (this.dragItem) {
      const pos = getCanvasMousePos(this.canvas, e);
      const mx = pos.x, my = pos.y;
      const trash = document.getElementById('trashZone').getBoundingClientRect();
      if (e.clientX >= trash.left && e.clientX <= trash.right && e.clientY >= trash.top && e.clientY <= trash.bottom) {
        this.items = this.items.filter(i => i !== this.dragItem);
        this.dragItem = null; this.updateDisplay(); this.draw();
        character.inventory = inventoryApp.getData();
        const jsonPreview = document.getElementById('jsonPreview');
        if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
        return;
      }
      const storage = this.getStorageAt(mx, my);
      if (storage) {
        const maxX = storage.x + storage.w * CELL - this.dragItem.w * MINI;
        const maxY = storage.y + storage.h * CELL - this.dragItem.h * MINI;
        this.dragItem.x = Math.max(storage.x, Math.min(this.dragItem.x, maxX));
        this.dragItem.y = Math.max(storage.y, Math.min(this.dragItem.y, maxY));
        this.snapToGrid(this.dragItem, storage);
        this.dragItem.storageId = storage.id;
      } else {
        this.dragItem.storageId = null;
        const iw = this.dragItem.w * MINI;
        const ih = this.dragItem.h * MINI;
        this.dragItem.x = Math.round(this.dragItem.x / MINI) * MINI;
        this.dragItem.y = Math.round(this.dragItem.y / MINI) * MINI;
        this.dragItem.x = Math.max(0, Math.min(this.dragItem.x, this.canvas.width - iw));
        this.dragItem.y = Math.max(0, Math.min(this.dragItem.y, this.canvas.height - ih));
      }
      this.dragItem = null; this.dragItemStart = null; this.updateDisplay(); this.draw();
      character.inventory = inventoryApp.getData();
      const jsonPreview = document.getElementById('jsonPreview');
      if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
      return;
    }
    if (this.dragStorage) {
      const s = this.dragStorage;
      s.x = Math.max(0, Math.min(s.x, this.canvas.width - s.w * CELL));
      s.y = Math.max(0, Math.min(s.y, this.canvas.height - s.h * CELL));
      for (const it of this.items) {
        if (it.storageId === s.id) {
          if (!this.isCenterInsideStorage(it, s)) it.storageId = null;
        } else if (it.storageId !== s.id && this.isCenterInsideStorage(it, s)) {
          it.storageId = s.id;
        }
      }
      this.dragStorage = null; this.dragStorageItems = null; this.draw();
      character.inventory = inventoryApp.getData();
      const jsonPreview = document.getElementById('jsonPreview');
      if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
      return;
    }
  }

  setupEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', (e) => {
      const pos = getCanvasMousePos(c, e);
      const mx = pos.x, my = pos.y;
      const settingsStorage = this.getSettingsButtonAt(mx, my);
      if (settingsStorage) {
        this.openStorageSettings(settingsStorage);
        return;
      }
      const it = this.getItemAt(mx, my);
      if (it) {
        this.dragItem = it; this.dragOffset = {x: mx - it.x, y: my - it.y};
        this.dragItemStart = {x: it.x, y: it.y, storageId: it.storageId};
        this.items.splice(this.items.indexOf(it), 1); this.items.push(it);
        this.dragStorage = null;
        return;
      }
      const s = this.getStorageOrHeaderAt(mx, my);
      if (s) {
        this.dragStorage = s;
        this.dragStorageStart = {x: s.x, y: s.y};
        this.dragStorageItems = this.items.filter(i => i.storageId === s.id).map(i => ({item: i, ox: i.x - s.x, oy: i.y - s.y}));
        this.dragOffset = {x: mx - s.x, y: my - s.y};
        this.storages.splice(this.storages.indexOf(s), 1); this.storages.push(s);
      }
    });
    c.addEventListener('mousemove', (e) => {
      const pos = getCanvasMousePos(c, e);
      const mx = pos.x, my = pos.y;
      this.hovered = this.getItemAt(mx, my);
      if (this.dragItem) {
        this.dragItem.x = mx - this.dragOffset.x;
        this.dragItem.y = my - this.dragOffset.y;
      } else if (this.dragStorage) {
        const ds = this.dragStorage;
        const oldX = ds.x, oldY = ds.y;
        ds.x = mx - this.dragOffset.x;
        ds.y = my - this.dragOffset.y;
        const dx = ds.x - oldX, dy = ds.y - oldY;
        if (this.dragStorageItems) {
          for (const {item, ox, oy} of this.dragStorageItems) {
            item.x = ds.x + ox;
            item.y = ds.y + oy;
          }
        }
      }
      this.draw();
    });
    c.addEventListener('mouseup', (e) => this.endDrag(e));
    window.addEventListener('mouseup', (e) => {
      if (this.dragItem || this.dragStorage) this.endDrag(e);
    });
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pos = getCanvasMousePos(c, e);
      const mx = pos.x, my = pos.y;
      const it = this.getItemAt(mx, my);
      if (it) {
        this.ctxTarget = it; this.ctxTargetStorage = null;
        const ctxRotateRow = document.getElementById('ctxRotateRow');
        if (ctxRotateRow) ctxRotateRow.style.display = 'block';
        showContextMenu(e.clientX, e.clientY);
        return;
      }
      const s = this.getStorageAt(mx, my);
      if (s) {
        this.ctxTargetStorage = s; this.ctxTarget = null;
        const ctxRotateRow = document.getElementById('ctxRotateRow');
        if (ctxRotateRow) ctxRotateRow.style.display = 'none';
        showContextMenu(e.clientX, e.clientY);
      }
    });
    c.addEventListener('dblclick', (e) => {
      const pos = getCanvasMousePos(c, e);
      const mx = pos.x, my = pos.y;
      const it = this.getItemAt(mx, my);
      if (it) openItemModal(it);
      else {
        const s = this.getStorageAt(mx, my);
        if (s) this.openStorageSettings(s);
      }
    });
  }

  addStorage() {
    const s = {
      id: this.nextId++, x: 50 + this.storages.length * 30, y: 50 + this.storages.length * 20,
      w: 6, h: 6, name: 'Хранилище ' + this.storages.length,
      showMini: false, weightScale: 1,
      bgColor: '#2a3a2a', gridColor: '#4a5a4a', miniGridColor: '#5a6a5a'
    };
    this.storages.push(s); this.draw();
    character.inventory = inventoryApp.getData();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }

  findFreePosition(storage, w, h) {
    const cellSize = storage.showMini ? MINI : CELL;
    const cols = Math.floor(storage.w * CELL / cellSize);
    const rows = Math.floor(storage.h * CELL / cellSize);
    const itemWpx = w * MINI;
    const itemHpx = h * MINI;
    const maxCol = Math.floor((storage.w * CELL - itemWpx) / cellSize);
    const maxRow = Math.floor((storage.h * CELL - itemHpx) / cellSize);
    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        const x = storage.x + col * cellSize;
        const y = storage.y + row * cellSize;
        if (x + itemWpx > storage.x + storage.w * CELL || y + itemHpx > storage.y + storage.h * CELL) continue;
        const candidate = {x, y, w, h};
        let collision = false;
        for (const other of this.items) {
          if (other.storageId !== storage.id) continue;
          if (candidate.x < other.x + other.w * MINI && candidate.x + itemWpx > other.x &&
              candidate.y < other.y + other.h * MINI && candidate.y + itemHpx > other.y) {
            collision = true; break;
          }
        }
        if (!collision) return {x, y};
      }
    }
    return null;
  }

  addItem() {
    const storage = this.storages[0];
    if (!storage) { alert('Нет хранилищ для добавления предмета.'); return; }
    const it = {
      id: this.nextId++, x: 100, y: 100, w: 4, h: 2,
      name: 'Предмет', weight: 1, cost: 0, description: '',
      storageId: storage.id,
      textColor: '#ffffff', fontSize: 11
    };
    const pos = this.findFreePosition(storage, it.w, it.h);
    if (!pos) { alert('В хранилище нет свободного места.'); return; }
    it.x = pos.x; it.y = pos.y;
    this.snapToGrid(it, storage);
    this.items.push(it); this.draw(); this.updateDisplay();
    character.inventory = inventoryApp.getData();
    const jsonPreview = document.getElementById('jsonPreview');
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
  }

  openStorageSettings(s) {
    this.editingStorage = s;
    document.getElementById('storName').value = s.name;
    document.getElementById('storW').value = s.w;
    document.getElementById('storH').value = s.h;
    document.getElementById('storScale').value = s.weightScale;
    document.getElementById('storMini').checked = s.showMini;
    document.getElementById('storBgColor').value = s.bgColor || '#2a3a2a';
    document.getElementById('storGridColor').value = s.gridColor || '#4a5a4a';
    document.getElementById('storMiniGridColor').value = s.miniGridColor || '#5a6a5a';
    document.getElementById('storageModal').classList.add('active');
  }

  toggleUnits() {
    this.usePounds = document.getElementById('unitToggle').checked;
    this.updateDisplay();
  }

  getTotalWeight() {
    let total = 0;
    for (const it of this.items) {
      if (it.storageId == null) continue;
      const storage = this.storages.find(s => s.id === it.storageId);
      if (!storage) continue;
      if (!this.isInsideStorage(it, storage)) continue;
      let w = it.weight || 0;
      w *= (storage.weightScale || 1);
      total += w;
    }
    return total;
  }

  getEffectiveCapacity() {
    const pct = this.modifiers.reduce((sum, m) => sum + m.percentage, 0);
    return this.carryCapacity * (1 + pct / 100);
  }

  updateDisplay() {
    const total = this.getTotalWeight();
    const cap = this.getEffectiveCapacity();
    const unit = this.usePounds ? 'фнт' : 'кг';
    const mult = this.usePounds ? 2.2 : 1;
    const pct = this.modifiers.reduce((sum, m) => sum + m.percentage, 0);
    let modText = pct !== 0 ? ` (${pct > 0 ? '+' : ''}${pct}%)` : '';
    const el = document.getElementById('carryDisplay');
    if (!el) return;
    el.textContent = `Грузоподъёмность: ${(total * mult).toFixed(1)}/${(cap * mult).toFixed(1)} ${unit}${modText}`;
    if (cap > 0 && total / cap >= 0.9) el.style.color = '#e74c3c';
    else if (cap > 0 && total / cap >= 0.6) el.style.color = '#f39c12';
    else el.style.color = '#7da67d';
  }

  openModifiers() {
    this.editingModifiers = JSON.parse(JSON.stringify(this.modifiers));
    renderModifierList();
    document.getElementById('modifierModal').classList.add('active');
  }

  loadData(data) {
    this.storages = (data.storages || []).map(s => ({
      ...s,
      id: s.id || this.nextId++,
      bgColor: s.bgColor || '#2a3a2a',
      gridColor: s.gridColor || '#4a5a4a',
      miniGridColor: s.miniGridColor || '#5a6a5a'
    }));
    this.items = (data.items || []).map(i => ({
      ...i,
      id: i.id || this.nextId++,
      storageId: i.storageId ?? null,
      textColor: i.textColor || '#ffffff',
      fontSize: i.fontSize || 11
    }));
    this.modifiers = data.modifiers || [];
    this.nextId = Math.max(1, ...this.storages.map(s => s.id || 0), ...this.items.map(i => i.id || 0)) + 1;
    this.draw(); this.updateDisplay();
  }

  getData() {
    return {
      storages: this.storages.map(s => ({...s})),
      items: this.items.map(i => ({...i, storageId: i.storageId ?? null})),
      modifiers: this.modifiers.map(m => ({...m}))
    };
  }
}

let inventoryApp = null;
let editingItem = null;

function initInventoryApp() {
  if (inventoryApp) return inventoryApp;
  if (!document.getElementById('inventoryCanvas')) {
    console.warn('inventoryCanvas не найден в DOM');
    return null;
  }
  inventoryApp = new InventoryApp();
  return inventoryApp;
}

function openItemModal(it) {
  editingItem = it;
  document.getElementById('itemName').value = it.name;
  document.getElementById('itemW').value = it.w;
  document.getElementById('itemH').value = it.h;
  document.getElementById('itemWeight').value = it.weight;
  document.getElementById('itemCost').value = it.cost;
  document.getElementById('itemDesc').value = it.description || '';
  document.getElementById('itemBgColor').value = it.bgColor || '';
  document.getElementById('itemBorderColor').value = it.borderColor || '';
  document.getElementById('itemTextColor').value = it.textColor || '#ffffff';
  document.getElementById('itemFontSize').value = it.fontSize || 11;
  document.getElementById('itemModal').classList.add('active');
}

function closeItemModal() {
  document.getElementById('itemModal').classList.remove('active');
  editingItem = null;
}

function saveItemModal() {
  if (!editingItem) return;
  editingItem.name = document.getElementById('itemName').value;
  editingItem.w = parseInt(document.getElementById('itemW').value) || 4;
  editingItem.h = parseInt(document.getElementById('itemH').value) || 2;
  editingItem.weight = parseFloat(document.getElementById('itemWeight').value) || 0;
  editingItem.cost = parseFloat(document.getElementById('itemCost').value) || 0;
  editingItem.description = document.getElementById('itemDesc').value;
  const bg = document.getElementById('itemBgColor').value;
  const border = document.getElementById('itemBorderColor').value;
  editingItem.bgColor = bg || null;
  editingItem.borderColor = border || null;
  editingItem.textColor = document.getElementById('itemTextColor').value || null;
  editingItem.fontSize = parseInt(document.getElementById('itemFontSize').value) || 11;
  closeItemModal();
  if (inventoryApp) { inventoryApp.draw(); inventoryApp.updateDisplay(); }
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function closeStorageModal() {
  document.getElementById('storageModal').classList.remove('active');
  inventoryApp.editingStorage = null;
}

function saveStorageModal() {
  const s = inventoryApp.editingStorage;
  if (!s) return;
  s.name = document.getElementById('storName').value;
  s.w = parseInt(document.getElementById('storW').value) || 6;
  s.h = parseInt(document.getElementById('storH').value) || 6;
  s.weightScale = parseFloat(document.getElementById('storScale').value) || 1;
  s.showMini = document.getElementById('storMini').checked;
  s.bgColor = document.getElementById('storBgColor').value;
  s.gridColor = document.getElementById('storGridColor').value;
  s.miniGridColor = document.getElementById('storMiniGridColor').value;
  closeStorageModal();
  if (inventoryApp) { inventoryApp.draw(); inventoryApp.updateDisplay(); }
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function renderModifierList() {
  const list = document.getElementById('modifierList');
  if (!list) return;
  list.innerHTML = '';
  inventoryApp.editingModifiers.forEach((m, i) => {
    const row = document.createElement('div'); row.className = 'modifier-row';
    row.innerHTML = `<input type="text" placeholder="Описание" value="${escapeHtml(m.description)}" onchange="updateModifier(${i}, 'desc', this.value)">
                     <input type="number" value="${m.percentage}" onchange="updateModifier(${i}, 'pct', this.value)">`;
    list.appendChild(row);
  });
  const total = inventoryApp.editingModifiers.reduce((s, m) => s + m.percentage, 0);
  const totalEl = document.getElementById('modifierTotal');
  if (totalEl) totalEl.textContent = `Общий: ${total >= 0 ? '+' : ''}${total}%`;
}

function updateModifier(i, field, val) {
  if (field === 'desc') inventoryApp.editingModifiers[i].description = val;
  else inventoryApp.editingModifiers[i].percentage = parseInt(val) || 0;
  renderModifierList();
}

function addModifierRow() {
  inventoryApp.editingModifiers.push({percentage: 10, description: ''});
  renderModifierList();
}

function ctxRotate() {
  if (!inventoryApp.ctxTarget) return;
  const it = inventoryApp.ctxTarget;
  const tmp = it.w; it.w = it.h; it.h = tmp;
  inventoryApp.draw(); inventoryApp.updateDisplay();
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function ctxDelete() {
  if (inventoryApp.ctxTarget) {
    inventoryApp.items = inventoryApp.items.filter(i => i !== inventoryApp.ctxTarget);
    inventoryApp.ctxTarget = null;
  } else if (inventoryApp.ctxTargetStorage) {
    inventoryApp.items = inventoryApp.items.filter(i => i.storageId !== inventoryApp.ctxTargetStorage.id);
    inventoryApp.storages = inventoryApp.storages.filter(s => s !== inventoryApp.ctxTargetStorage);
    inventoryApp.ctxTargetStorage = null;
  }
  hideContextMenu();
  inventoryApp.draw(); inventoryApp.updateDisplay();
  character.inventory = inventoryApp.getData();
  const jsonPreview = document.getElementById('jsonPreview');
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(character, null, 2);
}

function ctxEdit() {
  if (inventoryApp.ctxTarget) openItemModal(inventoryApp.ctxTarget);
  else if (inventoryApp.ctxTargetStorage) inventoryApp.openStorageSettings(inventoryApp.ctxTargetStorage);
  hideContextMenu();
}

function showContextMenu(x, y) {
  const menu = document.getElementById('contextMenu');
  if (!menu) return;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add('active');
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.classList.remove('active');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('contextMenu');
  if (menu && !menu.contains(e.target)) hideContextMenu();
});