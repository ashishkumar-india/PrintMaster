/* enquiries.js */
'use strict';

function getEnquiries() {
  return DB.get('enquiries');
}
function saveEnquiries(arr) {
  DB.set('enquiries', arr);
}

function renderEnquiries() {
  const enqs = getEnquiries();
  const q = (document.getElementById('searchEnq')?.value || '').toLowerCase();
  const st = document.getElementById('filterEnqStatus')?.value || '';

  const filtered = enqs.filter(e =>
    (!q || e.name.toLowerCase().includes(q) || e.phone.includes(q) || (e.service || '').toLowerCase().includes(q)) &&
    (!st || e.status === st)
  ).sort((a, b) => b.id - a.id);

  // KPI
  const newCount = enqs.filter(e => e.status === 'New').length;
  const contacted = enqs.filter(e => e.status === 'Contacted').length;
  const converted = enqs.filter(e => e.status === 'Converted').length;
  const kpi = document.getElementById('enqKpi');
  if (kpi) {
    kpi.innerHTML = `
      <div class="kpi-card" style="--kpi-color:#3b82f6"><div class="kpi-icon">📩</div><div class="kpi-value">${enqs.length}</div><div class="kpi-label">Total Enquiries</div></div>
      <div class="kpi-card" style="--kpi-color:#f59e0b"><div class="kpi-icon">🔔</div><div class="kpi-value">${newCount}</div><div class="kpi-label">New (Unread)</div></div>
      <div class="kpi-card" style="--kpi-color:#06b6d4"><div class="kpi-icon">📞</div><div class="kpi-value">${contacted}</div><div class="kpi-label">Contacted</div></div>
      <div class="kpi-card" style="--kpi-color:#22c55e"><div class="kpi-icon">✅</div><div class="kpi-value">${converted}</div><div class="kpi-label">Converted to Orders</div></div>
    `;
  }

  // Nav badge
  const badge = document.getElementById('enqBadge');
  if (badge) { badge.textContent = newCount; badge.style.display = newCount ? '' : 'none'; }

  const tbl = document.getElementById('enqTable');
  if (!tbl) return;

  if (!filtered.length) {
    tbl.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>No enquiries yet. Share your website to get quote requests!</p>
      <a href="customer.html" target="_blank" class="btn btn-primary">🌐 Open Customer Website</a>
    </div></td></tr>`;
    return;
  }

  const statusMap = { New: 'badge-pending', Contacted: 'badge-progress', Converted: 'badge-delivered', Closed: 'badge-unpaid' };

  tbl.innerHTML = filtered.map(e => `
    <tr onclick="showDetail(${e.id})" style="cursor:pointer">
      <td><strong style="color:var(--accent-light)">#${String(e.id).slice(-4)}</strong></td>
      <td style="font-size:12px;color:var(--text-secondary)">${formatDate(e.date?.slice(0, 10))}</td>
      <td>
        <div style="font-weight:600">${e.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${e.email || ''}</div>
      </td>
      <td style="font-size:13px">${e.phone}</td>
      <td style="font-size:12px">${e.service || '—'}</td>
      <td><span class="badge ${statusMap[e.status] || 'badge-pending'}">${e.status}</span></td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:6px">
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:12px" onchange="updateStatus(${e.id},this.value)">
            ${['New', 'Contacted', 'Converted', 'Closed'].map(s => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm btn-icon" title="Convert to Order" onclick="openConvert(${e.id})">📋</button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteEnq(${e.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showDetail(id) {
  const enqs = getEnquiries();
  const e = enqs.find(x => x.id === id);
  if (!e) return;

  // Auto-mark as read if New
  if (e.status === 'New') {
    e.status = 'Contacted';
    saveEnquiries(enqs);
    renderEnquiries();
  }

  const d = document.getElementById('enqDetailPanel');
  if (!d) return;
  d.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0">${e.name.charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-size:17px;font-weight:700">${e.name}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${e.phone}${e.email ? ' · ' + e.email : ''}</div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
      ${row('📩', 'Service Requested', e.service || '—')}
      ${row('📦', 'Quantity', e.qty || 'Not specified')}
      ${row('📅', 'Submitted On', formatDate(e.date?.slice(0, 10)) + ' ' + (e.date ? new Date(e.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''))}
    </div>

    ${e.msg ? `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;letter-spacing:0.5px">MESSAGE / REQUIREMENTS</div>
      <div style="font-size:14px;line-height:1.6">${e.msg}</div>
    </div>` : ''}

    <div style="display:flex;flex-direction:column;gap:10px">
      <a href="tel:${e.phone}" class="btn btn-primary">📞 Call ${e.name.split(' ')[0]}</a>
      <a href="https://wa.me/91${e.phone}?text=Hi%20${encodeURIComponent(e.name.split(' ')[0])}%2C%20thank%20you%20for%20contacting%20Star%20Xerox!%20Regarding%20your%20enquiry%20for%20${encodeURIComponent(e.service || 'printing')}%2C%20we%27d%20be%20happy%20to%20assist." target="_blank" class="btn btn-success">💬 WhatsApp Reply</a>
      <button class="btn btn-secondary" onclick="openConvert(${e.id})">📋 Convert to Order</button>
    </div>
  `;
}

function row(icon, label, val) {
  return `<div style="display:flex;align-items:flex-start;gap:12px">
    <span style="font-size:16px;flex-shrink:0">${icon}</span>
    <div><div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</div><div style="font-size:14px;font-weight:500;margin-top:2px">${val}</div></div>
  </div>`;
}

function updateStatus(id, status) {
  const enqs = getEnquiries();
  const idx = enqs.findIndex(e => e.id === id);
  enqs[idx].status = status;
  saveEnquiries(enqs);
  renderEnquiries();
  toast(`Status updated to "${status}"`, 'success');
}

function deleteEnq(id) {
  if (!confirm('Delete this enquiry?')) return;
  saveEnquiries(getEnquiries().filter(e => e.id !== id));
  toast('Enquiry deleted', 'warning');
  document.getElementById('enqDetailPanel').innerHTML = `<div class="empty-state"><div class="empty-icon">📩</div><p>Click an enquiry to see full details</p></div>`;
  renderEnquiries();
}

function clearAll() {
  if (!confirm('Delete ALL enquiries? This cannot be undone.')) return;
  DB.set('enquiries', []);
  toast('All enquiries cleared', 'warning');
  document.getElementById('enqDetailPanel').innerHTML = `<div class="empty-state"><div class="empty-icon">📩</div><p>Click an enquiry to see full details</p></div>`;
  renderEnquiries();
}

let convertTarget = null;

function openConvert(id) {
  convertTarget = getEnquiries().find(e => e.id === id);
  if (!convertTarget) return;
  document.getElementById('convertEnqId').value = id;
  const today = new Date(); today.setDate(today.getDate() + 3);
  document.getElementById('convertDeadline').value = today.toISOString().slice(0, 10);
  document.getElementById('convertAmount').value = '';
  document.getElementById('convertAssigned').value = '';
  openModal('convertModal');
}

async function doConvert() {
  if (!convertTarget) return;
  const deadline = document.getElementById('convertDeadline').value;
  const amount = parseFloat(document.getElementById('convertAmount').value) || 0;
  const assigned = document.getElementById('convertAssigned').value;
  if (!deadline) { toast('Please set a deadline', 'error'); return; }

  // Find or create customer
  let customers = DB.get('customers');
  let cust = customers.find(c => c.phone === convertTarget.phone);
  if (!cust) {
    const newCust = { name: convertTarget.name, phone: convertTarget.phone, email: convertTarget.email || '', gst: '', address: '', createdAt: new Date().toISOString().slice(0, 10) };

    // Insert directly into Supabase and get the real ID back
    if (window.supabaseClient) {
      const { data, error } = await window.supabaseClient.from('customers').insert([newCust]).select();
      if (error) {
        toast('Error creating customer: ' + error.message, 'error');
        return;
      }
      cust = data[0]; // Use the real Supabase-assigned record
      await loadSupabaseData(); // Refresh cache
    }
    toast(`New customer "${cust.name}" added!`, 'info');
  }

  // Create order using the REAL customer ID from Supabase
  const newOrder = {
    customerId: cust.id,
    customerName: cust.name,
    jobType: convertTarget.service || 'Custom',
    qty: parseInt(convertTarget.qty) || 1,
    paperType: '', size: '', color: '',
    instructions: convertTarget.msg || '',
    deadline, status: 'Pending',
    assignedTo: assigned,
    amount,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // Insert order directly into Supabase
  if (window.supabaseClient) {
    const { data: orderData, error: orderErr } = await window.supabaseClient.from('orders').insert([newOrder]).select();
    if (orderErr) {
      toast('Error creating order: ' + orderErr.message, 'error');
      return;
    }
    await loadSupabaseData(); // Refresh cache

    // Mark enquiry as converted
    updateStatus(convertTarget.id, 'Converted');

    closeModal('convertModal');
    toast(`Order #${orderData[0].id} created for ${cust.name}! ✅`, 'success');
    setTimeout(() => { if (confirm('Go to Orders page to view the new order?')) location.href = 'orders.html'; }, 800);
  }
}

// Seed a demo enquiry on first use (so admin isn't empty)
function seedDemoEnquiry() {
  // Seeding handled by SQL
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    seedDemoEnquiry();
    renderEnquiries();
  });
});
