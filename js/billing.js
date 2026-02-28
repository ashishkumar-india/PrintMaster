/* billing.js */
'use strict';

let lineItemCount = 0;
let currentPreviewInvoiceId = null;

function addLineItem(desc = '', qty = 1, rate = 0, tax = null) {
    const s = DB.getOne('settings');
    const defaultTax = tax !== null ? tax : (s.taxRate || 18);
    lineItemCount++;
    const id = lineItemCount;
    const container = document.getElementById('lineItemsContainer');
    const div = document.createElement('div');
    div.id = 'li_' + id;
    div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px';
    div.innerHTML = `
    <div><label class="form-label" ${id > 1 ? 'style="display:none"' : ''}>Description</label><input type="text" class="form-control" placeholder="Business Cards printing" value="${desc}" oninput="recalcTotals()"></div>
    <div><label class="form-label" ${id > 1 ? 'style="display:none"' : ''}>Qty</label><input type="number" class="form-control" value="${qty}" min="1" oninput="recalcTotals()"></div>
    <div><label class="form-label" ${id > 1 ? 'style="display:none"' : ''}>Rate (₹)</label><input type="number" class="form-control" value="${rate}" min="0" step="0.01" oninput="recalcTotals()"></div>
    <div><label class="form-label" ${id > 1 ? 'style="display:none"' : ''}>GST %</label><input type="number" class="form-control" value="${defaultTax}" min="0" max="100" oninput="recalcTotals()"></div>
    <div style="padding-bottom:0"><button class="btn btn-danger btn-sm btn-icon" onclick="removeLine(${id})">✕</button></div>
  `;
    container.appendChild(div);
    recalcTotals();
}

function removeLine(id) {
    document.getElementById('li_' + id)?.remove();
    recalcTotals();
}

function recalcTotals() {
    let subtotal = 0, taxTotal = 0;
    document.querySelectorAll('#lineItemsContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input');
        const qty = parseFloat(inputs[1]?.value) || 0;
        const rate = parseFloat(inputs[2]?.value) || 0;
        const taxPct = parseFloat(inputs[3]?.value) || 0;
        const lineTotal = qty * rate;
        subtotal += lineTotal;
        taxTotal += lineTotal * (taxPct / 100);
    });
    const grand = subtotal + taxTotal;
    const s = DB.getOne('settings');
    const sym = s.currency || '₹';
    document.getElementById('invSubtotal').textContent = sym + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('invTax').textContent = sym + taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('invTotal').textContent = sym + grand.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function getLineItems() {
    const items = [];
    document.querySelectorAll('#lineItemsContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input');
        items.push({
            desc: inputs[0]?.value || '',
            qty: parseFloat(inputs[1]?.value) || 1,
            rate: parseFloat(inputs[2]?.value) || 0,
            tax: parseFloat(inputs[3]?.value) || 0,
        });
    });
    return items;
}

function populateInvoiceCustomers() {
    const sel = document.getElementById('invCustomer');
    const orderSel = document.getElementById('invOrder');
    if (!sel) return;
    const customers = DB.get('customers');
    sel.innerHTML = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    sel.addEventListener('change', () => {
        const orders = DB.get('orders').filter(o => o.customerId == sel.value);
        orderSel.innerHTML = `<option value="">— None —</option>` + orders.map(o => `<option value="${o.id}">#${o.id} ${o.jobType} — ${currency(o.amount)}</option>`).join('');
    });
    sel.dispatchEvent(new Event('change'));

    orderSel.addEventListener('change', () => {
        if (!orderSel.value) return;
        const o = DB.get('orders').find(x => x.id == orderSel.value);
        if (o && document.querySelectorAll('#lineItemsContainer > div').length === 0) {
            addLineItem(o.jobType + ' ' + o.qty + ' pcs', 1, o.amount, DB.getOne('settings').taxRate || 18);
        }
    });
}

function saveInvoice() {
    const id = document.getElementById('editInvId').value;
    const custId = parseInt(document.getElementById('invCustomer').value);
    const orderId = document.getElementById('invOrder').value;
    const customers = DB.get('customers');
    const cust = customers.find(c => c.id === custId);
    if (!cust) { toast('Select a customer', 'error'); return; }

    const items = getLineItems();
    if (!items.length) { toast('Add at least one line item', 'error'); return; }

    let subtotal = 0, taxTotal = 0;
    items.forEach(i => { const l = i.qty * i.rate; subtotal += l; taxTotal += l * (i.tax / 100); });
    const total = subtotal + taxTotal;

    const invoices = DB.get('invoices');
    const now = new Date().toISOString().slice(0, 10);
    const inv = {
        id: id ? parseInt(id) : DB.nextId('invoices'),
        orderId: orderId ? parseInt(orderId) : null,
        customerId: custId,
        customerName: cust.name,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(taxTotal * 100) / 100,
        total: Math.round(total * 100) / 100,
        status: document.getElementById('invStatus').value,
        createdAt: id ? (invoices.find(i => i.id == id)?.createdAt || now) : now,
    };

    if (id) {
        invoices[invoices.findIndex(i => i.id === parseInt(id))] = inv;
        toast('Invoice updated!');
    } else {
        invoices.push(inv);
        toast('Invoice created!', 'success');
    }
    DB.set('invoices', invoices);
    closeModal('addInvoiceModal');
    renderInvoices();
}

