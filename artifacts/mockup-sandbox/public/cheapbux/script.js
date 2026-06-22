/* CheapBux — script.js | localStorage only, GitHub Pages ready */

const RATE = 10;           // 1 TTD = 10 Robux
const KEY  = 'cbx_orders';
const PASS = 'admin123';

let ttd = 0;
let adminOk = false;

/* ── Calculator ── */
function onSlide(v) {
  ttd = Number(v);
  const pct = ttd;
  const sl  = document.getElementById('slider');
  sl.style.background = `linear-gradient(to right,#FFD700 ${pct}%,rgba(255,255,255,.12) ${pct}%)`;
  document.getElementById('amountPill').textContent = '$' + ttd;
  const robux = ttd * RATE;
  document.getElementById('robuxNum').textContent = robux.toLocaleString();
  document.getElementById('rhint').textContent = ttd
    ? `You get ${robux.toLocaleString()} Robux for $${ttd} TTD`
    : 'Move the slider to calculate';
  markPick(ttd);
}

function snap(v) {
  document.getElementById('slider').value = v;
  onSlide(v);
}

function markPick(v) {
  document.querySelectorAll('.pick').forEach(b => {
    b.classList.toggle('on', parseInt(b.textContent) === v);
  });
}

function syncUser(v) {
  document.getElementById('navUser').textContent = v ? '@' + v : '@guest';
}

/* ── Order form ── */
function resetForm() {
  ['username','email','payment'].forEach(id => {
    document.getElementById(id).value = '';
  });
  snap(0);
  syncUser('');
}

function placeOrder() {
  const u = document.getElementById('username').value.trim();
  const e = document.getElementById('email').value.trim();
  const p = document.getElementById('payment').value;
  if (!u)              return toast('⚠️ Enter your Roblox username');
  if (!e || !e.includes('@')) return toast('⚠️ Enter a valid email');
  if (!p)              return toast('⚠️ Select a payment method');
  if (!ttd)            return toast('⚠️ Choose an amount first');

  const order = {
    id: Date.now(), username: u, email: e, payment: p,
    ttd, robux: ttd * RATE, status: 'Pending',
    date: new Date().toLocaleString()
  };
  const list = load(); list.unshift(order); save(list);
  toast(`✅ Order placed! ${order.robux.toLocaleString()} R$ coming to @${u}`);
  resetForm();
}

/* ── Storage ── */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

function del(id) {
  save(load().filter(o => o.id !== id));
  renderOrders(); renderAdmin(); updateStats();
  toast('🗑️ Order deleted');
}

function nukeOrders() {
  if (!confirm('Delete ALL orders? This cannot be undone.')) return;
  save([]);
  renderOrders(); renderAdmin(); updateStats();
  toast('🗑️ All orders cleared');
}

/* ── Orders modal ── */
function openOrders() { renderOrders(); open('ordersModal'); }

function renderOrders() {
  const list = load();
  const el   = document.getElementById('ordersBody');
  el.innerHTML = list.length ? list.map(card).join('') : emptyState('📦','No orders yet');
}

/* ── Admin modal ── */
function openAdmin() {
  if (!adminOk) {
    document.getElementById('adminGate').classList.remove('hidden');
    document.getElementById('adminBoard').classList.add('hidden');
    document.getElementById('adminPass').value = '';
  }
  open('adminModal');
}

function checkPass() {
  if (document.getElementById('adminPass').value !== PASS)
    return toast('❌ Wrong password');
  adminOk = true;
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('adminBoard').classList.remove('hidden');
  updateStats(); renderAdmin();
}

function updateStats() {
  const list = load();
  document.getElementById('sOrders').textContent = list.length;
  document.getElementById('sRobux').textContent  = list.reduce((s,o) => s+o.robux,0).toLocaleString();
  document.getElementById('sTTD').textContent    = '$' + list.reduce((s,o) => s+o.ttd,0);
}

function renderAdmin() {
  const list = load();
  const el   = document.getElementById('adminBody');
  if (!el) return;
  el.innerHTML = list.length ? list.map(card).join('') : emptyState('📊','No orders in the system');
}

/* ── Card HTML ── */
function card(o) {
  const labels = {linx:'Linx',cash:'Cash',bank:'Bank Transfer',paypal:'PayPal',other:'Other'};
  return `
    <div class="ocard" id="oc-${o.id}">
      <button class="odel" onclick="del(${o.id})">✕</button>
      <div class="ocard-top">
        <span class="ocard-user">@${esc(o.username)}</span>
        <span class="ocard-robux">${Number(o.robux).toLocaleString()} R$</span>
      </div>
      <div class="ocard-meta">
        💰 $${o.ttd} TTD &nbsp;·&nbsp; 💳 ${labels[o.payment]||o.payment} &nbsp;·&nbsp; 📋 ${o.status}<br>
        📧 ${esc(o.email)}<br>🕐 ${o.date}
      </div>
    </div>`;
}

function emptyState(ico, msg) {
  return `<div class="empty"><div class="empty-ico">${ico}</div><p>${msg}</p></div>`;
}

/* ── Modal helpers ── */
function open(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Toast ── */
let tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ── Util ── */
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Keyboard ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal('ordersModal'); closeModal('adminModal'); }
  if (e.key === 'Enter' && document.activeElement.id === 'adminPass') checkPass();
});

/* ── Init ── */
onSlide(0);

/* ── Utility class ── */
document.head.insertAdjacentHTML('beforeend',`<style>.hidden{display:none!important}</style>`);
