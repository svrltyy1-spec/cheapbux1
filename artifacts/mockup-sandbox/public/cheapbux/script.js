/* ═══════════════════════════════════════════
   CHEAPBUX – script.js
   All logic: calculator, orders, admin panel
   Uses localStorage only – works on GitHub Pages
═══════════════════════════════════════════ */

/* ──────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────── */
const ROBUX_RATE   = 10;        // 1 TTD = 10 Robux
const STORAGE_KEY  = 'cheapbux_orders';
const ADMIN_PASS   = 'admin123';

/* ──────────────────────────────────────────
   CALCULATOR STATE
────────────────────────────────────────── */
let currentTTD = 0;  // currently selected TTD amount

/**
 * Called whenever the slider moves.
 * Updates the displayed TTD amount, Robux amount, and slider fill colour.
 * @param {number|string} value – the new slider value
 */
function updateCalculator(value) {
  currentTTD = Number(value);

  // Update slider visual fill
  const slider = document.getElementById('ttdSlider');
  const percent = (currentTTD / 100) * 100;
  slider.style.background = `linear-gradient(to right, #f5c800 ${percent}%, #ddd ${percent}%)`;

  // Update TTD badge
  document.getElementById('amountBadge').textContent = '$' + currentTTD;

  // Calculate Robux
  const robux = currentTTD * ROBUX_RATE;
  document.getElementById('robuxAmount').textContent = robux.toLocaleString();

  // Update helper message
  const msg = document.getElementById('resultMsg');
  if (currentTTD === 0) {
    msg.textContent = 'Move the slider to see how much Robux you\'ll get!';
  } else {
    msg.textContent =
      `You'll receive ${robux.toLocaleString()} Robux for $${currentTTD} TTD — fast & easy!`;
  }

  // Highlight matching quick button
  highlightQuickBtn(currentTTD);
}

/**
 * Set the slider (and calculator) to a specific TTD value.
 * Called by the quick-pick buttons.
 * @param {number} amount
 */
function setAmount(amount) {
  const slider = document.getElementById('ttdSlider');
  slider.value = amount;
  updateCalculator(amount);
}

/**
 * Visually highlight the matching quick-pick button.
 * @param {number} amount
 */
function highlightQuickBtn(amount) {
  document.querySelectorAll('.quick-btn').forEach(btn => {
    const btnVal = parseInt(btn.textContent.replace('$', ''));
    btn.classList.toggle('active', btnVal === amount);
  });
}

/* ──────────────────────────────────────────
   USERNAME DISPLAY
────────────────────────────────────────── */

/**
 * Update the header username display as the user types their Roblox username.
 * @param {string} value
 */
function updateUsernameDisplay(value) {
  const display = document.getElementById('usernameDisplay');
  display.textContent = value ? '@' + value : '@guest';
}

/* ──────────────────────────────────────────
   ORDER FORM
────────────────────────────────────────── */

/**
 * Clears all form fields and resets the calculator.
 */
function clearForm() {
  document.getElementById('robloxUsername').value = '';
  document.getElementById('emailInput').value     = '';
  document.getElementById('paymentMethod').value  = '';
  document.getElementById('orderNotes').value     = '';
  setAmount(0);
  updateUsernameDisplay('');
}

/**
 * Validates the form and saves an order to localStorage.
 */
function submitOrder() {
  const username = document.getElementById('robloxUsername').value.trim();
  const email    = document.getElementById('emailInput').value.trim();
  const payment  = document.getElementById('paymentMethod').value;

  // Basic validation
  if (!username) {
    showToast('⚠️ Please enter your Roblox username.');
    document.getElementById('robloxUsername').focus();
    return;
  }

  if (!email || !email.includes('@')) {
    showToast('⚠️ Please enter a valid email address.');
    document.getElementById('emailInput').focus();
    return;
  }

  if (!payment) {
    showToast('⚠️ Please select a payment method.');
    document.getElementById('paymentMethod').focus();
    return;
  }

  if (currentTTD === 0) {
    showToast('⚠️ Please select an amount using the slider.');
    return;
  }

  // Build the order object
  const order = {
    id:        Date.now(),                          // unique ID
    username:  username,
    email:     email,
    payment:   payment,
    notes:     document.getElementById('orderNotes').value.trim(),
    ttd:       currentTTD,
    robux:     currentTTD * ROBUX_RATE,
    status:    'Pending',
    createdAt: new Date().toLocaleString()
  };

  // Save to localStorage
  saveOrder(order);

  // Feedback
  showToast(`✅ Order placed! ${order.robux.toLocaleString()} Robux ordered for @${username}`);

  // Reset form
  clearForm();
}

/* ──────────────────────────────────────────
   LOCALSTORAGE – ORDER PERSISTENCE
────────────────────────────────────────── */

/**
 * Load all orders from localStorage.
 * @returns {Array} array of order objects
 */
function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Persist the full orders array to localStorage.
 * @param {Array} orders
 */
function persistOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

/**
 * Append a single order to the stored list.
 * @param {Object} order
 */
function saveOrder(order) {
  const orders = loadOrders();
  orders.unshift(order);    // newest first
  persistOrders(orders);
}

/**
 * Delete an order by its unique ID.
 * @param {number} id
 */
function deleteOrder(id) {
  const orders = loadOrders().filter(o => o.id !== id);
  persistOrders(orders);
}

/* ──────────────────────────────────────────
   ORDERS MODAL
────────────────────────────────────────── */

