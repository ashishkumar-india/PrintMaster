/* inventory.js */
'use strict';

function renderInventory() {
    const inventory = DB.get('inventory');
    const q = document.getElementById('searchInv').value.toLowerCase();
    const cat = document.getElementById('filterCat').value;
    const stock = document.getElementById('filterStock').value;

    const filtered = inventory.filter(i =>
        (!q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)) &&
        (!cat || i.category === cat) &&
        (!stock || (stock === 'low' ? i.qty <= i.reorderLevel : i.qty > i.reorderLevel))
    ).sort((a, b) => a.name.localeCompare(b.name));

    // KPI
    const lowCount = inventory.filter(i => i.qty <= i.reorderLevel).length;
    const totalValue = inventory.reduce((a, i) => a + i.qty * i.costPerUnit, 0);
    const kpi = document.getElementById('invKpi');
    if (kpi) {
        kpi.innerHTML = `
      <div class="kpi-card" style="--kpi-color:#3b82f6"><div class="kpi-icon">📦</div><div class="kpi-value">${inventory.length}</div><div class="kpi-label">Total Items</div></div>
      <div class="kpi-card" style="--kpi-color:#ef4444"><div class="kpi-icon">⚠️</div><div class="kpi-value">${lowCount}</div><div class="kpi-label">Low Stock Alerts</div></div>
      <div class="kpi-card" style="--kpi-color:#22c55e"><div class="kpi-icon">💰</div><div class="kpi-value">${currency(totalValue)}</div><div class="kpi-label">Total Stock Value</div></div>
      <div class="kpi-card" style="--kpi-color:#f59e0b"><div class="kpi-icon">📂</div><div class="kpi-value">${[...new Set(inventory.map(i => i.category))].length}</div><div class="kpi-label">Categories</div></div>
    `;
    }

    // Update nav badge
    const badge = document.getElementById('invBadge');
    if (badge) { badge.textContent = lowCount; badge.style.display = lowCount ? '' : 'none'; }

    const tbl = document.getElementById('inventoryTable');
    if (!tbl) return;

    if (!filtered.length) {
        tbl.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📦</div><p>No items found</p><button class="btn btn-primary" onclick="openModal('addItemModal')">Add First Item</button></div></td></tr>`;
        return;
    }

    tbl.innerHTML = filtered.map(i => {
        const isLow = i.qty <= i.reorderLevel;
        const pct = Math.min(100, Math.round((i.qty / (i.reorderLevel * 2 || 1)) * 100));
        return `
      <tr>
        <td><strong style="color:var(--accent-light)">#${i.id}</strong></td>
        <td>
          <strong>${i.name}</strong>
          <div class="progress-bar" style="width:80px;margin-top:4px"><div class="progress-fill" style="width:${pct}%;background:${isLow ? 'var(--danger)' : ''}"></div></div>
        </td>
        <td><span class="badge badge-ok" style="background:rgba(59,130,246,0.1);color:var(--accent-light)">${i.category}</span></td>
        <td><strong style="color:${isLow ? 'var(--danger)' : 'var(--text-primary)'}">${i.qty}</strong></td>
        <td style="color:var(--text-secondary)">${i.unit}</td>
        <td style="color:var(--text-secondary)">${i.reorderLevel} ${i.unit}</td>
        <td>${currency(i.costPerUnit)}/${i.unit}</td>
        <td><strong>${currency(i.qty * i.costPerUnit)}</strong></td>
        <td>${isLow ? `<span class="badge badge-low">Low Stock</span>` : `<span class="badge badge-ok">In Stock</span>`}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm btn-icon" title="Adjust Stock" onclick="openAdjust(${i.id})">⚖️</button>
            <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="editItem(${i.id})">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteItem(${i.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
}

function openAdjust(id) {
    const i = DB.get('inventory').find(x => x.id === id);
    if (!i) return;
    document.getElementById('adjustItemId').value = id;
    document.getElementById('adjustItemName').textContent = i.name + ' — Current: ' + i.qty + ' ' + i.unit;
    document.getElementById('adjustQty').value = '';
    openModal('adjustStockModal');
}

function applyAdjustment() {
    const id = parseInt(document.getElementById('adjustItemId').value);
    const qty = parseFloat(document.getElementById('adjustQty').value);
    const type = document.getElementById('adjustType').value;
    if (!qty || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }

    const inventory = DB.get('inventory');
    const idx = inventory.findIndex(i => i.id === id);
    if (type === 'add') {
        inventory[idx].qty += qty;
        toast(`Added ${qty} ${inventory[idx].unit} to ${inventory[idx].name}`, 'success');
    } else {
        if (inventory[idx].qty < qty) { toast('Cannot deduct more than available stock', 'error'); return; }
        inventory[idx].qty -= qty;
        toast(`Deducted ${qty} ${inventory[idx].unit} from ${inventory[idx].name}`, 'warning');
    }
    DB.set('inventory', inventory);
    closeModal('adjustStockModal');
    renderInventory();
}

function saveItem() {
    const id = document.getElementById('editItemId').value;
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value.trim();
    const qty = parseFloat(document.getElementById('itemQty').value);
    const reorder = parseFloat(document.getElementById('itemReorder').value);
    if (!name || !unit || isNaN(qty) || isNaN(reorder)) { toast('Please fill all required fields', 'error'); return; }

    const inventory = DB.get('inventory');
    const now = new Date().toISOString().slice(0, 10);
    const item = {
        id: id ? parseInt(id) : DB.nextId('inventory'),
        name,
        category: document.getElementById('itemCategory').value,
        qty,
        unit,
        reorderLevel: reorder,
        costPerUnit: parseFloat(document.getElementById('itemCost').value) || 0,
        createdAt: id ? (inventory.find(i => i.id == id)?.createdAt || now) : now,
    };

    if (id) {
        inventory[inventory.findIndex(i => i.id === parseInt(id))] = item;
        toast('Item updated!');
    } else {
        inventory.push(item);
        toast('Item added!', 'success');
    }
    DB.set('inventory', inventory);
    closeModal('addItemModal');
    renderInventory();
}

function editItem(id) {
    const i = DB.get('inventory').find(x => x.id === id);
    if (!i) return;
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('editItemId').value = id;
    document.getElementById('itemName').value = i.name;
    document.getElementById('itemCategory').value = i.category;
    document.getElementById('itemQty').value = i.qty;
    document.getElementById('itemUnit').value = i.unit;
    document.getElementById('itemReorder').value = i.reorderLevel;
    document.getElementById('itemCost').value = i.costPerUnit;
    openModal('addItemModal');
}

function deleteItem(id) {
    if (!confirm('Delete this inventory item?')) return;
    DB.set('inventory', DB.get('inventory').filter(i => i.id !== id));
    toast('Item deleted', 'warning');
    renderInventory();
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    document.querySelector('[onclick="openModal(\'addItemModal\')"]')?.addEventListener('click', () => {
        document.getElementById('itemModalTitle').textContent = 'Add Inventory Item';
        document.getElementById('editItemId').value = '';
        ['itemName', 'itemQty', 'itemUnit', 'itemReorder', 'itemCost'].forEach(i => document.getElementById(i).value = '');
    });
    renderInventory();
  });
});
