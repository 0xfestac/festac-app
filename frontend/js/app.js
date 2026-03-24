// ===== CONFIG =====
const API = "https://festac-app0x.onrender.com";

// ===== TOKEN =====
function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function logout() {
  localStorage.removeItem("token");
  window.location = "index.html";
}

// ===== NAVIGATION =====
function goFund() { window.location = "fund.html"; }
function goSend() { window.location = "send.html"; }
function goTransactions() { window.location = "transaction.html"; }
function goAdmin() { window.location = "admin.html"; }

// ===== UI =====
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) { console.log(message); return; }
  toast.textContent = message;
  toast.className = "toast show" + (type !== "info" ? " " + type : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = "toast"; }, 3000);
}

// ===== LOGIN =====
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Enter email and password");
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      window.location = "dashboard.html";
    } else {
      alert(data.message || "Login failed");
    }
  } catch {
    alert("Connection error");
  }
}

// ===== BALANCE =====
async function loadBalance() {
  const el = document.getElementById("balance");
  if (!el) return;
  try {
    const res = await fetch(`${API}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (res.ok) {
      el.textContent = `$${Number(data.balance).toFixed(2)}`;
    }
  } catch {
    console.log("Balance error");
  }
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
  const list = document.getElementById("recentList") || document.getElementById("list");
  if (!list) return;

  try {
    const res = await fetch(`${API}/api/wallet/transactions`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error();

    if (!data.length) {
      list.innerHTML = `<p style="color:#888;text-align:center;padding:20px">No transactions yet</p>`;
      return;
    }

    const limit = list.id === "recentList" ? 5 : data.length;

    list.innerHTML = data.slice(0, limit).map(tx => {
      const isCredit = tx.type === "credit";
      const party = isCredit ? (tx.from || "Top-up") : (tx.to || "—");
      const sign = isCredit ? "+" : "−";
      const date = tx.date
        ? new Date(tx.date).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "No date";
      const icon = isCredit
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

      return `
        <div class="tx">
          <div class="tx-icon ${tx.type}">${icon}</div>
          <div class="tx-info">
            <div class="tx-type">${isCredit ? "Received" : "Sent"}</div>
            <div class="tx-party">${party}</div>
            <div style="font-size:10px;color:#5a5248;margin-top:3px;font-family:monospace">${tx._id}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${tx.type}">${sign}$${parseFloat(tx.amount).toFixed(2)}</div>
            <div class="tx-date">${date}</div>
            <div style="margin-top:4px">
              <a href="verify.html" onclick="localStorage.setItem('verifyTx','${tx._id}')"
                 style="font-size:10px;color:#c9a84c;text-decoration:none;font-weight:600">
                Verify ↗
              </a>
            </div>
          </div>
        </div>`;
    }).join("");

  } catch {
    console.log("Transaction error");
  }
}

// ===== SEND MONEY =====
function openPinModal() {
  const toEmail = document.getElementById("toEmail")?.value;
  const amount = document.getElementById("amount")?.value;
  if (!toEmail || !amount) return showToast("Fill in all fields", "error");
  document.getElementById("pinModal").classList.add("open");
}

function closeModal() {
  document.getElementById("pinModal").classList.remove("open");
}

async function confirmSend() {
  const toEmail = document.getElementById("toEmail")?.value;
  const amount = document.getElementById("amount")?.value;
  const pin = document.getElementById("pinInput")?.value;
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
  } catch {
    showToast("Transfer failed", "error");
  }
}

// ===== FUND REQUEST =====
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
  } catch {
    showToast("Connection error", "error");
  }
}

// ===== PROFILE PICTURE =====
function loadProfilePic() {
  const img = document.getElementById("profilePic");
  const saved = localStorage.getItem("profilePic");
  if (img) img.src = saved || "icon.png";
}

function initUpload() {
  const input = document.getElementById("uploadPic");
  if (!input) return;
  input.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      localStorage.setItem("profilePic", e.target.result);
      loadProfilePic();
      showToast("Profile picture updated!", "success");
    };
    reader.readAsDataURL(file);
    this.value = "";
  });
}

// ===== SET PIN =====
async function setPin(pin) {
  try {
    const res = await fetch(`${API}/api/auth/set-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("PIN set successfully!", "success");
      setTimeout(() => window.location = "dashboard.html", 1500);
    } else {
      showToast(data.message || "Failed to set PIN", "error");
    }
  } catch {
    showToast("Connection error", "error");
  }
}

// ===== LOAD RECENT (alias) =====
function loadRecentTransactions() {
  loadTransactions();
}

// ===== SERVICE WORKER =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("SW registered"))
    .catch(() => {});
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadBalance();
  loadTransactions();
  loadProfilePic();
  initUpload();
});