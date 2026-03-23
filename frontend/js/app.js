// ===== CONFIG =====
const API = "https://festac-api.onrender.com"; // change if needed

// ===== TOKEN HELPERS =====
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

// ===== UI HELPERS =====
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show " + type;

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function showLoading(show = true) {
  const el = document.getElementById("loadingOverlay");
  if (!el) return;
  el.style.display = show ? "flex" : "none";
}

// ===== AUTH =====
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    return showToast("Enter email and password", "error");
  }

  showLoading(true);

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      setToken(data.token);
      showToast("Login successful", "success");

      setTimeout(() => {
        window.location = "dashboard.html";
      }, 800);
    } else {
      showToast(data.message || "Login failed", "error");
    }
  } catch (err) {
    showToast("Connection error", "error");
  }

  showLoading(false);
}

// ===== SEND MONEY FLOW =====
let sendData = {};

function openPinModal() {
  const email = document.getElementById("toEmail").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);

  if (!email || !amount) {
    return showToast("Fill all fields", "error");
  }

  if (amount > 50) {
    return showToast("Max transfer is $50", "error");
  }

  sendData = { email, amount };

  document.getElementById("pinModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("pinModal").style.display = "none";
}

async function confirmSend() {
  const pin = document.getElementById("pinInput").value;

  if (pin.length !== 4) {
    return showToast("Enter 4-digit PIN", "error");
  }

  try {
    const res = await fetch(`${API}/api/wallet/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        toEmail: sendData.email,
        amount: sendData.amount,
        pin
      })
    });

    const data = await res.json();

    if (res.ok) {
      showToast("Transfer successful", "success");
      closeModal();

      document.getElementById("toEmail").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("pinInput").value = "";
    } else {
      showToast(data.message || "Transfer failed", "error");
    }
  } catch {
    showToast("Connection error", "error");
  }
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
  const list = document.getElementById("list");
  if (!list) return;

  try {
    const res = await fetch(`${API}/api/wallet/transactions`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();

    if (!res.ok) throw new Error();

    if (!data.length) {
      list.innerHTML = `<p style="text-align:center;color:#888;">No transactions yet</p>`;
      return;
    }

    list.innerHTML = data.map(tx => {
      const isSent = tx.type === "send";

      return `
        <div class="tx-item">
          <div>
            <div class="tx-title">
              ${isSent ? "Sent to" : "Received from"} ${tx.email}
            </div>
            <div class="tx-date">
              ${new Date(tx.createdAt).toLocaleString()}
            </div>
          </div>
          <div class="tx-amount ${isSent ? "neg" : "pos"}">
            ${isSent ? "-" : "+"}$${tx.amount.toFixed(2)}
          </div>
        </div>
      `;
    }).join("");
  } catch {
    showToast("Failed to load transactions", "error");
  }
}

// ===== FUND REQUEST (BANK) =====
async function submitFundRequest() {
  const amount = document.getElementById("fundAmount").value;
  const senderName = document.getElementById("fundSenderName").value;
  const senderBank = document.getElementById("fundSenderBank").value;
  const reference = document.getElementById("fundReference").value;

  if (!amount || !senderName || !senderBank || !reference) {
    return showToast("Fill all fields", "error");
  }

  if (amount < 15000) {
    return showToast("Minimum is ₦15,000", "error");
  }

  try {
    const res = await fetch(`${API}/api/wallet/fund-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        amount,
        senderName,
        senderBank,
        reference
      })
    });

    const data = await res.json();

    if (res.ok) {
      showToast("Submitted! Await verification", "success");

      document.getElementById("fundAmount").value = "";
      document.getElementById("fundSenderName").value = "";
      document.getElementById("fundSenderBank").value = "";
      document.getElementById("fundReference").value = "";
    } else {
      showToast(data.message || "Failed", "error");
    }
  } catch {
    showToast("Connection error", "error");
  }
}

// ===== AUTO LOADERS =====
document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();
});