/* reports.js */
'use strict';

let currentRange = 'month';

function setRange(range) {
    currentRange = range;
    document.querySelectorAll('[id^=range]').forEach(b => b.classList.remove('btn-primary'));
    document.getElementById('range' + range.charAt(0).toUpperCase() + range.slice(1))?.classList.add('btn-primary');
    renderReports();
}

function getDateRange() {
    const now = new Date();
    let start;
    if (currentRange === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (currentRange === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
    } else if (currentRange === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
    } else {
        start = new Date('2000-01-01');
    }
    return { start, end: now };
}

function inRange(dateStr) {
    const { start, end } = getDateRange();
    const d = new Date(dateStr);
    return d >= start && d <= end;
}

function drawBarChart(canvasId, labels, data, color = '#3b82f6') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 400, H = 220;
    canvas.width = W; canvas.height = H;
    const pad = { top: 20, right: 20, bottom: 50, left: 70 };
    const iW = W - pad.left - pad.right;
    const iH = H - pad.top - pad.bottom;
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(...data, 1);
    const barW = iW / (data.length * 1.5);

    // Grid
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + iH - (i / 4) * iH;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
        ctx.fillText('₹' + Math.round((i / 4) * max).toLocaleString('en-IN'), pad.left - 8, y + 4);
    }

    data.forEach((v, i) => {
        const x = pad.left + (i / data.length) * iW + (iW / data.length - barW) / 2;
        const bh = (v / max) * iH;
        const y = pad.top + iH - bh;
        const grad = ctx.createLinearGradient(0, y, 0, pad.top + iH);
        grad.addColorStop(0, color); grad.addColorStop(1, color + '55');
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]) : ctx.rect(x, y, barW, bh);
        ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barW / 2, H - 10);
    });
}

function renderReports() {
    const orders = DB.get('orders').filter(o => inRange(o.createdAt));
    const invoices = DB.get('invoices');
    const paidInv = invoices.filter(i => i.status === 'Paid' && inRange(i.createdAt));
    const allOrders = DB.get('orders');
    const customers = DB.get('customers');
    const s = DB.getOne('settings');

    const label = document.getElementById('rangeLabel');
    if (label) {
        const { start, end } = getDateRange();
        label.textContent = start.toLocaleDateString('en-IN') + ' – ' + end.toLocaleDateString('en-IN');
    }

    // KPI
    const totalRev = paidInv.reduce((a, b) => a + b.total, 0);
    const unpaid = invoices.filter(i => i.status === 'Unpaid' && inRange(i.createdAt)).reduce((a, b) => a + b.total, 0);
    const kpi = document.getElementById('reportKpi');
    if (kpi) {
        kpi.innerHTML = `
      <div class="kpi-card" style="--kpi-color:#22c55e"><div class="kpi-icon">💰</div><div class="kpi-value">${currency(totalRev)}</div><div class="kpi-label">Revenue Collected</div></div>
      <div class="kpi-card" style="--kpi-color:#3b82f6"><div class="kpi-icon">📋</div><div class="kpi-value">${orders.length}</div><div class="kpi-label">Orders Received</div></div>
      <div class="kpi-card" style="--kpi-color:#f59e0b"><div class="kpi-icon">⏳</div><div class="kpi-value">${currency(unpaid)}</div><div class="kpi-label">Unpaid Amount</div></div>
      <div class="kpi-card" style="--kpi-color:#a78bfa"><div class="kpi-icon">👥</div><div class="kpi-value">${customers.length}</div><div class="kpi-label">Total Customers</div></div>
    `;
    }

    // Monthly revenue chart (last 6 months)
    const months = [], monthRevs = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        months.push(d.toLocaleDateString('en-IN', { month: 'short' }));
        monthRevs.push(invoices.filter(inv => inv.createdAt.startsWith(key) && inv.status === 'Paid').reduce((a, b) => a + b.total, 0));
    }
    setTimeout(() => drawBarChart('monthlyChart', months, monthRevs, '#3b82f6'), 100);

    // Job type chart
    const jobTypes = ['Business Cards', 'Pamphlets', 'Banners', 'Books', 'Letterhead', 'Visiting Cards', 'Prescription Pads', 'Custom'];
    const jobColors = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#06b6d4', '#ec4899', '#ef4444', '#64748b'];
    const jobCounts = jobTypes.map(j => orders.filter(o => o.jobType === j).length);
    const activeJobs = jobTypes.filter((_, i) => jobCounts[i] > 0);
    const activeCounts = jobCounts.filter(c => c > 0);
    const activeColors = jobColors.filter((_, i) => jobCounts[i] > 0);
    setTimeout(() => drawBarChart('jobTypeChart', activeJobs.map(j => j.length > 8 ? j.slice(0, 7) + '..' : j), activeCounts, '#22c55e'), 100);

    // Top customers
    const custRevMap = {};
    allOrders.filter(o => inRange(o.createdAt)).forEach(o => {
        if (!custRevMap[o.customerName]) custRevMap[o.customerName] = { orders: 0, rev: 0 };
        custRevMap[o.customerName].orders++;
        custRevMap[o.customerName].rev += o.amount;
    });
    const topCusts = Object.entries(custRevMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 6);
    const top = document.getElementById('topCustTable');
    if (top) {
        top.innerHTML = topCusts.length ? topCusts.map(([name, d], i) => `
      <tr>
        <td><strong style="color:${['#ffd700', '#c0c0c0', '#cd7f32'][i] || 'var(--text-secondary)'}">${i + 1}</strong></td>
        <td><strong>${name}</strong></td>
        <td>${d.orders}</td>
        <td><strong style="color:var(--success)">${currency(d.rev)}</strong></td>
      </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No data in selected range</td></tr>`;
    }

    // Order summary
    const statuses = ['Pending', 'In Progress', 'Ready', 'Delivered'];
    const sumTbl = document.getElementById('orderSumTable');
    if (sumTbl) {
        sumTbl.innerHTML = statuses.map(s => {
            const grp = orders.filter(o => o.status === s);
            return `<tr><td>${statusBadge(s)}</td><td><strong>${grp.length}</strong></td><td>${currency(grp.reduce((a, o) => a + o.amount, 0))}</td></tr>`;
        }).join('');
    }

    // Payment summary
    const pay = document.getElementById('paymentSummary');
    if (pay) {
        const rangeInv = invoices.filter(i => inRange(i.createdAt));
        const total = rangeInv.reduce((a, b) => a + b.total, 0) || 1;
        [['Paid', '#22c55e'], ['Unpaid', '#ef4444'], ['Partial', '#f59e0b']].forEach(([st, col]) => {
            const amt = rangeInv.filter(i => i.status === st).reduce((a, b) => a + b.total, 0);
            const pct = Math.round(amt / total * 100);
            pay.innerHTML += `<div style="font-size:13px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text-secondary)">${st}</span><strong>${currency(amt)} (${pct}%)</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
        });
    }
}

function exportCSV() {
    const orders = DB.get('orders');
    const header = ['ID', 'Date', 'Customer', 'Job Type', 'Qty', 'Paper', 'Deadline', 'Assigned To', 'Amount', 'Status'];
    const rows = orders.map(o => [o.id, o.createdAt, o.customerName, o.jobType, o.qty, o.paperType || '', o.deadline, o.assignedTo || '', o.amount, o.status]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'printmaster_orders_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    toast('CSV exported successfully!', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  window.onDataLoaded(() => {
    setRange('month');
  });
});
