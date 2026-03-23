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
function goFund() {
  window.location = "fund.html";
}

function goSend() {
  window.location = "send.html";
}

function goTransactions() {
  window.location = "transaction.html";
}

function goAdmin() {
  window.location = "admin.html";
}

// ===== UI =====
function showToast(message, type = "info") {
  console.log(message);
}

// ===== LOGIN =====
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    return alert("Enter email and password");
  }

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
      alert("Login successful");
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
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
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
  const list = document.getElementById("recentList");
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
      list.innerHTML = `<p>No transactions yet</p>`;
      return;
    }

    list.innerHTML = data.slice(0, 5).map(tx => {
      const isSent = tx.type === "debit";

      const name = isSent
        ? (tx.to || "Unknown")
        : (tx.from || "Unknown");

      const date = tx.date
        ? new Date(tx.date).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "No date";

      return `
        <div style="padding:12px 0; border-bottom:1px solid #222;">
          <div style="font-weight:600;">${isSent ? "Sent to" : "Received from"} <span style="color:#c9a84c">${name}</span></div>
          <small style="color:#888;">${date}</small>
          <div style="font-size:16px; font-weight:700; margin-top:4px; color:${isSent ? "#ef4444" : "#22c55e"}">
            ${isSent ? "-" : "+"}$${Number(tx.amount).toFixed(2)}
          </div>
        </div>
      `;
    }).join("");

  } catch {
    console.log("Transaction error");
  }
}

// ===== PROFILE PICTURE =====
function loadProfilePic() {
  const img = document.getElementById("profilePic");
  const saved = localStorage.getItem("profilePic");

  if (img) {
    img.src = saved || "https://via.placeholder.com/40";
  }
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
    };

    reader.readAsDataURL(file);
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadBalance();
  loadTransactions();
  loadProfilePic();
  initUpload();
});