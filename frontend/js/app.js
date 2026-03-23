const API = "https://festac-app0x.onrender.com";

// ── Storage Helpers ──
function saveToken(token) { localStorage.setItem("token", token); }
function getToken() { return localStorage.getItem("token"); }
function getInput(id) { return document.getElementById(id)?.value; }

// ── UI Helpers ──
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

// ── Lock Screen ──
function shouldLock() {
  const path = window.location.pathname;
  return getToken() && (
    path.includes("dashboard") ||
    path.includes("send") ||
    path.includes("transaction") ||
    path.includes("fund") ||
    path.includes("setpin") ||
    path.includes("admin")
  );
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (shouldLock()) localStorage.setItem("hiddenAt", Date.now());
  } else {
    checkLock();
  }
});

window.addEventListener("focus", checkLock);
window.addEventListener("pageshow", checkLock);

function checkLock() {
  if (!shouldLock()) return;
  const hiddenAt = localStorage.getItem("hiddenAt");
  if (!hiddenAt) return;

  const elapsed = Date.now() - parseInt(hiddenAt);
  localStorage.removeItem("hiddenAt");

  if (elapsed > 30000) showLockScreen();
}

function showLockScreen() {
  if (document.getElementById("lockOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "lockOverlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:#0a0a0a;z-index:9999;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:32px;
  `;

  overlay.innerHTML = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
      background:linear-gradient(135deg,#f0c040,#c9a84c);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      margin-bottom:8px;">Festac</h2>
    <p style="color:#8a7e6e;font-size:14px;margin-bottom:28px;">Enter your password to continue</p>
    <input id="lockPassword" type="password" placeholder="Password" />
    <button onclick="unlockApp()">Unlock</button>
    <p id="lockError"></p>
    <button onclick="lockLogout()">Log out instead</button>
  `;

  document.body.appendChild(overlay);
}

async function unlockApp() {
  const password = document.getElementById("lockPassword")?.value;
  const token = getToken();
  if (!password || !token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const email = payload.email;

    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      saveToken(data.token);
      document.getElementById("lockOverlay")?.remove();
    } else {
      document.getElementById("lockError").textContent = "Incorrect password";
    }

  } catch {
    document.getElementById("lockError").textContent = "Connection error";
  }
}

function lockLogout() {
  localStorage.clear();
  window.location = "index.html";
}

// ── LOGIN (FIXED) ──
async function login() {
  const email = getInput("email");
  const password = getInput("password");

  if (!email || !password) {
    return showToast("Fill in all fields", "error");
  }

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

      // ✅ FIX: Always go to dashboard
      window.location = "dashboard.html";

    } else {
      showToast(data.message || "Login failed", "error");
    }

  } catch {
    setLoading(false);
    showToast("Connection error", "error");
  }
}

// ── REGISTER ──
async function register() {
  const name = getInput("name");
  const email = getInput("email");
  const password = getInput("password");
  const otp = getInput("otp");

  if (!name || !email || !password || !otp) {
    return showToast("Fill in all fields", "error");
  }

  setLoading(true);

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, otp })
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

  } catch {
    setLoading(false);
    showToast("Registration failed", "error");
  }
}

// ── ADMIN BUTTON ──
function loadAdminButton() {
  const token = getToken();
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin") {
      const btn = document.getElementById("adminBtn");
      if (btn) btn.style.display = "block";
    }
  } catch {}
}

function goAdmin() {
  window.location = "admin.html";
}

// ── BALANCE ──
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

  } catch {}
}

function toggleBalance() {
  balanceHidden = !balanceHidden;
  const el = document.getElementById("balance");
  if (el) el.textContent = balanceHidden ? "••••••" : rawBalance;
}

// ── NAVIGATION ──
function goSend() { window.location = "send.html"; }
function goFund() { window.location = "fund.html"; }
function goTransactions() { window.location = "transaction.html"; }
function logout() {
  localStorage.clear();
  window.location = "index.html";
}

// ── AUTO LOAD ──
const path = window.location.pathname;

if (path.includes("dashboard")) {
  loadBalance();
  loadAdminButton();
}