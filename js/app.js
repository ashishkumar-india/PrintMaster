/* ============================================================
   app.js — Shared utilities, localStorage, nav, seed data
   ============================================================ */

'use strict';

// ──────────────────────────────────────────────────────────────────
// HIGH SECURITY AUTHENTICATION CHECK (Supabase)
// ──────────────────────────────────────────────────────────────────
async function checkAuth() {
  const isPublic = window.location.pathname.endsWith('customer.html') || window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
  if (isPublic) return;

  if (!window.supabaseClient) return;

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  }
}
checkAuth();

async function logout() {
  if (window.supabaseClient) {
    await window.supabaseClient.auth.signOut();
  }
  window.location.href = 'login.html';
}



// ──────────────────────────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ──────────────────────────────────────────────────────────────────
const DB_CACHE = {
  settings: {},
  customers: [],
  orders: [],
  inventory: [],
  invoices: [],
  enquiries: [],
  portfolio: []
};

let dbLoaded = false;
let dbLoadingPromise = null;

async function loadSupabaseData() {
  try {
    const tables = ['settings', 'customers', 'orders', 'inventory', 'invoices', 'enquiries', 'services', 'portfolio'];
    for (const table of tables) {
      if (!window.supabaseClient) break;
      const { data, error } = await window.supabaseClient.from(table).select('*').order('id', { ascending: true });
      if (!error && data) {
        if (table === 'settings') {
          DB_CACHE.settings = data[0] || {};
        } else {
          DB_CACHE[table] = data;
        }
      } else if (error) {
        console.warn(`Could not load table "${table}":`, error.message);
      }
    }
    dbLoaded = true;
    document.dispatchEvent(new Event('db-loaded'));
  } catch (e) {
    console.error('Data load error', e);
  }
}

const DB = {
  get(key) {
    return DB_CACHE[key] || [];
  },
  getOne(key) {
    return DB_CACHE[key] || {};
  },
  async set(key, val) {
    if (key === 'settings') {
      DB_CACHE.settings = val;
      val.id = 1;
      if (window.supabaseClient) await window.supabaseClient.from('settings').upsert(val);
      return;
    }

    const oldKeys = (DB_CACHE[key] || []).map(x => x.id);
    const newKeys = val.map(x => x.id);
    const toDelete = oldKeys.filter(id => !newKeys.includes(id));

    DB_CACHE[key] = val; // Synchronously update cache for instant UI rendering

    if (window.supabaseClient) {
      // Only handle DELETIONS here — inserts and updates are done directly in save functions
      if (toDelete.length > 0) {
        for (const id of toDelete) {
          const { error: delErr } = await window.supabaseClient.from(key).delete().eq('id', id);
          if (delErr) console.error(`Error deleting from ${key}:`, delErr);
        }
      }
    }
  },
  nextId(key) {
    const items = DB.get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  }
};

