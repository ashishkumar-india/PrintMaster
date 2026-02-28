/* orders.js */
'use strict';

function renderOrders() {
  const orders = DB.get('orders');
  const q = document.getElementById('searchOrders').value.toLowerCase();
  const st = document.getElementById('filterStatus').value;
  const jt = document.getElementById('filterJob').value;

  const filtered = orders.filter(o =>
    (!q || o.customerName.toLowerCase().includes(q) || o.jobType.toLowerCase().includes(q) || String(o.id).includes(q)) &&
    (!st || o.status === st) &&
    (!jt || o.jobType === jt)
  ).sort((a, b) => b.id - a.id);

  const statuses = ['Pending', 'In Progress', 'Ready', 'Delivered'];
  const stats = document.getElementById('orderStats');
  if (stats) {
    stats.innerHTML = statuses.map(s => {
      const cnt = orders.filter(o => o.status === s).length;
      const colors = { 'Pending': '#f59e0b', 'In Progress': '#06b6d4', 'Ready': '#a78bfa', 'Delivered': '#22c55e' };
      return `<div class="stat-pill"><span style="width:8px;height:8px;border-radius:50%;background:${colors[s]};display:inline-block"></span><span style="color:var(--text-secondary)">${s}</span><strong>${cnt}</strong></div>`;
    }).join('');
  }

  const tbl = document.getElementById('ordersTable');
  if (!tbl) return;

  if (!filtered.length) {
    tbl.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📋</div><p>No orders found</p><button class="btn btn-primary" onclick="openModal('addOrderModal')">Create First Order</button></div></td></tr>`;
    return;
  }

  tbl.innerHTML = filtered.map(o => `
    <tr>
      <td><strong style="color:var(--accent-light)">#${o.id}</strong></td>
      <td style="font-size:12px;color:var(--text-secondary)">${formatDate(o.createdAt)}</td>
      <td><strong>${o.customerName}</strong></td>
      <td>${o.jobType}</td>
      <td>${Number(o.qty).toLocaleString('en-IN')}</td>
      <td style="color:${new Date(o.deadline) < new Date() && o.status !== 'Delivered' ? 'var(--danger)' : 'var(--text-primary)'}">${formatDate(o.deadline)}</td>
      <td style="font-size:12px">${o.assignedTo || '—'}</td>
      <td><strong>${currency(o.amount)}</strong></td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm btn-icon" title="View" onclick="viewOrder(${o.id})">👁️</button>
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="editOrder(${o.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteOrder(${o.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function populateCustomerDropdown(selectId, selectedId = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const customers = DB.get('customers');
  sel.innerHTML = customers.length
    ? customers.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`).join('')
    : `<option value="">No customers yet</option>`;
}

async function saveOrder() {
  const id = document.getElementById('editOrderId').value;
  const customers = DB.get('customers');
  const custId = parseInt(document.getElementById('orderCustomer').value);
  const cust = customers.find(c => c.id === custId);
  if (!cust) { toast('Please select a customer', 'error'); return; }

  const qty = parseInt(document.getElementById('orderQty').value);
  const amount = parseFloat(document.getElementById('orderAmount').value);
  const deadline = document.getElementById('orderDeadline').value;

  if (!qty || !amount || !deadline) { toast('Please fill all required fields', 'error'); return; }

  const now = new Date().toISOString().slice(0, 10);

  const orderData = {
    customerId: custId,
    customerName: cust.name,
    jobType: document.getElementById('orderJobType').value,
    qty,
    paperType: document.getElementById('orderPaper').value,
    size: document.getElementById('orderSize').value,
    color: document.getElementById('orderColor').value,
    instructions: document.getElementById('orderInstructions').value,
    deadline,
    status: document.getElementById('orderStatus').value,
    assignedTo: document.getElementById('orderAssigned').value,
    amount,
    createdAt: now,
  };

  if (window.supabaseClient) {
    if (id) {
      // Update existing
      orderData.id = parseInt(id);
      const { error } = await window.supabaseClient.from('orders').update(orderData).eq('id', parseInt(id));
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Order updated successfully!');
    } else {
      // Insert new
      const { error } = await window.supabaseClient.from('orders').insert([orderData]);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Order created successfully!', 'success');
    }
    await loadSupabaseData();
  }

  closeModal('addOrderModal');
  renderOrders();
}

function editOrder(id) {
  const orders = DB.get('orders');
  const o = orders.find(x => x.id === id);
  if (!o) return;
  document.getElementById('orderModalTitle').textContent = 'Edit Order #' + id;
  document.getElementById('editOrderId').value = id;
  populateCustomerDropdown('orderCustomer', o.customerId);
  document.getElementById('orderJobType').value = o.jobType;
  document.getElementById('orderQty').value = o.qty;
  document.getElementById('orderPaper').value = o.paperType || '';
  document.getElementById('orderSize').value = o.size || '';
  document.getElementById('orderColor').value = o.color || '';
  document.getElementById('orderInstructions').value = o.instructions || '';
  document.getElementById('orderDeadline').value = o.deadline;
  document.getElementById('orderAmount').value = o.amount;
  document.getElementById('orderStatus').value = o.status;
  document.getElementById('orderAssigned').value = o.assignedTo || '';
  openModal('addOrderModal');
}

function deleteOrder(id) {
  if (!confirm('Delete order #' + id + '? This cannot be undone.')) return;
  const orders = DB.get('orders').filter(o => o.id !== id);
  DB.set('orders', orders);
  toast('Order deleted', 'warning');
  renderOrders();
}

let currentViewOrder = null;

function viewOrder(id) {
  const o = DB.get('orders').find(x => x.id === id);
  if (!o) return;
  currentViewOrder = o;
  const s = DB.getOne('settings');
  document.getElementById('viewOrderBody').innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(124,58,237,0.1));border-radius:var(--radius-sm);padding:16px;margin-bottom:16px;border:1px solid rgba(59,130,246,0.2)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:22px;font-weight:800;color:var(--accent-light)">Order #${o.id}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${formatDate(o.createdAt)}</div>
        </div>
        <div>${statusBadge(o.status)}</div>
      </div>
    </div>
    <div class="form-row" style="gap:12px;margin-bottom:0">
      ${detail('Customer', o.customerName)}
      ${detail('Job Type', o.jobType)}
      ${detail('Quantity', o.qty.toLocaleString('en-IN'))}
      ${detail('Paper Type', o.paperType || '—')}
      ${detail('Size', o.size || '—')}
      ${detail('Color', o.color || '—')}
      ${detail('Deadline', formatDate(o.deadline))}
      ${detail('Assigned To', o.assignedTo || '—')}
      ${detail('Amount', currency(o.amount))}
    </div>
    ${o.instructions ? `<div style="margin-top:14px;background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">SPECIAL INSTRUCTIONS</div><div style="font-size:13px">${o.instructions}</div></div>` : ''}
    <div style="margin-top:16px">
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;font-weight:600">Update Status:</div>
      <div class="pipeline">
        ${['Pending', 'In Progress', 'Ready', 'Delivered'].map(s => `<button class="pipeline-step ${o.status === s ? 'active' : ''}" onclick="updateOrderStatus(${o.id},'${s}',this)">${s}</button>`).join('')}
      </div>
    </div>
  `;
  openModal('viewOrderModal');
}

function detail(label, val) {
  return `<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:3px">${label.toUpperCase()}</div><div style="font-size:14px;font-weight:500">${val}</div></div>`;
}

function updateOrderStatus(id, status, btn) {
  const orders = DB.get('orders');
  const idx = orders.findIndex(o => o.id === id);
  orders[idx].status = status;
  DB.set('orders', orders);
  document.querySelectorAll('.pipeline-step').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // update badge in table
  const rows = document.querySelectorAll('#ordersTable tr');
  renderOrders();
  toast(`Status updated to "${status}"`, 'success');
}

let currentSlipOrder = null;
function printOrderSlip() {
  if (!currentViewOrder) return;
  const o = currentViewOrder;
  const s = DB.getOne('settings');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Order Slip #${o.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;max-width:400px;margin:auto;color:#111}
    h2{color:#1e40af;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px}td:first-child{color:#64748b;font-weight:600}
    .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#dbeafe;color:#1d4ed8}
    hr{border:none;border-top:2px dashed #e2e8f0;margin:14px 0}
    @media print{body{padding:0}}</style></head><body>
    <h2>${s.shopName || 'Print Shop'}</h2>
    <div style="font-size:12px;color:#64748b">${s.address || ''} | ${s.phone || ''}</div>
    <hr>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong style="font-size:18px">Order #${o.id}</strong><br><span style="font-size:12px;color:#64748b">${formatDate(o.createdAt)}</span></div>
      <span class="status">${o.status}</span>
    </div>
    <table>
      <tr><td>Customer</td><td>${o.customerName}</td></tr>
      <tr><td>Job Type</td><td>${o.jobType}</td></tr>
      <tr><td>Quantity</td><td>${o.qty.toLocaleString('en-IN')}</td></tr>
      <tr><td>Paper</td><td>${o.paperType || '—'}</td></tr>
      <tr><td>Size</td><td>${o.size || '—'}</td></tr>
      <tr><td>Color</td><td>${o.color || '—'}</td></tr>
      <tr><td>Deadline</td><td>${formatDate(o.deadline)}</td></tr>
      <tr><td>Assigned To</td><td>${o.assignedTo || '—'}</td></tr>
      <tr><td><strong>Amount</strong></td><td><strong>${currency(o.amount)}</strong></td></tr>
    </table>
    ${o.instructions ? `<hr><strong>Instructions:</strong><p style="font-size:13px;margin-top:6px">${o.instructions}</p>` : ''}
    <hr><p style="font-size:11px;color:#94a3b8;text-align:center">Printed on ${new Date().toLocaleString('en-IN')} • ${s.shopName || 'Print Shop'}</p>
    <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>
  `);
  win.document.close();
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    populateCustomerDropdown('orderCustomer');
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('orderDeadline').value = today;

    document.getElementById('addOrderModal').addEventListener('show', () => {
      document.getElementById('orderModalTitle').textContent = 'New Order';
      document.getElementById('editOrderId').value = '';
      document.getElementById('orderStatus').value = 'Pending';
    });

    document.querySelector('[onclick="openModal(\'addOrderModal\')"]')?.addEventListener('click', () => {
      document.getElementById('orderModalTitle').textContent = 'New Order';
      document.getElementById('editOrderId').value = '';
      populateCustomerDropdown('orderCustomer');
    });

    renderOrders();
  });
});