/**
 * Open the My Orders modal and render saved orders.
 */
function openOrders() {
  renderOrders();
  openModal('ordersModal');
}

/**
 * Render all orders into the Orders modal body.
 */
function renderOrders() {
  const body   = document.getElementById('ordersBody');
  const orders = loadOrders();

  if (orders.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No orders yet. Place your first order!</p>
      </div>`;
    return;
  }

  body.innerHTML = orders.map(order => buildOrderCard(order, true)).join('');
}

/**
 * Build the HTML string for a single order card.
 * @param {Object} order
 * @param {boolean} showDelete – whether to show the delete button
 * @returns {string} HTML
 */
function buildOrderCard(order, showDelete) {
  const deleteBtn = showDelete
    ? `<button class="order-card-delete" onclick="removeOrder(${order.id})">✕ Delete</button>`
    : '';

  const paymentLabel = {
    'linx': 'Linx',
    'cash': 'Cash',
    'bank-transfer': 'Bank Transfer',
    'paypal': 'PayPal',
    'other': 'Other'
  }[order.payment] || order.payment;

  return `
    <div class="order-card" id="order-${order.id}">
      ${deleteBtn}
      <div class="order-card-header">
        <span class="order-card-username">@${escapeHtml(order.username)}</span>
        <span class="order-card-robux">${Number(order.robux).toLocaleString()} R$</span>
      </div>
      <div class="order-card-meta">
        💰 $${order.ttd} TTD &nbsp;·&nbsp;
        💳 ${paymentLabel} &nbsp;·&nbsp;
        📋 ${order.status}<br>
        📧 ${escapeHtml(order.email)}<br>
        🕐 ${order.createdAt}
        ${order.notes ? `<br>📝 ${escapeHtml(order.notes)}` : ''}
      </div>
    </div>`;
}

/**
 * Delete an order and refresh both modals.
 * @param {number} id
 */
function removeOrder(id) {
  deleteOrder(id);
  renderOrders();    // refresh Orders modal
  // Also refresh admin if it's open
  if (document.getElementById('adminModal').classList.contains('open')) {
    renderAdminOrders();
    updateAdminStats();
  }
  showToast('🗑️ Order deleted.');
}

/* ──────────────────────────────────────────
   ADMIN PANEL
────────────────────────────────────────── */
let adminUnlocked = false;  // track whether the password has been accepted

/**
 * Open the Admin modal (always shows gate first unless already unlocked).
 */
function openAdmin() {
  if (!adminUnlocked) {
    // Reset gate visibility
    document.getElementById('adminGate').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
  }
  openModal('adminModal');
}

/**
 * Check the admin password.
 */
function checkAdminPassword() {
  const input = document.getElementById('adminPassword').value;

  if (input === ADMIN_PASS) {
    adminUnlocked = true;
    document.getElementById('adminGate').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    updateAdminStats();
    renderAdminOrders();
  } else {
    showToast('❌ Incorrect password. Try: admin123');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
  }
}

/**
 * Update the admin stats cards with live order data.
 */
function updateAdminStats() {
  const orders    = loadOrders();
  const totalRobux = orders.reduce((sum, o) => sum + Number(o.robux), 0);
  const totalTTD   = orders.reduce((sum, o) => sum + Number(o.ttd), 0);

  document.getElementById('statOrders').textContent = orders.length;
  document.getElementById('statRobux').textContent  = totalRobux.toLocaleString();
  document.getElementById('statTTD').textContent    = '$' + totalTTD;
}

/**
 * Render orders in the admin modal (with delete buttons, same as user view).
 */
function renderAdminOrders() {
  const body   = document.getElementById('adminOrdersBody');
  const orders = loadOrders();

  if (orders.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No orders in the system yet.</p>
      </div>`;
    return;
  }

  body.innerHTML = orders.map(order => buildOrderCard(order, true)).join('');
}

/**
 * Clear ALL orders from localStorage (admin action).
 */
function clearAllOrders() {
  if (!confirm('Are you sure you want to delete ALL orders? This cannot be undone.')) return;
  persistOrders([]);
  renderAdminOrders();
  updateAdminStats();
  showToast('🗑️ All orders cleared.');
}

/* ──────────────────────────────────────────
   MODAL HELPERS
────────────────────────────────────────── */

/**
 * Open a modal by its element ID.
 * @param {string} id
 */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';  // prevent background scroll
}

/**
 * Close a modal by its element ID.
 * @param {string} id
 */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* ──────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────── */
let toastTimer = null;

/**
 * Show a brief toast notification at the bottom of the screen.
 * @param {string} message
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  // Clear any existing timer
  if (toastTimer) clearTimeout(toastTimer);

  // Auto-hide after 3 seconds
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ──────────────────────────────────────────
   UTILITY
────────────────────────────────────────── */

/**
 * Escape HTML special characters to prevent XSS from user-entered data.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* ──────────────────────────────────────────
   KEYBOARD SHORTCUTS
────────────────────────────────────────── */
document.addEventListener('keydown', function (e) {
  // Escape closes any open modal
  if (e.key === 'Escape') {
    closeModal('ordersModal');
    closeModal('adminModal');
  }

  // Enter in admin password field → check password
  if (e.key === 'Enter' && document.activeElement.id === 'adminPassword') {
    checkAdminPassword();
  }
});

/* ──────────────────────────────────────────
   INIT – runs when the page loads
────────────────────────────────────────── */
(function init() {
  // Ensure slider starts at 0 with correct fill
  updateCalculator(0);
})();
