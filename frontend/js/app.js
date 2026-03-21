const API = "https://festac-app0x.onrender.com";

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal
    });
    clearTimeout(timeout);
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
    if (err.name === "AbortError") {
      showToast("Server is waking up, try again", "error");
    } else {
      showToast("Connection error", "error");
    }
  }
}
// ── Register ──
async function register() {
  const name = getInput("name");
  const email = getInput("email");
  const password = getInput("password");
  if (!name || !email || !password) return showToast("Fill in all fields", "error");
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    setLoading(false);
    if (res.ok) {
      localStorage.setItem("userName", name);
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
let balanceHidden = false;
let rawBalance = "0.00";

async function loadBalance() {
  try {
    const res = await fetch(`${API}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    rawBalance = parseFloat(data.balance).toFixed(2);
    const el = document.getElementById("balance");
    if (el) el.textContent = balanceHidden ? "••••••" : rawBalance;
  } catch (err) {
    console.log("Balance error");
  }
}

function toggleBalance() {
  balanceHidden = !balanceHidden;
  const el = document.getElementById("balance");
  const icon = document.getElementById("eyeIcon");
  if (el) el.textContent = balanceHidden ? "••••••" : rawBalance;
  if (icon) {
    icon.innerHTML = balanceHidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

// ── Greeting ──
function loadGreeting() {
  const el = document.getElementById("greetingName");
  if (!el) return;
  const name = localStorage.getItem("userName");
  if (name) {
    el.textContent = name;
  } else {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        el.textContent = payload.name || payload.email?.split("@")[0] || "User";
      } catch { el.textContent = "User"; }
    } else {
      el.textContent = "User";
    }
  }
}

// ── Avatar ──
function changeAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("Please choose an image", "error");
  if (file.size > 5 * 1024 * 1024) return showToast("Image must be under 5MB", "error");
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

// ── Send ──
async function confirmSend() {
  const toEmail = getInput("toEmail");
  const amount = getInput("amount");
  const pin = getInput("pinInput");
  if (!toEmail || !amount || !pin) return showToast("All fields required", "error");
  try {
    const res = await fetch(`${API}/api/wallet/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
function renderTxList(data, containerId, limit = null) {
  const list = document.getElementById(containerId);
  if (!list) return;
  const items = limit ? data.slice(0, limit) : data;
  if (!items.length) {
    list.innerHTML = `
      <div class="tx-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        <p>No transactions yet</p>
      </div>`;
    return;
  }
  list.innerHTML = items.map(tx => {
    const isCredit = tx.type === "credit";
    const party = isCredit ? (tx.from || "Top-up") : (tx.to || "—");
    const sign = isCredit ? "+" : "−";
    const date = tx.date ? new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    const icon = isCredit
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c97a" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    return `
      <div class="tx">
        <div class="tx-icon ${tx.type}">${icon}</div>
        <div class="tx-info">
          <div class="tx-type">${isCredit ? "Received" : "Sent"}</div>
          <div class="tx-party">${party}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${tx.type}">${sign}$${parseFloat(tx.amount).toFixed(2)}</div>
          <div class="tx-date">${date}</div>
        </div>
      </div>`;
  }).join("");
}

async function loadTransactions() {
  try {
    const res = await fetch(`${API}/api/wallet/transactions`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    renderTxList(data, "list");
  } catch (err) { console.log("Transaction error"); }
}

async function loadRecentTransactions() {
  try {
    const res = await fetch(`${API}/api/wallet/transactions`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    renderTxList(data, "recentList", 3);
  } catch (err) { console.log("Transaction error"); }
}

// ── Fund ──
async function fundWallet() {
  const amount = getInput("amount");
  if (!amount) return showToast("Enter an amount", "error");
  try {
    const res = await fetch(`${API}/api/wallet/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount })
    });
    if (res.ok) {
      showToast("Wallet funded!", "success");
      setTimeout(() => window.location = "dashboard.html", 1500);
    } else {
      const msg = await res.text();
      showToast(msg || "Funding failed", "error");
    }
  } catch (err) { showToast("Funding failed", "error"); }
}

// ── Navigation ──
function goSend() { window.location = "send.html"; }
function goFund() { window.location = "fund.html"; }
function goTransactions() { window.location = "transaction.html"; }
function goSetPin() { window.location = "setpin.html"; }
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  window.location = "index.html";
}

// ── Auto load ──
const path = window.location.pathname;
if (path.includes("dashboard")) {
  loadBalance();
  loadAvatar();
  loadGreeting();
  loadRecentTransactions();
}
if (path.includes("transaction")) loadTransactions();

// ── Service Worker ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(() => console.log("SW registered"));
}

// ── Submit Fund Request ──
async function submitFundRequest() {
  const amount = document.getElementById("fundAmount")?.value;
  const senderName = document.getElementById("fundSenderName")?.value;
  const senderBank = document.getElementById("fundSenderBank")?.value;
  const reference = document.getElementById("fundReference")?.value;

  if (!amount || !senderName || !senderBank || !reference) {
    return showToast("Please fill in all fields", "error");
  }

  try {
    const res = await fetch(`${API}/api/wallet/fund-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ amount, senderName, senderBank, reference })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Submitted! We'll credit you within 30 mins", "success");
      document.getElementById("fundAmount").value = "";
      document.getElementById("fundSenderName").value = "";
      document.getElementById("fundSenderBank").value = "";
      document.getElementById("fundReference").value = "";
    } else {
      showToast(data.message || "Submission failed", "error");
    }
  } catch (err) {
    showToast("Connection error", "error");
  }
}