function renderInvoices() {
    const invoices = DB.get('invoices');
    const q = document.getElementById('searchInvoices').value.toLowerCase();
    const st = document.getElementById('filterPayStatus').value;

    const filtered = invoices.filter(i =>
        (!q || i.customerName.toLowerCase().includes(q) || String(i.id).includes(q)) &&
        (!st || i.status === st)
    ).sort((a, b) => b.id - a.id);

    // KPI
    const totalBilled = invoices.reduce((a, b) => a + b.total, 0);
    const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((a, b) => a + b.total, 0);
    const totalUnpaid = invoices.filter(i => i.status === 'Unpaid').reduce((a, b) => a + b.total, 0);
    const kpi = document.getElementById('billingKpi');
    if (kpi) {
        kpi.innerHTML = `
      <div class="kpi-card" style="--kpi-color:#3b82f6"><div class="kpi-icon">🧾</div><div class="kpi-value">${invoices.length}</div><div class="kpi-label">Total Invoices</div></div>
      <div class="kpi-card" style="--kpi-color:#22c55e"><div class="kpi-icon">💰</div><div class="kpi-value">${currency(totalPaid)}</div><div class="kpi-label">Amount Collected</div></div>
      <div class="kpi-card" style="--kpi-color:#ef4444"><div class="kpi-icon">⏳</div><div class="kpi-value">${currency(totalUnpaid)}</div><div class="kpi-label">Pending Recovery</div></div>
      <div class="kpi-card" style="--kpi-color:#f59e0b"><div class="kpi-icon">📊</div><div class="kpi-value">${currency(totalBilled)}</div><div class="kpi-label">Total Billed</div></div>
    `;
    }

    // Update tax label
    const taxEl = document.getElementById('taxPctLabel');
    if (taxEl) taxEl.textContent = DB.getOne('settings').taxRate || 18;

    const tbl = document.getElementById('invoicesTable');
    if (!tbl) return;
    if (!filtered.length) {
        tbl.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🧾</div><p>No invoices found</p></div></td></tr>`;
        return;
    }
    tbl.innerHTML = filtered.map(i => `
    <tr>
      <td><strong style="color:var(--accent-light)">INV-${String(i.id).padStart(3, '0')}</strong></td>
      <td style="font-size:12px">${formatDate(i.createdAt)}</td>
      <td><strong>${i.customerName}</strong></td>
      <td>${currency(i.subtotal)}</td>
      <td style="color:var(--text-secondary)">${currency(i.tax)}</td>
      <td><strong style="color:var(--success)">${currency(i.total)}</strong></td>
      <td>${statusBadge(i.status)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="previewInvoice(${i.id})" title="View">👁️</button>
          ${i.status !== 'Paid' ? `<button class="btn btn-success btn-sm btn-icon" onclick="markPaid(${i.id})" title="Mark Paid">✅</button>` : ''}
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteInvoice(${i.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function previewInvoice(id) {
    currentPreviewInvoiceId = id;
    const i = DB.get('invoices').find(x => x.id === id);
    const s = DB.getOne('settings');
    const area = document.getElementById('invoicePreviewArea');
    if (!area || !i) return;

    area.innerHTML = `
    <div class="invoice-preview">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h2 style="margin-bottom:4px">${s.shopName || 'Print Shop'}</h2>
          <div style="font-size:12px;color:#64748b">${s.address || ''}</div>
          <div style="font-size:12px;color:#64748b">${s.phone || ''} · ${s.email || ''}</div>
          ${s.gst ? `<div style="font-size:11px;color:#64748b;margin-top:2px">GST: ${s.gst}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:#1e40af">TAX INVOICE</div>
          <div style="font-size:15px;font-weight:700">INV-${String(i.id).padStart(3, '0')}</div>
          <div style="font-size:12px;color:#64748b">${formatDate(i.createdAt)}</div>
          <div style="margin-top:6px;display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${i.status === 'Paid' ? '#dcfce7' : '#fee2e2'};color:${i.status === 'Paid' ? '#16a34a' : '#dc2626'}">${i.status}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:6px;padding:12px;margin-bottom:16px;font-size:13px">
        <strong>Bill To:</strong> ${i.customerName}
      </div>
      <table class="invoice-table">
        <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>GST%</th><th>Amount</th></tr></thead>
        <tbody>
          ${i.items.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.desc}</td>
              <td>${item.qty}</td>
              <td>${currency(item.rate)}</td>
              <td>${item.tax}%</td>
              <td><strong>${currency(item.qty * item.rate)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="5" style="text-align:right;padding:8px 12px;font-size:12px;color:#64748b">Subtotal</td><td style="padding:8px 12px">${currency(i.subtotal)}</td></tr>
          <tr><td colspan="5" style="text-align:right;padding:8px 12px;font-size:12px;color:#64748b">GST</td><td style="padding:8px 12px">${currency(i.tax)}</td></tr>
          <tr class="invoice-total"><td colspan="5" style="text-align:right">Grand Total</td><td>${currency(i.total)}</td></tr>
        </tfoot>
      </table>
      ${s.terms ? `<div style="margin-top:16px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px"><strong>Terms:</strong> ${s.terms}</div>` : ''}
    </div>
  `;
    document.getElementById('printInvBtn').style.display = '';
}

function printCurrentInvoice() {
    if (!currentPreviewInvoiceId) { toast('Select an invoice first', 'error'); return; }
    const i = DB.get('invoices').find(x => x.id === currentPreviewInvoiceId);
    const s = DB.getOne('settings');
    const win = window.open('', '_blank');
    win.document.write(`
    <html><head><title>Invoice INV-${String(i.id).padStart(3, '0')}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:700px;margin:auto;color:#111}
    h2{color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:12px}
    td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
    tfoot tr:last-child td{background:#1e40af;color:#fff;font-weight:700;padding:10px 12px}
    @media print{body{padding:0}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div><h2>${s.shopName || 'Print Shop'}</h2><div style="font-size:12px;color:#64748b">${s.address || ''}<br>${s.phone || ''} · ${s.email || ''}</div>${s.gst ? `<div style="font-size:11px;color:#888">GST: ${s.gst}</div>` : ''}</div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:800;color:#1e40af">TAX INVOICE</div><div style="font-size:15px;font-weight:700">INV-${String(i.id).padStart(3, '0')}</div><div style="font-size:12px">${formatDate(i.createdAt)}</div></div>
    </div>
    <div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px"><strong>Bill To:</strong> ${i.customerName}</div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>GST%</th><th>Amount</th></tr></thead>
      <tbody>${i.items.map((it, idx) => `<tr><td>${idx + 1}</td><td>${it.desc}</td><td>${it.qty}</td><td>${currency(it.rate)}</td><td>${it.tax}%</td><td>${currency(it.qty * it.rate)}</td></tr>`).join('')}</tbody>
      <tfoot>
        <tr><td colspan="5" style="text-align:right">Subtotal</td><td>${currency(i.subtotal)}</td></tr>
        <tr><td colspan="5" style="text-align:right">GST</td><td>${currency(i.tax)}</td></tr>
        <tr><td colspan="5" style="text-align:right;background:#1e40af;color:#fff;font-weight:700;padding:10px 12px">Grand Total</td><td style="background:#1e40af;color:#fff;font-weight:700;padding:10px 12px">${currency(i.total)}</td></tr>
      </tfoot>
    </table>
    ${s.terms ? `<div style="margin-top:16px;font-size:11px;color:#888;border-top:1px solid #e2e8f0;padding-top:10px"><strong>Terms:</strong> ${s.terms}</div>` : ''}
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`);
    win.document.close();
}

function markPaid(id) {
    const invoices = DB.get('invoices');
    const idx = invoices.findIndex(i => i.id === id);
    invoices[idx].status = 'Paid';
    DB.set('invoices', invoices);
    toast('Invoice marked as Paid ✅', 'success');
    if (currentPreviewInvoiceId === id) previewInvoice(id);
    renderInvoices();
}

function deleteInvoice(id) {
    if (!confirm('Delete invoice INV-' + String(id).padStart(3, '0') + '?')) return;
    DB.set('invoices', DB.get('invoices').filter(i => i.id !== id));
    if (currentPreviewInvoiceId === id) {
        currentPreviewInvoiceId = null;
        document.getElementById('invoicePreviewArea').innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><p>Click "View" on an invoice to preview it here</p></div>`;
        document.getElementById('printInvBtn').style.display = 'none';
    }
    toast('Invoice deleted', 'warning');
    renderInvoices();
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    document.getElementById('printInvBtn').style.display = 'none';
    populateInvoiceCustomers();

    document.querySelector('[onclick="openModal(\'addInvoiceModal\')"]')?.addEventListener('click', () => {
        document.getElementById('invModalTitle').textContent = 'Create Invoice';
        document.getElementById('editInvId').value = '';
        document.getElementById('lineItemsContainer').innerHTML = '';
        lineItemCount = 0;
        addLineItem();
        populateInvoiceCustomers();
        recalcTotals();
    });

    renderInvoices();
  });
});
