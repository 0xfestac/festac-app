const API = "https://festac-app0x.onrender.com";

const API = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://festac-app0x.onrender.com";

function saveToken(token) { localStorage.setItem("token", token); }
function getToken() { return localStorage.getItem("token"); }
function getInput(id) { return document.getElementById(id)?.value; }

function setLoading(on) {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.toggle("show", on);
  document.body.style.pointerEvents = on ? "none" : "";
}

function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast show" + (type !== "default" ? " " + type : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = "toast"; }, 3000);
}

// ── Login ──
async function login() {
  const email = getInput("email");
  const password = getInput("password");
  if (!email || !password) return showToast("Fill in all fields", "error");
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (data.token) {
      saveToken(data.token);
      window.location = "dashboard.html";
    } else {
      showToast(data.message || "Login failed", "error");
    }
  } catch (err) {
    setLoading(false);
    showToast("Connection error", "error");
  }
}

// ── Register ──
async function register() {
  const email = getInput("email");
  const password = getInput("password");
  if (!email || !password) return showToast("Fill in all fields", "error");
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (res.ok) {
      showToast("Account created!", "success");
      setTimeout(() => window.location = "index.html", 1200);
    } else {
      const data = await res.json();
      showToast(data.message || "Registration failed", "error");
    }
  } catch (err) {
    setLoading(false);
    showToast("Registration failed", "error");
  }
}

// ── Balance ──
async function loadBalance() {
  try {
    const res = await fetch(`${API}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    const el = document.getElementById("balance");
    if (el) el.textContent = parseFloat(data.balance).toFixed(2);
  } catch (err) {
    console.log("Balance error");
  }
}

// ── PIN Modal ──
function openPinModal() {
  const toEmail = getInput("toEmail");
  const amount = getInput("amount");
  if (!toEmail || !amount) return showToast("Fill in all fields", "error");
  document.getElementById("pinModal").classList.add("open");
}

function closeModal() {
  document.getElementById("pinModal").classList.remove("open");
}

// ── Send Money ──
async function confirmSend() {
  const toEmail = getInput("toEmail");
  const amount = getInput("amount");
  const pin = getInput("pinInput");
  if (!toEmail || !amount || !pin) return showToast("All fields required", "error");
  try {
    const res = await fetch(`${API}/api/wallet/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ toEmail, amount, pin })
    });
    const msg = await res.text();
    if (res.ok) {
      showToast("Transfer successful!", "success");
      closeModal();
      setTimeout(() => window.location = "dashboard.html", 1500);
    } else {
      showToast(msg || "Transfer failed", "error");
    }
  } catch (err) {
    showToast("Transfer failed", "error");
  }
}

// ── Transactions ──
async function loadTransactions() {
  const list = document.getElementById("list");
  if (!list) return;
  try {
    const res = await fetch(`${API}/api/wallet/transactions`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = `
        <div class="tx-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <p>No transactions yet</p>
        </div>`;
      return;
    }

    list.innerHTML = data.map(tx => {
      const isCredit = tx.type === "credit";
      const party = isCredit ? (tx.from || "Top-up") : (tx.to || "—");
      const sign = isCredit ? "+" : "−";
      const icon = isCredit
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
      return `
        <div class="tx">
          <div class="tx-icon ${tx.type}">${icon}</div>
          <div class="tx-info">
            <div class="tx-type">${isCredit ? "Received" : "Sent"}</div>
            <div class="tx-party">${party}</div>
          </div>
          <div class="tx-amount ${tx.type}">${sign}$${parseFloat(tx.amount).toFixed(2)}</div>
        </div>`;
    }).join("");
  } catch (err) {
    console.log("Transaction error");
  }
}

// ── Fund Wallet ──
async function fundWallet() {
  const amount = getInput("amount");
  if (!amount) return showToast("Enter an amount", "error");
  try {
    const res = await fetch(`${API}/api/wallet/fund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ amount })
    });
    if (res.ok) {
      showToast("Wallet funded!", "success");
      setTimeout(() => window.location = "dashboard.html", 1500);
    } else {
      const msg = await res.text();
      showToast(msg || "Funding failed", "error");
    }
  } catch (err) {
    showToast("Funding failed", "error");
  }
}

// ── Avatar / Profile Picture ──
function changeAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return showToast("Please choose an image", "error");
  }

  if (file.size > 5 * 1024 * 1024) {
    return showToast("Image must be under 5MB", "error");
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    localStorage.setItem("avatar", dataUrl);
    document.getElementById("avatarImg").src = dataUrl;
    showToast("Profile picture updated!", "success");
  };
  reader.readAsDataURL(file);
}

function loadAvatar() {
  const saved = localStorage.getItem("avatar");
  const img = document.getElementById("avatarImg");
  if (saved && img) img.src = saved;
}

// ── Navigation ──
function goSend() { window.location = "send.html"; }
function goFund() { window.location = "fund.html"; }
function goTransactions() { window.location = "transaction.html"; }
function logout() { localStorage.removeItem("token"); window.location = "index.html"; }

// ── Auto load per page ──
const path = window.location.pathname;
if (path.includes("dashboard")) {
  loadBalance();
  loadAvatar();
}
if (path.includes("transaction")) loadTransactions();

// ── Service Worker ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("SW registered"));
}
