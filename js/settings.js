/* settings.js */
'use strict';

function loadSettings() {
  const s = DB.getOne('settings');
  document.getElementById('settShopName').value = s.shopName || '';
  document.getElementById('settOwnerName').value = s.ownerName || '';
  document.getElementById('settPhone').value = s.phone || '';
  document.getElementById('settEmail').value = s.email || '';
  document.getElementById('settAddress').value = s.address || '';
  document.getElementById('settGst').value = s.gst || '';
  document.getElementById('settTaxRate').value = s.taxRate ?? 18;
  document.getElementById('settCurrency').value = s.currency || '₹';
  document.getElementById('settTerms').value = s.terms || '';
  updatePreview();
}

function saveSettings() {
  const s = {
    shopName: document.getElementById('settShopName').value.trim(),
    ownerName: document.getElementById('settOwnerName').value.trim(),
    phone: document.getElementById('settPhone').value.trim(),
    email: document.getElementById('settEmail').value.trim(),
    address: document.getElementById('settAddress').value.trim(),
    gst: document.getElementById('settGst').value.trim(),
    taxRate: parseFloat(document.getElementById('settTaxRate').value) || 18,
    currency: document.getElementById('settCurrency').value.trim() || '₹',
    terms: document.getElementById('settTerms').value.trim(),
  };
  DB.set('settings', s);
  toast('Settings saved successfully! ✅', 'success');
  updatePreview();
}