// ──────────────────────────────────────────────────────────────────
// SEED DEMO DATA (runs only once)
// ──────────────────────────────────────────────────────────────────
function seedData() {
  if (localStorage.getItem('pp_seeded')) return;

  const settings = {
    shopName: 'PrintMaster Press', ownerName: 'Rajesh Kumar',
    address: 'IIT Patna, Bihar — 801103', phone: '7654064878',
    email: 'info@printmaster.in', gst: '10AABCU9603R1Z1',
    currency: '₹', taxRate: 18, dateFormat: 'DD/MM/YYYY'
  };
  DB.set('settings', settings);

  const customers = [
    { id: 1, name: 'Amit Sharma', phone: '9871234567', email: 'amit@example.com', address: 'Patna, Bihar', gst: '', createdAt: '2026-01-10' },
    { id: 2, name: 'Priya Enterprises', phone: '9812345678', email: 'priya@biz.com', address: 'Gaya, Bihar', gst: '10AABCU9603R1Z2', createdAt: '2026-01-15' },
    { id: 3, name: 'Sunrise School', phone: '9834567890', email: 'sunrise@school.in', address: 'Nalanda, Bihar', gst: '', createdAt: '2026-01-20' },
    { id: 4, name: 'Rohan Traders', phone: '9823456789', email: 'rohan@traders.com', address: 'Muzaffarpur, Bihar', gst: '10AABCU9603R1Z3', createdAt: '2026-02-01' },
    { id: 5, name: 'City Hospital', phone: '9845678901', email: 'admin@cityhospital.in', address: 'Patna, Bihar', gst: '10AABCU9603R1Z4', createdAt: '2026-02-10' },
  ];
  DB.set('customers', customers);

  const orders = [
    { id: 1, customerId: 1, customerName: 'Amit Sharma', jobType: 'Business Cards', qty: 500, paperType: '350 GSM Art', size: '3.5x2 inch', color: '4C+4C', instructions: 'Rounded corners, matte lamination', deadline: '2026-02-20', status: 'Delivered', assignedTo: 'Rahul', amount: 1200, createdAt: '2026-02-10' },
    { id: 2, customerId: 2, customerName: 'Priya Enterprises', jobType: 'Pamphlets', qty: 2000, paperType: '130 GSM Art', size: 'A4', color: '4C+0', instructions: 'Tri-fold', deadline: '2026-02-25', status: 'Delivered', assignedTo: 'Suresh', amount: 5400, createdAt: '2026-02-12' },
    { id: 3, customerId: 3, customerName: 'Sunrise School', jobType: 'Books', qty: 300, paperType: '70 GSM Maplitho', size: 'A5', color: '1C+1C', instructions: 'Perfect binding, 80 pages each', deadline: '2026-03-05', status: 'In Progress', assignedTo: 'Rahul', amount: 28000, createdAt: '2026-02-18' },
    { id: 4, customerId: 4, customerName: 'Rohan Traders', jobType: 'Banners', qty: 10, paperType: 'Flex', size: '4x3 feet', color: '4C+0', instructions: 'Eyelet holes on edges', deadline: '2026-03-01', status: 'Ready', assignedTo: 'Suresh', amount: 3500, createdAt: '2026-02-20' },
    { id: 5, customerId: 1, customerName: 'Amit Sharma', jobType: 'Letterhead', qty: 1000, paperType: '90 GSM Bond', size: 'A4', color: '2C+0', instructions: '', deadline: '2026-03-10', status: 'Pending', assignedTo: 'Rahul', amount: 2200, createdAt: '2026-02-26' },
    { id: 6, customerId: 5, customerName: 'City Hospital', jobType: 'Prescription Pads', qty: 5000, paperType: '60 GSM Maplitho', size: 'A5', color: '2C+0', instructions: 'Sequential numbering required', deadline: '2026-03-08', status: 'In Progress', assignedTo: 'Suresh', amount: 9800, createdAt: '2026-02-27' },
    { id: 7, customerId: 2, customerName: 'Priya Enterprises', jobType: 'Visiting Cards', qty: 250, paperType: '300 GSM Ivory', size: '3.5x2 inch', color: '4C+4C', instructions: 'UV spot on logo', deadline: '2026-02-28', status: 'Pending', assignedTo: 'Rahul', amount: 950, createdAt: '2026-02-28' },
  ];
  DB.set('orders', orders);

  const inventory = [
    { id: 1, name: 'Art Paper 130 GSM', category: 'Paper', qty: 850, unit: 'Sheets', reorderLevel: 200, costPerUnit: 2.5, createdAt: '2026-01-01' },
    { id: 2, name: 'Art Paper 350 GSM', category: 'Paper', qty: 120, unit: 'Sheets', reorderLevel: 150, costPerUnit: 6, createdAt: '2026-01-01' },
    { id: 3, name: 'Maplitho 70 GSM', category: 'Paper', qty: 2000, unit: 'Sheets', reorderLevel: 500, costPerUnit: 1.2, createdAt: '2026-01-01' },
    { id: 4, name: 'Bond Paper 90 GSM', category: 'Paper', qty: 500, unit: 'Sheets', reorderLevel: 200, costPerUnit: 1.8, createdAt: '2026-01-01' },
    { id: 5, name: 'Cyan Ink', category: 'Ink', qty: 3, unit: 'Litres', reorderLevel: 2, costPerUnit: 1200, createdAt: '2026-01-01' },
    { id: 6, name: 'Magenta Ink', category: 'Ink', qty: 2.5, unit: 'Litres', reorderLevel: 2, costPerUnit: 1200, createdAt: '2026-01-01' },
    { id: 7, name: 'Yellow Ink', category: 'Ink', qty: 3.2, unit: 'Litres', reorderLevel: 2, costPerUnit: 1200, createdAt: '2026-01-01' },
    { id: 8, name: 'Black Ink', category: 'Ink', qty: 1.5, unit: 'Litres', reorderLevel: 2, costPerUnit: 900, createdAt: '2026-01-01' },
    { id: 9, name: 'Matte Lamination Film', category: 'Finishing', qty: 15, unit: 'Rolls', reorderLevel: 5, costPerUnit: 450, createdAt: '2026-01-01' },
    { id: 10, name: 'Flex Material', category: 'Printing Material', qty: 80, unit: 'Sq.ft', reorderLevel: 30, costPerUnit: 18, createdAt: '2026-01-01' },
    { id: 11, name: 'Spiral Binding Wire', category: 'Binding', qty: 40, unit: 'Spools', reorderLevel: 10, costPerUnit: 120, createdAt: '2026-01-01' },
    { id: 12, name: 'PVA Glue', category: 'Binding', qty: 4, unit: 'Litres', reorderLevel: 5, costPerUnit: 300, createdAt: '2026-01-01' },
  ];
  DB.set('inventory', inventory);

  const invoices = [
    { id: 1, orderId: 1, customerName: 'Amit Sharma', items: [{ desc: 'Business Cards 500 pcs', qty: 1, rate: 1200, tax: 18 }], subtotal: 1200, tax: 216, total: 1416, status: 'Paid', createdAt: '2026-02-21' },
    { id: 2, orderId: 2, customerName: 'Priya Enterprises', items: [{ desc: 'Pamphlets A4 Tri-fold 2000 pcs', qty: 1, rate: 5400, tax: 18 }], subtotal: 5400, tax: 972, total: 6372, status: 'Paid', createdAt: '2026-02-26' },
    { id: 3, orderId: 4, customerName: 'Rohan Traders', items: [{ desc: 'Flex Banners 4x3 feet x10', qty: 1, rate: 3500, tax: 18 }], subtotal: 3500, tax: 630, total: 4130, status: 'Unpaid', createdAt: '2026-02-28' },
  ];
  DB.set('invoices', invoices);

  localStorage.setItem('pp_seeded', '1');
}

