/* dashboard.js */
'use strict';

// ── Mini Chart (no external library needed) ──────────────────────

function drawLineChart(canvasId, labels, data, color = '#3b82f6') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400, H = 200;
  canvas.width = W; canvas.height = H;
  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...data, 1);
  const min = 0;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + iH - (i / 4) * iH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
    ctx.fillText('₹' + Math.round((i / 4) * max).toLocaleString('en-IN'), pad.left - 8, y + 4);
  }

  // Area fill
  const pts = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1 || 1)) * iW,
    y: pad.top + iH - ((v - min) / (max - min)) * iH
  }));
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + iH);
  grad.addColorStop(0, color + '44'); grad.addColorStop(1, color + '05');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + iH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.top + iH);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0f1e'; ctx.fill();
  });

  // X-Labels
  ctx.fillStyle = '#475569'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    ctx.fillText(l, pad.left + (i / (labels.length - 1 || 1)) * iW, H - 10);
  });
}

function drawDonutChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 260, H = 200;
  canvas.width = W; canvas.height = H;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38, inner = R * 0.58;
  const total = data.reduce((a, b) => a + b, 0) || 1;
  let angle = -Math.PI / 2;

  data.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice);
    ctx.closePath(); ctx.fillStyle = colors[i]; ctx.fill();
    angle += slice;
  });

  // Donut hole
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#111827'; ctx.fill();
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 5);
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter';
  ctx.fillText('Total', cx, cy + 20);
}

// ── Dashboard Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    const orders = DB.get('orders');
    const invoices = DB.get('invoices');
    const inventory = DB.get('inventory');
    const s = DB.getOne('settings');

    // KPIs
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.createdAt === today).length;
    const paidTotal = invoices.filter(i => i.status === 'Paid').reduce((a, b) => a + b.total, 0);
    const pending = orders.filter(o => o.status === 'Pending').length;
    const lowStock = inventory.filter(i => i.qty <= i.reorderLevel).length;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthRev = invoices.filter(i => i.createdAt.startsWith(thisMonth) && i.status === 'Paid').reduce((a, b) => a + b.total, 0);

    const kpiData = [
      { icon: '📋', value: orders.length, label: 'Total Orders', change: `+${todayOrders} today`, dir: 'up', color: '#3b82f6' },
      { icon: '💰', value: (s.currency || '₹') + monthRev.toLocaleString('en-IN'), label: 'Revenue This Month', change: 'Paid invoices', dir: 'up', color: '#22c55e' },
      { icon: '⏳', value: pending, label: 'Pending Orders', change: 'Awaiting processing', dir: pending > 3 ? 'down' : 'up', color: '#f59e0b' },
      { icon: '⚠️', value: lowStock, label: 'Low Stock Alerts', change: 'Items need reorder', dir: lowStock > 0 ? 'down' : 'up', color: '#ef4444' },
    ];

    const grid = document.getElementById('kpiGrid');
    if (grid) {
      grid.innerHTML = kpiData.map(k => `
      <div class="kpi-card" style="--kpi-color:${k.color}">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-change ${k.dir}">● ${k.change}</div>
      </div>
    `).join('');
    }

    // Revenue chart – last 7 days
    const days = [], revs = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      days.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
      revs.push(invoices.filter(inv => inv.createdAt === ds && inv.status === 'Paid').reduce((a, b) => a + b.total, 0));
    }
    setTimeout(() => drawLineChart('revenueChart', days, revs), 100);

    // Status donut
    const statuses = ['Pending', 'In Progress', 'Ready', 'Delivered'];
    const statusColors = ['#f59e0b', '#06b6d4', '#a78bfa', '#22c55e'];
    const statusCounts = statuses.map(s => orders.filter(o => o.status === s).length);
    setTimeout(() => drawDonutChart('statusChart', statuses, statusCounts, statusColors), 100);

    const legend = document.getElementById('statusLegend');
    if (legend) {
      legend.innerHTML = statuses.map((s, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px">
        <span style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${statusColors[i]};display:inline-block"></span>
          ${s}
        </span>
        <strong>${statusCounts[i]}</strong>
      </div>
    `).join('');
    }

    // Recent orders
    const tbl = document.getElementById('recentOrdersTable');
    if (tbl) {
      const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);
      tbl.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td style="font-weight:600;color:var(--accent-light)">#${o.id}</td>
        <td>${o.customerName}</td>
        <td>${o.jobType}</td>
        <td>${currency(o.amount)}</td>
        <td>${statusBadge(o.status)}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No orders yet</td></tr>`;
    }

    // Low stock
    const lowList = document.getElementById('lowStockList');
    if (lowList) {
      const low = inventory.filter(i => i.qty <= i.reorderLevel);
      if (low.length === 0) {
        lowList.innerHTML = `<p style="color:var(--success);font-size:13px">✅ All stock levels are fine!</p>`;
      } else {
        lowList.innerHTML = low.map(i => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span>${i.name}</span>
          <span class="badge badge-low">${i.qty} ${i.unit}</span>
        </div>
      `).join('');
      }
    }
  });
});

