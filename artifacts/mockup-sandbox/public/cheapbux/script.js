/* CheapBux — script.js  (ES Module)
   Orders → Firebase Firestore
   Accounts & sessions → localStorage
   GitHub Pages compatible
------------------------------------------------ */
import {
  db, collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc, writeBatch
} from './firebase.js';

/* ══════════════════════════════
   CONSTANTS
══════════════════════════════ */
const RATE        = 10;
const ADMIN_PASS  = 'cheapbux2024';
const ORDERS_COL  = 'orders';
const KEY_ACCTS   = 'cbx_accounts';
const KEY_SESS    = 'cbx_session';
const BASE_ORDERS = 50;
const BASE_ROBUX  = 5000;

/* ══════════════════════════════
   STATE
══════════════════════════════ */
let ttd       = 0;
let payMethod = 'cash';
let adminOk   = false;
let curFilter = 'all';

/* ══════════════════════════════
   FIRESTORE — ORDERS CRUD
══════════════════════════════ */

/** Load all orders from Firestore, newest first */
async function loadOrders() {
  try {
    const snap = await getDocs(collection(db, ORDERS_COL));
    const list = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    list.sort((a, b) => (b.orderNum || 0) - (a.orderNum || 0));
    return list;
  } catch (e) {
    console.error('loadOrders:', e);
    showToast('⚠️ Could not load orders — check your connection');
    return [];
  }
}

/** Add a new order document; returns the new docId */
async function addOrderFS(order) {
  const ref = await addDoc(collection(db, ORDERS_COL), order);
  return ref.id;
}

/** Update a single order field(s) */
async function updateOrderFS(docId, fields) {
  await updateDoc(doc(db, ORDERS_COL, docId), fields);
}

/** Delete a single order */
async function deleteOrderFS(docId) {
  await deleteDoc(doc(db, ORDERS_COL, docId));
}

/** Delete ALL orders (batch) */
async function deleteAllOrdersFS() {
  const snap  = await getDocs(collection(db, ORDERS_COL));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

/* ══════════════════════════════
   INIT
══════════════════════════════ */
async function init() {
  onSlide(0);
  refreshSession();
  await updateHeroStats();
}
init();

/* ══════════════════════════════
   CALCULATOR
══════════════════════════════ */
function onSlide(v) {
  ttd = Number(v);
  const pct = ttd;
  const sl  = document.getElementById('slider');
  sl.style.background =
    `linear-gradient(to right,#ffd700 ${pct}%,rgba(255,255,255,.1) ${pct}%)`;

  document.getElementById('amtPill').textContent = '$' + ttd;

  const robux = ttd * RATE;
  document.getElementById('rnum').textContent  = robux.toLocaleString();
  document.getElementById('rhint').textContent = ttd
    ? `${robux.toLocaleString()} R$ → @${getSession()||'you'} · $${ttd} TTD`
    : 'Select an amount above';
  const stripTTD = document.getElementById('stripTTD');
  if (stripTTD) stripTTD.textContent = ttd ? `$${ttd} TTD` : '—';

  markPick(ttd);
}

function snap(v) {
  const max = (payMethod === 'favor' || payMethod === 'loan') ? 1 : 100;
  v = Math.min(v, max);
  document.getElementById('slider').value = v;
  onSlide(v);
}

function markPick(v) {
  document.querySelectorAll('.pick').forEach(b => {
    const bv  = parseInt(b.textContent);
    const max = (payMethod === 'favor' || payMethod === 'loan') ? 1 : 100;
    b.classList.toggle('on', bv === v);
    b.disabled = bv > max;
  });
}

/* ══════════════════════════════
   PAYMENT METHOD
══════════════════════════════ */
function onPayChange(method) {
  payMethod = method;
  const limited = (method === 'favor' || method === 'loan');
  const note    = document.getElementById('payNote');
  const slider  = document.getElementById('slider');

  note.classList.toggle('hidden', !limited);
  slider.max = limited ? 1 : 100;

  if (limited && ttd > 1) {
    slider.value = 1;
    onSlide(1);
  } else {
    onSlide(ttd);
  }
  markPick(ttd);
}

/* ══════════════════════════════
   ORDER — Place
══════════════════════════════ */
async function placeOrder() {
  if (!getSession()) {
    showToast('🔒 Please log in to place an order');
    openAuth('login');
    return;
  }

  const user = getSession();
  if (!ttd)      return showToast('⚠️ Choose an amount first');
  if (!payMethod) return showToast('⚠️ Select a payment method');

  const limited = (payMethod === 'favor' || payMethod === 'loan');
  if (limited && ttd > 1) return showToast('⚠️ Favor & Loan max is $1 TTD');

  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.querySelector('.btn-order-txt').textContent = '⏳ Placing…';

  try {
    const existing = await loadOrders();
    const orderNum = BASE_ORDERS + existing.length + 1;

    const order = {
      orderNum,
      username:    user,
      accountUser: user,
      ttd,
      robux:       ttd * RATE,
      payment:     payMethod,
      status:      'Pending',
      createdAt:   new Date().toISOString()
    };

    await addOrderFS(order);
    await updateHeroStats();
    showToast(`✅ Order #${orderNum} placed! ${order.robux.toLocaleString()} R$ coming your way`);
    snap(0);
  } catch (e) {
    console.error('placeOrder:', e);
    showToast('❌ Failed to place order — check your connection');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-order-shine"></span><span class="btn-order-txt">🛒 &nbsp;Place Order</span>';
  }
}

/* ══════════════════════════════
   ACCOUNTS — localStorage
══════════════════════════════ */
function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(KEY_ACCTS)) || {}; } catch { return {}; }
}
function saveAccounts(a) { localStorage.setItem(KEY_ACCTS, JSON.stringify(a)); }

