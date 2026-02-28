/* customers.js */
'use strict';

function renderCustomers() {
    const customers = DB.get('customers');
    const orders = DB.get('orders');
    const q = document.getElementById('searchCustomers').value.toLowerCase();

    const filtered = customers.filter(c =>
        !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q)
    ).sort((a, b) => b.id - a.id);

    const totalRev = orders.reduce((a, o) => a + o.amount, 0);
    const stats = document.getElementById('custStats');
    if (stats) {
        stats.innerHTML = `
      <div class="stat-pill"><span>👥</span><span style="color:var(--text-secondary)">Customers</span><strong>${customers.length}</strong></div>
      <div class="stat-pill"><span>💰</span><span style="color:var(--text-secondary)">Total Revenue</span><strong>${currency(totalRev)}</strong></div>
      <div class="stat-pill"><span>📋</span><span style="color:var(--text-secondary)">Total Orders</span><strong>${orders.length}</strong></div>
    `;
    }

    const tbl = document.getElementById('customersTable');
    if (!tbl) return;

    if (!filtered.length) {
        tbl.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><p>No customers found</p><button class="btn btn-primary" onclick="openModal('addCustomerModal')">Add First Customer</button></div></td></tr>`;
        return;
    }

    tbl.innerHTML = filtered.map(c => {
        const cOrders = orders.filter(o => o.customerId === c.id);
        const rev = cOrders.reduce((a, o) => a + o.amount, 0);
        return `
      <tr onclick="showCustomerDetail(${c.id})" style="cursor:pointer">
        <td><strong style="color:var(--accent-light)">#${c.id}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
              ${c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600">${c.name}</div>
              ${c.gst ? `<div style="font-size:11px;color:var(--text-muted)">GST: ${c.gst}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${c.phone}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${c.email || '—'}</td>
        <td><strong>${cOrders.length}</strong></td>
        <td><strong style="color:var(--success)">${currency(rev)}</strong></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="editCustomer(${c.id});event.stopPropagation()">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteCustomer(${c.id});event.stopPropagation()">🗑️</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
}

function showCustomerDetail(id) {
    const customers = DB.get('customers');
    const orders = DB.get('orders');
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const cOrders = orders.filter(o => o.customerId === id).sort((a, b) => b.id - a.id);
    const rev = cOrders.reduce((a, o) => a + o.amount, 0);

    const panel = document.getElementById('customerDetailPanel');
    if (!panel) return;

    panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;flex-shrink:0">${c.name.charAt(0)}</div>
      <div>
        <div style="font-size:18px;font-weight:700">${c.name}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${c.phone} ${c.email ? '· ' + c.email : ''}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${c.address || ''}</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:18px">
      <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:var(--accent-light)">${cOrders.length}</div>
        <div style="font-size:11px;color:var(--text-secondary)">Orders</div>
      </div>
      <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center">
        <div style="font-size:16px;font-weight:800;color:var(--success)">${currency(rev)}</div>
        <div style="font-size:11px;color:var(--text-secondary)">Total Spent</div>
      </div>
    </div>

    <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Recent Orders</div>
    ${cOrders.length ? cOrders.slice(0, 5).map(o => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
        <div>
          <div style="font-weight:600">${o.jobType} <span style="color:var(--accent-light)">#${o.id}</span></div>
          <div style="font-size:11px;color:var(--text-muted)">${formatDate(o.createdAt)} · Qty: ${o.qty}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">${currency(o.amount)}</div>
          ${statusBadge(o.status)}
        </div>
      </div>
    `).join('') : `<p style="color:var(--text-muted);font-size:13px">No orders yet</p>`}

    <div style="margin-top:16px;display:flex;gap:10px">
      <button class="btn btn-secondary btn-sm" onclick="editCustomer(${c.id})">✏️ Edit</button>
      <a href="orders.html" class="btn btn-primary btn-sm">＋ New Order</a>
    </div>
  `;
}

function saveCustomer() {
    const id = document.getElementById('editCustId').value;
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    if (!name || !phone) { toast('Name and phone are required', 'error'); return; }

    const customers = DB.get('customers');
    const now = new Date().toISOString().slice(0, 10);

    const cust = {
        id: id ? parseInt(id) : DB.nextId('customers'),
        name,
        phone,
        email: document.getElementById('custEmail').value,
        gst: document.getElementById('custGst').value,
        address: document.getElementById('custAddress').value,
        createdAt: id ? (customers.find(c => c.id == id)?.createdAt || now) : now,
    };

    if (id) {
        const idx = customers.findIndex(c => c.id === parseInt(id));
        customers[idx] = cust;
        toast('Customer updated!');
    } else {
        customers.push(cust);
        toast('Customer added!', 'success');
    }

    DB.set('customers', customers);
    closeModal('addCustomerModal');
    renderCustomers();
}

function editCustomer(id) {
    const c = DB.get('customers').find(x => x.id === id);
    if (!c) return;
    document.getElementById('custModalTitle').textContent = 'Edit Customer';
    document.getElementById('editCustId').value = id;
    document.getElementById('custName').value = c.name;
    document.getElementById('custPhone').value = c.phone;
    document.getElementById('custEmail').value = c.email || '';
    document.getElementById('custGst').value = c.gst || '';
    document.getElementById('custAddress').value = c.address || '';
    openModal('addCustomerModal');
}

function deleteCustomer(id) {
    if (!confirm('Delete this customer? Their order history will remain.')) return;
    const customers = DB.get('customers').filter(c => c.id !== id);
    DB.set('customers', customers);
    toast('Customer deleted', 'warning');
    document.getElementById('customerDetailPanel').innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>Click a customer to view history</p></div>`;
    renderCustomers();
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    document.querySelector('[onclick="openModal(\'addCustomerModal\')"]')?.addEventListener('click', () => {
        document.getElementById('custModalTitle').textContent = 'Add Customer';
        document.getElementById('editCustId').value = '';
        ['custName', 'custPhone', 'custEmail', 'custGst', 'custAddress'].forEach(id => document.getElementById(id).value = '');
    });
    renderCustomers();
  });
});