// ──────────────────────────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────────────────────────
function initNav() {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  // Always start expanded — no localStorage persistence

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      toggleBtn.innerHTML = sidebar.classList.contains('collapsed')
        ? '<span>&#9776;</span>'
        : '<span>&#9776;</span><span>Collapse</span>';
    });
  }


  const sidemenu = document.querySelector('.sidebar-nav');
  if (sidemenu && !document.getElementById('logoutBtn')) {
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.id = 'logoutBtn';
    logoutLink.className = 'nav-item';
    logoutLink.style.marginTop = '20px';
    logoutLink.style.color = 'var(--danger)';
    logoutLink.innerHTML = '<span class="nav-icon">🚪</span><span class="nav-label">Logout</span>';
    logoutLink.onclick = (e) => { e.preventDefault(); logout(); };
    sidemenu.appendChild(logoutLink);
  }

  // Active item
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.page === current) el.classList.add('active');
  });

  // Low stock badge
  const inv = DB.get('inventory');
  const lowCount = inv.filter(i => i.qty <= i.reorderLevel).length;
  const badge = document.getElementById('invBadge');
  if (badge) { badge.textContent = lowCount; badge.style.display = lowCount ? '' : 'none'; }

  // Enquiries badge
  try {
    const enqs = JSON.parse(localStorage.getItem('pp_enquiries') || '[]');
    const newEnqCount = enqs.filter(e => e.status === 'New').length;
    const enqBadge = document.getElementById('enqBadge');
    if (enqBadge) { enqBadge.textContent = newEnqCount; enqBadge.style.display = newEnqCount ? '' : 'none'; }
  } catch (e) { }

  // Date
  const dateEl = document.getElementById('todayDate');
  if (dateEl) {
    const d = new Date();
    dateEl.textContent = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

// ──────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'success', dur = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = 'none'; el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, dur);
}

// ──────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ──────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
  if (e.target.classList.contains('modal-close')) {
    e.target.closest('.modal-overlay').classList.remove('open');
  }
});

// ──────────────────────────────────────────────────────────────────
// FORMAT HELPERS
// ──────────────────────────────────────────────────────────────────
function currency(val) {
  const s = DB.getOne('settings');
  return (s.currency || '₹') + Number(val).toLocaleString('en-IN');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN');
}

function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'In Progress': 'badge-progress',
    'Ready': 'badge-ready',
    'Delivered': 'badge-delivered',
    'Paid': 'badge-paid',
    'Unpaid': 'badge-unpaid',
    'Partial': 'badge-partial',
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

// ──────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────
window.onDataLoaded = function (cb) {
  if (dbLoaded) cb();
  else document.addEventListener('db-loaded', cb);
};

document.addEventListener('DOMContentLoaded', () => {
  loadSupabaseData().then(() => {
    initNav();
  });
});

