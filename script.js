/* CheapBux — script.js
   Static site — all data in localStorage
   GitHub Pages compatible
------------------------------------------------ */

const RATE       = 10;           // 1 TTD = 10 Robux
const ADMIN_PASS = 'cheapbux2024';
const KEY_ORDERS = 'cbx_orders';
const KEY_ACCTS  = 'cbx_accounts';
const KEY_SESS   = 'cbx_session';

/* ══════════════════════════════
   STATE
══════════════════════════════ */
let ttd        = 0;
let payMethod  = 'cash';
let adminOk    = false;
let curFilter  = 'all';

/* ══════════════════════════════
   INIT
══════════════════════════════ */
(function init() {
  onSlide(0);
  refreshSession();
  updateHeroStats();
})();

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
    ? `${robux.toLocaleString()} Robux → @${getSession()} for $${ttd} TTD`
    : 'Select an amount above';

  markPick(ttd);
}

function snap(v) {
  // Clamp to $1 for favor / loan
  const max = (payMethod === 'favor' || payMethod === 'loan') ? 1 : 100;
  v = Math.min(v, max);
  document.getElementById('slider').value = v;
  onSlide(v);
}

function markPick(v) {
  document.querySelectorAll('.pick').forEach(b => {
    const bv = parseInt(b.textContent);
    b.classList.toggle('on', bv === v);
    const max = (payMethod === 'favor' || payMethod === 'loan') ? 1 : 100;
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

  // Clamp current value
  if (limited && ttd > 1) {
    slider.value = 1;
    onSlide(1);
  } else {
    onSlide(ttd);
  }

  markPick(ttd);
}

/* ══════════════════════════════
   ORDER
══════════════════════════════ */
function placeOrder() {
  // Must be logged in
  if (!getSession()) {
    showToast('🔒 Please log in or create an account to place an order');
    openAuth('login');
    return;
  }

  const user = getSession();

  if (!ttd)     return showToast('⚠️ Choose an amount first');
  if (!payMethod) return showToast('⚠️ Select a payment method');

  const limited = (payMethod === 'favor' || payMethod === 'loan');
  if (limited && ttd > 1) return showToast('⚠️ Favor & Loan max is $1 TTD');

  const order = {
    id:       Date.now(),
    username: user,
    ttd,
    robux:    ttd * RATE,
    payment:  payMethod,
    status:   'Pending',
    createdAt: new Date().toLocaleString(),
    accountUser: getSession() || null
  };

  const list = loadOrders();
  list.unshift(order);
  saveOrders(list);
  updateHeroStats();

  showToast(`✅ Order placed! ${order.robux.toLocaleString()} R$ coming your way`);
  snap(0);
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
function clearSession() { localStorage.removeItem(KEY_SESS); }

/* Simple hash — keeps passwords out of plain text */
function hashPass(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h.toString(36);
}

/* ── Session UI ── */
function refreshSession() {
  const u = getSession();
  document.getElementById('guestNav').classList.toggle('hidden', !!u);
  document.getElementById('userNav').classList.toggle('hidden', !u);
  const orderBtn  = document.getElementById('orderBtn');
  const userField = document.getElementById('userFieldWrap');

  if (u) {
    document.getElementById('hdrUser').textContent = '@' + u;
    document.getElementById('robloxUser').value    = u;
    document.getElementById('loginNote').textContent = '✔ Ordering as @' + u;
    if (userField) userField.classList.add('hidden');
    if (orderBtn) {
      orderBtn.classList.remove('btn-order--locked');
      orderBtn.innerHTML = '<span class="btn-order-shine"></span><span class="btn-order-txt">🛒 &nbsp;Place Order</span>';
    }
  } else {
    document.getElementById('robloxUser').value    = '';
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
  const acc = accounts[u.toLowerCase()];
  if (!acc) return showAuthErr('Username not found');
  if (acc.hash !== hashPass(p)) return showAuthErr('Wrong password');

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
function openMyOrders() {
  renderMyOrders();
  openOverlay('myOrdersModal');
}

function renderMyOrders() {
  const u   = getSession();
  const el  = document.getElementById('myOrdersBody');
  const all = loadOrders();
  const my  = u ? all.filter(o => o.accountUser === u || o.username.toLowerCase() === u.toLowerCase()) : all;
  el.innerHTML = my.length
    ? my.map(o => orderCard(o, false)).join('')
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

function refreshAdminDash() {
  updateAdminStats();
  renderAdminOrders(curFilter);
}

function updateAdminStats() {
  const list = loadOrders();
  document.getElementById('asTotalOrders').textContent = list.length;
  document.getElementById('asTotalRobux').textContent  = list.reduce((s,o)=>s+o.robux,0).toLocaleString();
  document.getElementById('asTotalTTD').textContent    = '$' + list.reduce((s,o)=>s+o.ttd,0);
  document.getElementById('asCompleted').textContent   = list.filter(o=>o.status==='Completed').length;
}

function filterOrders(f, btn) {
  curFilter = f;
  document.querySelectorAll('.afbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderAdminOrders(f);
}

function renderAdminOrders(filter) {
  const el   = document.getElementById('adminOrdersBody');
  let list   = loadOrders();
  if (filter !== 'all') list = list.filter(o => o.status === filter);
  el.innerHTML = list.length
    ? list.map(o => orderCard(o, true)).join('')
    : emptyState('📊', filter === 'all' ? 'No orders yet' : `No ${filter} orders`);
}

/* Change order status (admin) */
function setStatus(id, status) {
  const list = loadOrders();
  const idx  = list.findIndex(o => o.id === id);
  if (idx === -1) return;
  list[idx].status = status;
  saveOrders(list);
  refreshAdminDash();
  updateHeroStats();
  showToast(`Order marked as ${status}`);
}

function deleteOrder(id) {
  saveOrders(loadOrders().filter(o => o.id !== id));
  refreshAdminDash();
  updateHeroStats();
  showToast('🗑 Order deleted');
}

function nukeOrders() {
  if (!confirm('Delete ALL orders? This cannot be undone.')) return;
  saveOrders([]);
  refreshAdminDash();
  updateHeroStats();
  showToast('🗑 All orders cleared');
}

/* ══════════════════════════════
   HERO STATS
══════════════════════════════ */
function updateHeroStats() {
  const list = loadOrders();
  document.getElementById('totalOrdersStat').textContent = list.length;
  document.getElementById('totalRobuxStat').textContent  =
    list.reduce((s,o)=>s+o.robux,0).toLocaleString() + '+';
}

/* ══════════════════════════════
   STORAGE
══════════════════════════════ */
function loadOrders() {
  try { return JSON.parse(localStorage.getItem(KEY_ORDERS)) || []; } catch { return []; }
}
function saveOrders(list) { localStorage.setItem(KEY_ORDERS, JSON.stringify(list)); }

/* ══════════════════════════════
   ORDER CARD HTML
══════════════════════════════ */
function orderCard(o, isAdmin) {
  const payLabels = { cash:'💵 Cash', favor:'🤝 Favor', loan:'🏦 Loan' };
  const adminBtns = isAdmin ? `
    <div class="ocard-actions">
      ${o.status!=='Processing' && o.status!=='Completed' && o.status!=='Cancelled'
        ? `<button class="aact-btn processing" onclick="setStatus(${o.id},'Processing')">Mark Processing</button>` : ''}
      ${o.status!=='Completed'
        ? `<button class="aact-btn complete" onclick="setStatus(${o.id},'Completed')">✓ Complete</button>` : ''}
      ${o.status!=='Cancelled'
        ? `<button class="aact-btn cancel" onclick="setStatus(${o.id},'Cancelled')">✕ Cancel</button>` : ''}
      <button class="aact-btn delete" onclick="deleteOrder(${o.id})">🗑 Delete</button>
    </div>` : '';

  return `
    <div class="ocard" id="oc-${o.id}">
      <div class="ocard-num">Order #${o.id}</div>
      <div class="ocard-top">
        <span class="ocard-user">@${esc(o.username)}</span>
        <span class="ocard-robux">${Number(o.robux).toLocaleString()} R$</span>
        <span class="status-badge ${o.status}">${o.status}</span>
      </div>
      <div class="ocard-meta">
        💰 $${o.ttd} TTD &nbsp;·&nbsp; ${payLabels[o.payment]||o.payment}<br>
        🕐 ${o.createdAt}
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
  tt = setTimeout(()=>el.classList.remove('show'), 3400);
}

/* ══════════════════════════════
   UTIL
══════════════════════════════ */
function emptyState(ico, msg) {
  return `<div class="empty-state"><div class="empty-ico">${ico}</div><p>${msg}</p></div>`;
}

function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════
   KEYBOARD
══════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    ['authModal','myOrdersModal','adminModal'].forEach(closeOverlay);
  }
  if (e.key==='Enter' && document.activeElement.id==='adminPassInp') checkAdminPass();
  if (e.key==='Enter' && document.activeElement.id==='liPass')       doLogin();
  if (e.key==='Enter' && document.activeElement.id==='suPass')       doSignup();
});