function updatePreview() {
  const s = {
    shopName: document.getElementById('settShopName').value || 'PrintMaster Press',
    ownerName: document.getElementById('settOwnerName').value || '',
    phone: document.getElementById('settPhone').value || '',
    email: document.getElementById('settEmail').value || '',
    address: document.getElementById('settAddress').value || '',
    gst: document.getElementById('settGst').value || '',
    terms: document.getElementById('settTerms').value || '',
  };
  const preview = document.getElementById('settInvoicePreview');
  if (!preview) return;
  preview.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <h2 style="color:#1e40af;margin-bottom:4px;font-size:20px">${s.shopName}</h2>
        ${s.ownerName ? `<div style="font-size:12px;color:#64748b;font-weight:600">${s.ownerName}</div>` : ''}
        <div style="font-size:12px;color:#64748b;margin-top:2px">${s.address}</div>
        <div style="font-size:12px;color:#64748b">${s.phone}${s.email ? ' · ' + s.email : ''}</div>
        ${s.gst ? `<div style="font-size:11px;color:#64748b;margin-top:2px">GSTIN: ${s.gst}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:800;color:#1e40af">TAX INVOICE</div>
        <div style="font-size:14px;font-weight:700;color:#334155">INV-001 (Preview)</div>
        <div style="font-size:12px;color:#64748b">${new Date().toLocaleDateString('en-IN')}</div>
      </div>
    </div>
    <div style="border-top:2px solid #1e40af;margin:12px 0"></div>
    <div style="font-size:12px;color:#64748b"><strong>Bill To:</strong> [Customer Name]</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left;font-size:12px">#</th><th style="padding:8px;text-align:left;font-size:12px">Description</th><th style="padding:8px;text-align:left;font-size:12px">Amount</th></tr></thead>
      <tbody><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">1</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">Sample Item</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">₹1,000</td></tr></tbody>
      <tfoot><tr style="background:#1e40af;color:#fff"><td colspan="2" style="padding:8px;font-weight:700">Grand Total</td><td style="padding:8px;font-weight:700">₹1,180</td></tr></tfoot>
    </table>
    ${s.terms ? `<div style="margin-top:12px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px"><strong>Terms:</strong> ${s.terms}</div>` : ''}
  `;
}

function confirmReset() {
  if (!confirm('⚠️ This will DELETE ALL data (orders, customers, invoices, inventory) and cannot be undone!\n\nAre you absolutely sure?')) return;
  const keys = ['orders', 'customers', 'inventory', 'invoices', 'settings'];
  keys.forEach(k => localStorage.removeItem('pp_' + k));
  localStorage.removeItem('pp_seeded');
  toast('All data has been reset. Reloading…', 'warning', 2000);
  setTimeout(() => location.href = 'index.html', 2000);
}

function exportAllData() {
  const data = {
    orders: DB.get('orders'),
    customers: DB.get('customers'),
    inventory: DB.get('inventory'),
    invoices: DB.get('invoices'),
    settings: DB.getOne('settings'),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'printmaster_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  toast('Data exported as JSON backup!', 'success');
}

// --- Services Management ---
function renderServices() {
  const tbody = document.getElementById('servicesTableBody');
  if (!tbody) return;
  const services = DB.get('services') || [];
  if (services.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">No services added yet. Click "+ Add Service" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = services.map(s => `
      <tr>
        <td style="font-size:24px">${s.icon || '💼'}</td>
        <td>
          <div style="font-weight:600">${s.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.description || ''}</div>
        </td>
        <td style="font-size:13px">${s.price || '—'}</td>
        <td><div style="width:24px;height:24px;border-radius:4px;background:${s.color || '#3b82f6'};border:1px solid var(--border)"></div></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="editService(${s.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteService(${s.id})">🗑️</button>
        </td>
      </tr>
    `).join('');
}

function addService() {
  document.getElementById('serviceId').value = '';
  document.getElementById('srvName').value = '';
  document.getElementById('srvIcon').value = '💼';
  document.getElementById('srvPrice').value = '';
  document.getElementById('srvDesc').value = '';
  document.getElementById('srvColor').value = '#3b82f6';
  document.getElementById('serviceModalTitle').textContent = 'Add Service';
  openModal('serviceModal');
}

function editService(id) {
  const s = DB.get('services').find(x => x.id === id);
  if (!s) return;
  document.getElementById('serviceId').value = s.id;
  document.getElementById('srvName').value = s.name || '';
  document.getElementById('srvIcon').value = s.icon || '💼';
  document.getElementById('srvPrice').value = s.price || '';
  document.getElementById('srvDesc').value = s.description || '';
  document.getElementById('srvColor').value = s.color || '#3b82f6';
  document.getElementById('serviceModalTitle').textContent = 'Edit Service';
  openModal('serviceModal');
}

function saveServiceBtn() {
  const name = document.getElementById('srvName').value.trim();
  if (!name) { toast('Service Name is required', 'error'); return; }

  const id = document.getElementById('serviceId').value;
  const services = DB.get('services') || [];

  const srv = {
    name,
    icon: document.getElementById('srvIcon').value.trim() || '💼',
    price: document.getElementById('srvPrice').value.trim(),
    description: document.getElementById('srvDesc').value.trim(),
    color: document.getElementById('srvColor').value || '#3b82f6'
  };

  if (id) {
    srv.id = parseInt(id);
    const idx = services.findIndex(x => x.id === srv.id);
    if (idx > -1) services[idx] = { ...services[idx], ...srv };
  } else {
    srv.id = DB.nextId('services');
    srv.createdAt = new Date().toISOString();
    services.push(srv);
  }

  DB.set('services', services);
  closeModal('serviceModal');
  toast('Service saved successfully!', 'success');
  renderServices();
}

function deleteService(id) {
  if (!confirm('Are you sure you want to delete this service?')) return;
  const services = DB.get('services').filter(s => s.id !== id);
  DB.set('services', services);
  toast('Service deleted', 'warning');
  renderServices();
}

// --- Portfolio Management ---
function renderPortfolio() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;
  const portfolio = DB.get('portfolio') || [];
  if (portfolio.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">No portfolio items added. Click "+ Add Item".</td></tr>`;
    return;
  }

  tbody.innerHTML = portfolio.map(p => `
      <tr>
        <td>
          <div style="width:60px;height:40px;border-radius:6px;background:linear-gradient(135deg, ${p.color1 || '#ea580c'}, ${p.color2 || '#9a3412'});display:flex;align-items:center;justify-content:center;font-size:18px">${p.icon || '🖼️'}</div>
        </td>
        <td>
          <div style="font-weight:600">${p.title}</div>
        </td>
        <td style="font-size:12px;color:var(--text-secondary)">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color1 || '#ea580c'};margin-right:4px;vertical-align:middle"></span>
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color2 || '#9a3412'};vertical-align:middle"></span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="editPortfolio(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deletePortfolio(${p.id})">🗑️</button>
        </td>
      </tr>
    `).join('');
}

function addPortfolio() {
  document.getElementById('portId').value = '';
  document.getElementById('portTitle').value = '';
  document.getElementById('portIcon').value = '🖼️';
  document.getElementById('portColor1').value = '#ea580c';
  document.getElementById('portColor2').value = '#9a3412';
  document.getElementById('portfolioModalTitle').textContent = 'Add Portfolio Item';
  openModal('portfolioModal');
}

function editPortfolio(id) {
  const p = DB.get('portfolio').find(x => x.id === id);
  if (!p) return;
  document.getElementById('portId').value = p.id;
  document.getElementById('portTitle').value = p.title || '';
  document.getElementById('portIcon').value = p.icon || '🖼️';
  document.getElementById('portColor1').value = p.color1 || '#ea580c';
  document.getElementById('portColor2').value = p.color2 || '#9a3412';
  document.getElementById('portfolioModalTitle').textContent = 'Edit Portfolio Item';
  openModal('portfolioModal');
}

function savePortfolioBtn() {
  const title = document.getElementById('portTitle').value.trim();
  if (!title) { toast('Project Title is required', 'error'); return; }

  const id = document.getElementById('portId').value;
  const portfolio = DB.get('portfolio') || [];

  const port = {
    title,
    icon: document.getElementById('portIcon').value.trim() || '🖼️',
    color1: document.getElementById('portColor1').value || '#ea580c',
    color2: document.getElementById('portColor2').value || '#9a3412'
  };

  if (id) {
    port.id = parseInt(id);
    const idx = portfolio.findIndex(x => x.id === port.id);
    if (idx > -1) portfolio[idx] = { ...portfolio[idx], ...port };
  } else {
    port.id = DB.nextId('portfolio');
    port.createdAt = new Date().toISOString();
    portfolio.push(port);
  }

  DB.set('portfolio', portfolio);
  closeModal('portfolioModal');
  toast('Portfolio item saved successfully!', 'success');
  renderPortfolio();
}

function deletePortfolio(id) {
  if (!confirm('Are you sure you want to delete this portfolio item?')) return;
  const portfolio = DB.get('portfolio').filter(p => p.id !== id);
  DB.set('portfolio', portfolio);
  toast('Portfolio item deleted', 'warning');
  renderPortfolio();
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    loadSettings();
    renderServices();
    renderPortfolio();
    // Live preview as user types
    ['settShopName', 'settOwnerName', 'settPhone', 'settEmail', 'settAddress', 'settGst', 'settTerms'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updatePreview);
    });
  });
});