function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY_SESS))?.username || null; } catch { return null; }
}
function setSession(u) { localStorage.setItem(KEY_SESS, JSON.stringify({ username: u })); }
function clearSession()  { localStorage.removeItem(KEY_SESS); }

function hashPass(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h.toString(36);
}

/* ── Session UI ── */
function refreshSession() {
  const u = getSession();
  document.getElementById('guestNav').classList.toggle('hidden', !!u);
  document.getElementById('userNav').classList.toggle('hidden',  !u);
  const orderBtn  = document.getElementById('orderBtn');
  const userField = document.getElementById('userFieldWrap');

  if (u) {
    document.getElementById('hdrUser').textContent    = '@' + u;
    document.getElementById('robloxUser').value       = u;
    document.getElementById('loginNote').textContent  = '✔ Ordering as @' + u;
    if (userField) userField.classList.add('hidden');
    if (orderBtn) {
      orderBtn.classList.remove('btn-order--locked');
      orderBtn.innerHTML = '<span class="btn-order-shine"></span><span class="btn-order-txt">🛒 &nbsp;Place Order</span>';
    }
  } else {
    document.getElementById('robloxUser').value      = '';
    document.getElementById('loginNote').textContent = '';
    if (userField) userField.classList.remove('hidden');
    if (orderBtn) {
      orderBtn.classList.add('btn-order--locked');
      orderBtn.innerHTML = '<span class="btn-order-txt">🔒 &nbsp;Login to Place Order</span>';
    }
  }
}

function logout() {
  clearSession();
  refreshSession();
  showToast('👋 Logged out');
}

/* ── Auth modal ── */
function openAuth(tab) {
  switchTab(tab);
  clearAuthErr();
  openOverlay('authModal');
}

function switchTab(t) {
  document.getElementById('formLogin').classList.toggle('hidden',  t !== 'login');
  document.getElementById('formSignup').classList.toggle('hidden', t !== 'signup');
  document.getElementById('tab-login').classList.toggle('active',  t === 'login');
  document.getElementById('tab-signup').classList.toggle('active', t === 'signup');
  clearAuthErr();
}

function doSignup() {
  const u = document.getElementById('suUser').value.trim();
  const p = document.getElementById('suPass').value;
  if (!u) return showAuthErr('Enter a Roblox username');
  if (p.length < 4) return showAuthErr('Password must be at least 4 characters');

  const accounts = loadAccounts();
  if (accounts[u.toLowerCase()]) return showAuthErr('That username is already registered');

  accounts[u.toLowerCase()] = { username: u, hash: hashPass(p), createdAt: new Date().toISOString() };
  saveAccounts(accounts);
  setSession(u);
  refreshSession();
  closeOverlay('authModal');
  showToast('🎉 Account created! Welcome, @' + u);
}

function doLogin() {
  const u = document.getElementById('liUser').value.trim();
  const p = document.getElementById('liPass').value;
  if (!u || !p) return showAuthErr('Fill in all fields');

  const accounts = loadAccounts();
  const acc      = accounts[u.toLowerCase()];
  if (!acc)                       return showAuthErr('Username not found');
  if (acc.hash !== hashPass(p))   return showAuthErr('Wrong password');

  setSession(acc.username);
  refreshSession();
  closeOverlay('authModal');
  showToast('✅ Welcome back, @' + acc.username + '!');
}

function showAuthErr(msg) {
  const el = document.getElementById('authErr');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearAuthErr() {
  document.getElementById('authErr').classList.add('hidden');
}

/* ══════════════════════════════
   MY ORDERS
══════════════════════════════ */
async function openMyOrders() {
  openOverlay('myOrdersModal');
  await renderMyOrders();
}

async function renderMyOrders() {
  const u  = getSession();
  const el = document.getElementById('myOrdersBody');
  el.innerHTML = loadingSpinner();

  const all = await loadOrders();
  const my  = u
    ? all.filter(o => (o.accountUser || '').toLowerCase() === u.toLowerCase()
                   || o.username.toLowerCase() === u.toLowerCase())
    : all;

  el.innerHTML = my.length
    ? my.map((o, i) => orderCard(o, false, i + 1)).join('')
    : emptyState('📦', 'No orders yet — place your first order!');
}

/* ══════════════════════════════
   ADMIN
══════════════════════════════ */
function openAdmin() {
  if (!adminOk) {
    document.getElementById('adminGate').classList.remove('hidden');
    document.getElementById('adminDash').classList.add('hidden');
    document.getElementById('adminPassInp').value = '';
  } else {
    refreshAdminDash();
  }
  openOverlay('adminModal');
}

function checkAdminPass() {
  if (document.getElementById('adminPassInp').value !== ADMIN_PASS)
    return showToast('❌ Wrong admin password');
  adminOk = true;
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('adminDash').classList.remove('hidden');
  refreshAdminDash();
}

async function refreshAdminDash() {
  await updateAdminStats();
  await renderAdminOrders(curFilter);
}

async function updateAdminStats() {
  const list = await loadOrders();
  document.getElementById('asTotalOrders').textContent = list.length;
  document.getElementById('asTotalRobux').textContent  = list.reduce((s, o) => s + (o.robux || 0), 0).toLocaleString();
  document.getElementById('asTotalTTD').textContent    = '$' + list.reduce((s, o) => s + (o.ttd || 0), 0);
  document.getElementById('asCompleted').textContent   = list.filter(o => o.status === 'Completed').length;
}

async function filterOrders(f, btn) {
  curFilter = f;
  document.querySelectorAll('.afbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await renderAdminOrders(f);
}

async function renderAdminOrders(filter) {
  const el = document.getElementById('adminOrdersBody');
  el.innerHTML = loadingSpinner();

  let list = await loadOrders();
  if (filter !== 'all') list = list.filter(o => o.status === filter);

  el.innerHTML = list.length
    ? list.map((o, i) => orderCard(o, true, i + 1)).join('')
    : emptyState('📊', filter === 'all' ? 'No orders yet' : `No ${filter} orders`);
}

/* ── Admin: set order status ── */
async function setStatus(docId, status) {
  try {
    await updateOrderFS(docId, { status });
    showToast(`Order marked as ${status}`);
    await refreshAdminDash();
    await updateHeroStats();
  } catch (e) {
    console.error('setStatus:', e);
    showToast('❌ Failed to update order');
  }
}

/* ── Admin: delete single order ── */
async function deleteOrder(docId) {
  try {
    await deleteOrderFS(docId);
    showToast('🗑 Order deleted');
    await refreshAdminDash();
    await updateHeroStats();
  } catch (e) {
    console.error('deleteOrder:', e);
    showToast('❌ Failed to delete order');
  }
}

/* ── Admin: wipe all orders ── */
async function nukeOrders() {
  if (!confirm('Delete ALL orders? This cannot be undone.')) return;
  try {
    await deleteAllOrdersFS();
    showToast('🗑 All orders cleared');
    await refreshAdminDash();
    await updateHeroStats();
  } catch (e) {
    console.error('nukeOrders:', e);
    showToast('❌ Failed to clear orders');
  }
}

/* ══════════════════════════════
   HERO STATS
══════════════════════════════ */
async function updateHeroStats() {
  try {
    const list = await loadOrders();
    document.getElementById('totalOrdersStat').textContent =
      (BASE_ORDERS + list.length) + '+';
    document.getElementById('totalRobuxStat').textContent  =
      (BASE_ROBUX + list.reduce((s, o) => s + (o.robux || 0), 0)).toLocaleString() + '+';
  } catch {
    document.getElementById('totalOrdersStat').textContent = BASE_ORDERS + '+';
    document.getElementById('totalRobuxStat').textContent  = BASE_ROBUX.toLocaleString() + '+';
  }
}

/* ══════════════════════════════
   ORDER CARD HTML
══════════════════════════════ */
function orderCard(o, isAdmin, idx) {
  const payLabels = { cash: '💵 Cash', favor: '🤝 Favor', loan: '🏦 Loan' };
  const num       = o.orderNum || idx || o.docId?.slice(0, 6) || '—';
  const dateStr   = o.createdAt
    ? new Date(o.createdAt).toLocaleString()
    : '—';

  const adminBtns = isAdmin ? `
    <div class="ocard-actions">
      ${o.status !== 'Processing' && o.status !== 'Completed' && o.status !== 'Cancelled'
        ? `<button class="aact-btn processing" onclick="window.setStatus('${o.docId}','Processing')">Mark Processing</button>` : ''}
      ${o.status !== 'Completed'
        ? `<button class="aact-btn complete"    onclick="window.setStatus('${o.docId}','Completed')">✓ Complete</button>` : ''}
      ${o.status !== 'Cancelled'
        ? `<button class="aact-btn cancel"      onclick="window.setStatus('${o.docId}','Cancelled')">✕ Cancel</button>` : ''}
      <button class="aact-btn delete" onclick="window.deleteOrder('${o.docId}')">🗑 Delete</button>
    </div>` : '';

  return `
    <div class="ocard" id="oc-${o.docId}">
      <div class="ocard-num">Order #${num}</div>
      <div class="ocard-top">
        <span class="ocard-user">@${esc(o.username)}</span>
        <span class="ocard-robux">${Number(o.robux).toLocaleString()} R$</span>
        <span class="status-badge ${o.status}">${o.status}</span>
      </div>
      <div class="ocard-meta">
        💰 $${o.ttd} TTD &nbsp;·&nbsp; ${payLabels[o.payment] || o.payment}<br>
        🕐 ${dateStr}
        ${o.accountUser ? `<br>👤 Account: @${esc(o.accountUser)}` : ''}
      </div>
      ${adminBtns}
    </div>`;
}

/* ══════════════════════════════
   MODALS & OVERLAYS
══════════════════════════════ */
function openOverlay(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════════════════════
   TOAST
══════════════════════════════ */
let tt;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 3400);
}

/* ══════════════════════════════
   UTIL
══════════════════════════════ */
function emptyState(ico, msg) {
  return `<div class="empty-state"><div class="empty-ico">${ico}</div><p>${msg}</p></div>`;
}

function loadingSpinner() {
  return `<div class="empty-state"><div class="empty-ico">⏳</div><p>Loading orders…</p></div>`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════
   KEYBOARD
══════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['authModal', 'myOrdersModal', 'adminModal'].forEach(closeOverlay);
  if (e.key === 'Enter' && document.activeElement.id === 'adminPassInp') checkAdminPass();
  if (e.key === 'Enter' && document.activeElement.id === 'liPass')       doLogin();
  if (e.key === 'Enter' && document.activeElement.id === 'suPass')       doSignup();
});

/* ══════════════════════════════
   EXPOSE TO window
   (required for onclick="" attrs in HTML
    when using type="module")
══════════════════════════════ */
Object.assign(window, {
  onSlide, snap, onPayChange,
  placeOrder,
  openAuth, switchTab, doLogin, doSignup, logout,
  openMyOrders,
  openAdmin, checkAdminPass, filterOrders, nukeOrders,
  setStatus, deleteOrder,
  openOverlay, closeOverlay
});
