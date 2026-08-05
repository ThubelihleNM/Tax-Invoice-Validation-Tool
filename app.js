// ==========================================
// Tax Invoice Validation Tool - Core App Script (FastAPI Backend Integrated)
// ==========================================

const API_BASE_URL = "http://localhost:8000/api";

// Client-Side Session Databases (Synchronized from MySQL)
let INVOICE_DATABASE = [];
let USERS_DATABASE = [];
let CURRENT_SIMULATED_INVOICE = null;

// State Variables for Table Filters & Sort
let activeHistoryFilter = "all";
let activeHistorySearch = "";
let activeHistorySort = "date-desc";

// ==========================================
// Core Application Lifecycle & Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  // Register Navigation View switches
  initNavigation();

  // Register Table search and sort mechanics
  initTableMechanics();

  // Register Upload workflow handlers
  initUploadMechanics();

  // Register Profile & Administration settings changes handlers
  initSettingsMechanics();

  // Register AI Assistant chatbot panels
  initAiAssistantMechanics();

  // Register User Profile & Credentials Handlers
  initUserProfileMechanics();

  // Check login status and guard routes
  checkAuthState();

  // Bind Logout buttons
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("headerLogoutBtn").addEventListener("click", handleLogout);
});

// Switch active layout panels in auth screens
function showAuthCard(cardId) {
  const cards = ["loginCard", "signupCard", "forgotCard", "resetCard"];
  cards.forEach(id => {
    const card = document.getElementById(id);
    if (card) {
      card.style.display = id === cardId ? "block" : "none";
    }
  });
}

// Client-side Session Route Guard
function checkAuthState() {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const mainWorkspace = document.getElementById("mainWorkspaceContainer");
  const authContainer = document.getElementById("authContainer");

  if (!token) {
    mainWorkspace.style.display = "none";
    authContainer.style.display = "flex";
    showAuthCard("loginCard");
  } else {
    authContainer.style.display = "none";
    mainWorkspace.style.display = "flex";
    
    // Bind profile card info
    const firstName = localStorage.getItem("user_first_name") || "Jane";
    const lastName = localStorage.getItem("user_last_name") || "Doe";
    const email = localStorage.getItem("user_email") || "jane.doe@enterprise.com";
    const role = localStorage.getItem("user_role") || "Auditor";

    document.querySelectorAll(".user-name").forEach(el => el.textContent = `${firstName} ${lastName}`);
    document.querySelectorAll(".user-email").forEach(el => el.textContent = email);
    
    const initials = (firstName[0] || "") + (lastName[0] || "");
    document.querySelectorAll(".avatar").forEach(el => {
      if (el.id !== "profilePreviewImage") {
        el.textContent = initials.toUpperCase();
      }
    });

    // Check Administrator role to hide/show Users panel tab
    const usersTabLink = document.querySelector('.sidebar-nav .nav-item[data-tab="users"]');
    if (usersTabLink) {
      usersTabLink.style.display = role === "Administrator" ? "flex" : "none";
    }

    const quickUpload = document.getElementById("quickUploadBtn");
    if (quickUpload) {
      quickUpload.style.display = (role === "Administrator" || role === "Accountant") ? "block" : "none";
    }

    // Refresh dynamic data
    loadAllBackendDatasets();
  }
}

// Fetch header headers auth config
function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const headers = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Fetch dashboard KPIs and charts datasets from MySQL
async function loadAllBackendDatasets() {
  try {
    await Promise.all([
      loadDatabaseFromBackend(),
      loadDashboardMetrics(),
      loadChartMetrics(),
      loadUsersFromBackend(),
      loadSettingsFromBackend(),
      loadAuditLogs(),
      loadUserProfile()
    ]);
  } catch (err) {
    console.error("Error refreshing database query states: ", err);
  }
}

// ==========================================
// Authentication Request Form Handlers
// ==========================================

async function handleLoginSubmit() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const rememberMe = document.getElementById("loginRememberMe").checked;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });

    const data = await res.json();
    if (res.ok) {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("auth_token", data.access_token);
      
      localStorage.setItem("user_first_name", data.user.first_name);
      localStorage.setItem("user_last_name", data.user.last_name);
      localStorage.setItem("user_email", data.user.email);
      localStorage.setItem("user_role", data.role);
      
      showToast("Access granted successfully.");
      checkAuthState();
    } else {
      showToast(data.detail || "Invalid login credentials.");
    }
  } catch (err) {
    showToast("Unable to connect to login authentication service.");
  }
}

async function handleSignupSubmit() {
  const firstName = document.getElementById("signupFirstName").value.trim();
  const lastName = document.getElementById("signupLastName").value.trim();
  const companyName = document.getElementById("signupCompanyName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (password !== confirmPassword) {
    showToast("Password confirmation mismatch.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        email: email,
        phone: phone,
        password: password
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Registration successful! You can now log in.");
      showAuthCard("loginCard");
    } else {
      showToast(data.detail || "Registration failed.");
    }
  } catch (err) {
    showToast("Failed to connect to sign-up registry.");
  }
}

async function handleForgotSubmit() {
  const email = document.getElementById("forgotEmail").value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Recovery token generated successfully.");
      showAuthCard("resetCard");
      const tokenInput = document.getElementById("resetToken");
      if (tokenInput && data.reset_token) {
        tokenInput.value = data.reset_token;
      }
    } else {
      showToast(data.detail || "Email lookup failed.");
    }
  } catch (err) {
    showToast("Server recovery route offline.");
  }
}

async function handleResetSubmit() {
  const token = document.getElementById("resetToken").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value;
  const confirmPassword = document.getElementById("resetConfirmPassword").value;

  if (newPassword !== confirmPassword) {
    showToast("Passwords do not match.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("New password saved successfully! Please sign in.");
      showAuthCard("loginCard");
    } else {
      showToast(data.detail || "Reset failed.");
    }
  } catch (err) {
    showToast("Server password reset route offline.");
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.warn("Client logged out locally.");
  }
  
  localStorage.clear();
  sessionStorage.clear();
  checkAuthState();
}

// ==========================================
// Database Query Mappings
// ==========================================

async function loadDatabaseFromBackend() {
  try {
    const query = activeHistorySearch ? `?search=${encodeURIComponent(activeHistorySearch)}` : "";
    const res = await fetch(`${API_BASE_URL}/invoices${query}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      INVOICE_DATABASE = data.map(mapApiInvoiceToLocal);
      
      renderDashboardTable();
      renderHistoryTable();
    }
  } catch (err) {
    console.error("Failed to load invoices table logs: ", err);
  }
}

async function loadDashboardMetrics() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      
      document.getElementById("val-total").textContent = data.invoices_validated.toLocaleString();
      document.getElementById("val-valid").textContent = data.valid_invoices.toLocaleString();
      document.getElementById("val-flagged").textContent = data.flagged_invoices.toLocaleString();
      document.getElementById("val-duplicates").textContent = data.duplicate_invoices.toLocaleString();

      const successRate = data.invoices_validated > 0 
        ? ((data.valid_invoices / data.invoices_validated) * 100).toFixed(1) 
        : "0.0";
      
      const validContext = document.querySelector("#kpi-valid .kpi-context");
      if (validContext) {
        validContext.innerHTML = `<strong>${successRate}%</strong> success rate`;
      }
      
      const taxProcessedText = document.querySelector("#view-reports .kpi-card:nth-child(2) .kpi-value");
      if (taxProcessedText) {
        taxProcessedText.textContent = `$${data.vat_collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      const avgSpeedText = document.querySelector("#view-reports .kpi-card:nth-child(4) .kpi-value");
      if (avgSpeedText) {
        avgSpeedText.textContent = `${data.average_processing_time}s`;
      }
    }
  } catch (err) {
    console.error("Failed to fetch statistics KPIs: ", err);
  }
}

async function loadChartMetrics() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/charts`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      
      if (data.daily_trend) {
        drawValidationChart(data.daily_trend);
      }
      
      if (data.suppliers_trend && data.suppliers_trend.length > 0) {
        updateSupplierPerformanceRates(data.suppliers_trend);
      }
    }
  } catch (err) {
    console.error("Failed to load chart trends: ", err);
  }
}

async function loadUsersFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      USERS_DATABASE = data.users.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        status: u.status,
        processedCount: u.id * 14 + 5,
        invitedDate: u.created_at ? u.created_at.split("T")[0] : "2026-07-31"
      }));
      renderUsersTable();
    }
  } catch (err) {
    console.error("Failed to sync users log: ", err);
  }
}

async function loadSettingsFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const vatInput = document.getElementById("vatRateSetting");
      if (vatInput) {
        vatInput.value = data.default_vat_rate;
      }
    }
  } catch (err) {
    console.error("Failed to load preferences: ", err);
  }
}

async function loadAuditLogs() {
  try {
    const res = await fetch(`${API_BASE_URL}/audit`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const logs = await res.json();
      const stream = document.getElementById("reportsActivityStream");
      if (stream) {
        stream.innerHTML = "";
        logs.slice(0, 5).forEach(log => {
          const div = document.createElement("div");
          div.className = "reports-stream-item";
          div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="activity" style="color: var(--primary); width: 16px; height: 16px;"></i>
              <div>
                <span style="font-size: 13px; font-weight: 600; color: var(--text-main);">${log.action.replace(/_/g, " ")}</span>
                <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">${log.description}</p>
              </div>
            </div>
            <span style="font-size: 11px; color: var(--text-muted);">${formatLogTime(log.timestamp)}</span>
          `;
          stream.appendChild(div);
        });
        lucide.createIcons();
      }
    }
  } catch (err) {
    console.error("Failed to sync recent activity stream: ", err);
  }
}

function mapApiInvoiceToLocal(apiInv) {
  const statusMap = {
    "Validated": "valid",
    "Flagged": "flagged",
    "Rejected": "duplicate"
  };
  return {
    id: apiInv.invoice_number || `INV-2026-${apiInv.invoice_id}`,
    invoice_id: apiInv.invoice_id,
    vendor: apiInv.supplier ? apiInv.supplier.supplier_name : "Unknown Supplier",
    logoLetters: apiInv.supplier ? apiInv.supplier.supplier_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "TX",
    vatId: apiInv.supplier ? apiInv.supplier.tax_number : "N/A",
    date: apiInv.invoice_date || apiInv.created_at.split("T")[0],
    subtotal: parseFloat(apiInv.subtotal) || 0.0,
    taxRate: parseFloat(apiInv.vat_rate) || 15.0,
    taxAmount: parseFloat(apiInv.vat_amount) || 0.0,
    total: parseFloat(apiInv.total_amount) || 0.0,
    status: statusMap[apiInv.invoice_status] || "flagged",
    details: {
      ocr: { success: true, msg: "Document scanning engine scans completed successfully." },
      arithmetic: { success: apiInv.invoice_status === "Validated", msg: "Calculations matches subtotal + VAT math." },
      vat: { success: apiInv.invoice_status === "Validated", msg: "Supplier VAT ID registry verified." },
      duplicate: { success: apiInv.invoice_status !== "Rejected", msg: "Supplier unique invoice validation checked." }
    },
    rawText: apiInv.raw_text || `Tax Invoice: ${apiInv.invoice_number}`
  };
}

// ==========================================
// 1. Navigation Panel Switches
// ==========================================
function initNavigation() {
  const sidebarItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const viewPanels = document.querySelectorAll(".view-panel");
  const viewTitle = document.getElementById("viewTitle");
  
  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabTarget = item.getAttribute("data-tab");
      
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      
      viewPanels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.id === `view-${tabTarget}`) {
          panel.classList.add("active");
        }
      });
      
      const formattedTitle = tabTarget.charAt(0).toUpperCase() + tabTarget.slice(1).replace("-", " ");
      viewTitle.textContent = formattedTitle === "Upload" ? "Upload Invoice Document" : formattedTitle;
      
      if (tabTarget === "dashboard") {
        loadAllBackendDatasets();
      } else if (tabTarget === "history") {
        loadDatabaseFromBackend();
      } else if (tabTarget === "reports") {
        loadChartMetrics();
        loadAuditLogs();
      }
      
      if (window.innerWidth <= 768) {
        document.getElementById("appSidebar").classList.remove("active");
      }
    });
  });

  const toggleBtn = document.getElementById("sidebarToggle");
  const appSidebar = document.getElementById("appSidebar");
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    appSidebar.classList.toggle("active");
  });

  document.querySelector(".main-display").addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      appSidebar.classList.remove("active");
    }
  });

  document.getElementById("quickUploadBtn").addEventListener("click", () => {
    navigateToTab("upload");
  });
  
  document.getElementById("dashboardViewAllBtn").addEventListener("click", () => {
    navigateToTab("history");
  });
}

function navigateToTab(tabName) {
  const tabLink = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabName}"]`);
  if (tabLink) {
    tabLink.click();
  }
}

// ==========================================
// 2. Data Rendering Mechanics (Tables, KPIs)
// ==========================================

function getStatusBadgeHtml(status) {
  if (status === "valid") {
    return `<span class="badge badge-success"><span class="badge-dot-indicator"></span>Valid</span>`;
  } else if (status === "flagged") {
    return `<span class="badge badge-warning"><span class="badge-dot-indicator"></span>Flagged</span>`;
  } else {
    return `<span class="badge badge-danger"><span class="badge-dot-indicator"></span>Duplicate</span>`;
  }
}

function renderDashboardTable() {
  const tbody = document.querySelector("#dashboardRecentTable tbody");
  tbody.innerHTML = "";
  
  const recentInvoices = [...INVOICE_DATABASE]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  recentInvoices.forEach(inv => {
    const tr = document.createElement("tr");
    tr.addEventListener("click", () => openDetailDrawer(inv.id));
    
    tr.innerHTML = `
      <td>
        <div class="vendor-col-profile">
          <div class="vendor-logo-box">${inv.logoLetters}</div>
          <div class="vendor-meta">
            <span class="vendor-title">${inv.vendor}</span>
            <span class="vendor-sub">${inv.vatId}</span>
          </div>
        </div>
      </td>
      <td><code>${inv.id}</code></td>
      <td>${formatDate(inv.date)}</td>
      <td>$${inv.subtotal.toFixed(2)}</td>
      <td>$${inv.taxAmount.toFixed(2)} (${inv.taxRate}%)</td>
      <td>${getStatusBadgeHtml(inv.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";
  
  let filtered = INVOICE_DATABASE.filter(inv => {
    if (activeHistoryFilter !== "all" && inv.status !== activeHistoryFilter) {
      return false;
    }
    return true;
  });
  
  filtered.sort((a, b) => {
    if (activeHistorySort === "date-desc") {
      return new Date(b.date) - new Date(a.date);
    } else if (activeHistorySort === "date-asc") {
      return new Date(a.date) - new Date(b.date);
    } else if (activeHistorySort === "amount-desc") {
      return b.total - a.total;
    } else if (activeHistorySort === "amount-asc") {
      return a.total - b.total;
    }
    return 0;
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">No invoice logs match the selected query.</td></tr>`;
    return;
  }
  
  filtered.forEach(inv => {
    const tr = document.createElement("tr");
    tr.addEventListener("click", () => openDetailDrawer(inv.id));
    
    tr.innerHTML = `
      <td>
        <div class="vendor-col-profile">
          <div class="vendor-logo-box">${inv.logoLetters}</div>
          <div class="vendor-meta">
            <span class="vendor-title">${inv.vendor}</span>
            <span class="vendor-sub">${inv.vatId}</span>
          </div>
        </div>
      </td>
      <td><code>${inv.id}</code></td>
      <td>${formatDate(inv.date)}</td>
      <td>${inv.taxRate}%</td>
      <td>$${inv.taxAmount.toFixed(2)}</td>
      <td>$${inv.subtotal.toFixed(2)}</td>
      <td><strong>$${inv.total.toFixed(2)}</strong></td>
      <td>${getStatusBadgeHtml(inv.status)}</td>
      <td>
        <button class="btn btn-outline btn-sm table-row-action" data-id="${inv.id}">Review</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = "";
  
  USERS_DATABASE.forEach(user => {
    const tr = document.createElement("tr");
    let badgeClass = user.status === "Active" ? "badge-success" : "badge-warning";
    
    tr.innerHTML = `
      <td>
        <div class="user-cell-profile">
          <div class="avatar">${user.name.split(" ").map(n=>n[0]).join("")}</div>
          <div class="vendor-meta">
            <span class="vendor-title">${user.name}</span>
            <span class="vendor-sub">${user.email}</span>
          </div>
        </div>
      </td>
      <td><span style="font-size: 13px; font-weight: 500;">${user.role}</span></td>
      <td><span class="badge ${badgeClass}"><span class="badge-dot-indicator"></span>${user.status}</span></td>
      <td><code>${user.processedCount}</code></td>
      <td>${formatDate(user.invitedDate)}</td>
      <td>
        <button class="btn btn-outline btn-sm user-delete-btn" style="padding: 2px 8px;" onclick="event.stopPropagation(); handleDeleteUser(${user.id});">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleDeleteUser(userId) {
  if (confirm("Are you sure you want to remove this user?")) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast("User successfully deleted.");
        loadUsersFromBackend();
      }
    } catch (err) {
      showToast("Role Unauthorized to delete users.");
    }
  }
}

function initTableMechanics() {
  const historySearch = document.getElementById("historySearchField");
  historySearch.addEventListener("input", (e) => {
    activeHistorySearch = e.target.value;
    loadDatabaseFromBackend();
  });

  const historySort = document.getElementById("historySortSelect");
  historySort.addEventListener("change", (e) => {
    activeHistorySort = e.target.value;
    renderHistoryTable();
  });

  const filterBtns = document.querySelectorAll(".history-filters-row .btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.add("btn-outline"));
      btn.classList.remove("btn-outline");
      activeHistoryFilter = btn.getAttribute("data-filter");
      renderHistoryTable();
    });
  });

  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
  
  document.getElementById("exportHistoryCsvBtn").addEventListener("click", async () => {
    showToast("Exporting data compilation summary...");
    try {
      const res = await fetch(`${API_BASE_URL}/reports/export`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ report_type: "invoice_validation", export_format: "CSV" })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax_audit_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("Export download initiated.");
      }
    } catch (err) {
      showToast("CSV generation failed.");
    }
  });
}

// ==========================================
// 4. Slider Details Drawer View Mechanics
// ==========================================
function openDetailDrawer(invoiceId) {
  const inv = INVOICE_DATABASE.find(i => i.id === invoiceId);
  if (!inv) return;
  
  document.getElementById("drawerInvoiceId").textContent = `Review Log: ${inv.id}`;
  document.getElementById("drawerDate").textContent = formatDate(inv.date);
  document.getElementById("drawerVendor").textContent = inv.vendor;
  document.getElementById("drawerVatId").textContent = inv.vatId;
  document.getElementById("drawerSubtotal").textContent = `$${inv.subtotal.toFixed(2)}`;
  document.getElementById("drawerTax").textContent = `$${inv.taxAmount.toFixed(2)} (${inv.taxRate}%)`;
  document.getElementById("drawerTotal").textContent = `$${inv.total.toFixed(2)}`;
  document.getElementById("drawerInvoiceText").textContent = inv.rawText;
  
  const statusBadge = document.getElementById("drawerStatusBadge");
  statusBadge.className = "badge"; 
  
  if (inv.status === "valid") {
    statusBadge.classList.add("badge-success");
    statusBadge.querySelector("span:last-child").textContent = "Valid";
  } else if (inv.status === "flagged") {
    statusBadge.classList.add("badge-warning");
    statusBadge.querySelector("span:last-child").textContent = "Flagged";
  } else {
    statusBadge.classList.add("badge-danger");
    statusBadge.querySelector("span:last-child").textContent = "Duplicate";
  }
  
  const rulesList = document.getElementById("drawerRulesList");
  rulesList.innerHTML = "";
  
  const checksKeys = [
    { key: "ocr", title: "Document Layout OCR" },
    { key: "arithmetic", title: "Subtotal Arithmetic Audit" },
    { key: "vat", title: "Supplier Registry Lookup" },
    { key: "duplicate", title: "Duplicate Index Analysis" }
  ];
  
  checksKeys.forEach(check => {
    const outcome = inv.details[check.key];
    const row = document.createElement("div");
    row.className = "drawer-rule-row";
    
    let iconClass = "text-success";
    let iconName = "check-circle-2";
    if (!outcome.success) {
      iconClass = inv.status === "duplicate" ? "text-danger" : "text-warning";
      iconName = "alert-triangle";
    }
    
    row.innerHTML = `
      <i class="${iconClass}" data-lucide="${iconName}"></i>
      <div class="drawer-rule-info">
        <span class="drawer-rule-title">${check.title}</span>
        <span class="drawer-rule-msg">${outcome.msg}</span>
      </div>
    `;
    rulesList.appendChild(row);
  });
  
  lucide.createIcons();

  document.getElementById("drawerPrintBtn").onclick = () => {
    window.print();
  };

  document.getElementById("drawerDeleteBtn").onclick = async () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        const res = await fetch(`${API_BASE_URL}/invoices/${inv.invoice_id}`, {
          method: "DELETE",
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast("Invoice deleted from database registry.");
          closeDrawer();
          loadAllBackendDatasets();
        }
      } catch (err) {
        showToast("Error deleting invoice from backend.");
      }
    }
  };
  
  document.getElementById("drawerBackdrop").classList.add("open");
  document.getElementById("invoiceDetailsDrawer").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawerBackdrop").classList.remove("open");
  document.getElementById("invoiceDetailsDrawer").classList.remove("open");
}

// ==========================================
// 5. Invoice Upload & Live OCR Processing
// ==========================================
function initUploadMechanics() {
  const dragDropArea = document.getElementById("dragDropArea");
  const browseFilesBtn = document.getElementById("browseFilesBtn");
  const fileInput = document.getElementById("invoiceFileInput");
  const progressPanel = document.getElementById("validationProgress");
  const resultsPanel = document.getElementById("validationResultCard");
  const staticRules = document.getElementById("uploadStaticRules");
  
  browseFilesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
    }
  });

  dragDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dragDropArea.classList.add("dragover");
  });

  dragDropArea.addEventListener("dragleave", () => {
    dragDropArea.classList.remove("dragover");
  });

  dragDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDropArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  async function handleFileUpload(file) {
    dragDropArea.style.display = "none";
    staticRules.style.display = "none";
    progressPanel.style.display = "flex";
    
    resetProgressIndicators();
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/invoices/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        const apiInv = await res.json();
        playStepTimeline(apiInv);
      } else {
        throw new Error("API rejection");
      }
    } catch (err) {
      showToast("OCR scan failed: Document size exceeds limits or format unsupported.");
      resetUploadPanel();
    }
  }

  function resetProgressIndicators() {
    const steps = ["step-ocr", "step-arithmetic", "step-db", "step-duplicate"];
    steps.forEach(stepId => {
      const step = document.getElementById(stepId);
      step.className = "tracker-step-item pending";
      step.querySelector("i").setAttribute("data-lucide", "circle");
    });
    lucide.createIcons();
  }

  function playStepTimeline(apiInv) {
    const stepOcr = document.getElementById("step-ocr");
    const stepArithmetic = document.getElementById("step-arithmetic");
    const stepDb = document.getElementById("step-db");
    const stepDuplicate = document.getElementById("step-duplicate");

    setTimeout(() => {
      stepOcr.className = "tracker-step-item success";
      stepOcr.querySelector("i").setAttribute("data-lucide", "check");
      
      stepArithmetic.className = "tracker-step-item running";
      stepArithmetic.querySelector("i").setAttribute("data-lucide", "loader-2");
      stepArithmetic.querySelector("i").classList.add("animate-spin");
      lucide.createIcons();

      setTimeout(() => {
        const arithmeticPassed = apiInv.invoice_status !== "Flagged";
        stepArithmetic.className = arithmeticPassed ? "tracker-step-item success" : "tracker-step-item error";
        stepArithmetic.querySelector("i").setAttribute("data-lucide", arithmeticPassed ? "check" : "x");
        stepArithmetic.querySelector("i").classList.remove("animate-spin");
        
        stepDb.className = "tracker-step-item running";
        stepDb.querySelector("i").setAttribute("data-lucide", "loader-2");
        stepDb.querySelector("i").classList.add("animate-spin");
        lucide.createIcons();

        setTimeout(() => {
          stepDb.className = "tracker-step-item success";
          stepDb.querySelector("i").setAttribute("data-lucide", "check");
          stepDb.querySelector("i").classList.remove("animate-spin");
          
          stepDuplicate.className = "tracker-step-item running";
          stepDuplicate.querySelector("i").setAttribute("data-lucide", "loader-2");
          stepDuplicate.querySelector("i").classList.add("animate-spin");
          lucide.createIcons();

          setTimeout(() => {
            const isDuplicate = apiInv.invoice_status === "Rejected";
            stepDuplicate.className = !isDuplicate ? "tracker-step-item success" : "tracker-step-item error";
            stepDuplicate.querySelector("i").setAttribute("data-lucide", !isDuplicate ? "check" : "x");
            stepDuplicate.querySelector("i").classList.remove("animate-spin");
            lucide.createIcons();

            setTimeout(() => {
              progressPanel.style.display = "none";
              CURRENT_SIMULATED_INVOICE = mapApiInvoiceToLocal(apiInv);
              displayUploadResults();
            }, 600);
          }, 600);
        }, 600);
      }, 600);
    }, 500);
  }

  const acceptBtn = document.getElementById("btnAcceptUpload");
  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      if (CURRENT_SIMULATED_INVOICE) {
        showToast("Invoice processed and saved successfully.");
        await loadAllBackendDatasets();
        navigateToTab("dashboard");
        resetUploadPanel();
      }
    });
  }

  const rejectBtn = document.getElementById("btnRejectUpload");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
      resetUploadPanel();
    });
  }

  const validateBtn = document.getElementById("btnValidateInputs");
  if (validateBtn) {
    validateBtn.addEventListener("click", async () => {
      if (!CURRENT_SIMULATED_INVOICE) return;
      try {
        const res = await fetch(`${API_BASE_URL}/validation/override/${CURRENT_SIMULATED_INVOICE.invoice_id}`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            status: "Validated",
            comment: "Manual Accountant Verification input override check."
          })
        });
        if (res.ok) {
          showToast("Validation check passed by overrides.");
          CURRENT_SIMULATED_INVOICE.status = "valid";
          CURRENT_SIMULATED_INVOICE.details.arithmetic.success = true;
          CURRENT_SIMULATED_INVOICE.details.vat.success = true;
          CURRENT_SIMULATED_INVOICE.details.duplicate.success = true;
          displayUploadResults();
        }
      } catch (err) {
        showToast("Override failed.");
      }
    });
  }

  const generateBtn = document.getElementById("btnGenerateReport");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      if (!CURRENT_SIMULATED_INVOICE) return;
      window.open(`${API_BASE_URL}/validation/report/${CURRENT_SIMULATED_INVOICE.invoice_id}`);
    });
  }
}

function displayUploadResults() {
  const resultsPanel = document.getElementById("validationResultCard");
  if (resultsPanel) resultsPanel.style.display = "block";
  
  const resVendor = document.getElementById("resultVendor");
  if (resVendor) resVendor.textContent = CURRENT_SIMULATED_INVOICE.vendor;

  const resTotal = document.getElementById("resultTotal");
  if (resTotal) resTotal.textContent = `$${CURRENT_SIMULATED_INVOICE.total.toFixed(2)}`;
  
  const docMockVendor = document.getElementById("docMockVendor");
  if (docMockVendor) docMockVendor.textContent = CURRENT_SIMULATED_INVOICE.vendor;
  const docMockInvoiceId = document.getElementById("docMockInvoiceId");
  if (docMockInvoiceId) docMockInvoiceId.textContent = CURRENT_SIMULATED_INVOICE.id;
  const docMockVatId = document.getElementById("docMockVatId");
  if (docMockVatId) docMockVatId.textContent = CURRENT_SIMULATED_INVOICE.vatId;
  const docMockSubtotal = document.getElementById("docMockSubtotal");
  if (docMockSubtotal) docMockSubtotal.textContent = `$${CURRENT_SIMULATED_INVOICE.subtotal.toFixed(2)}`;
  const docMockTax = document.getElementById("docMockTax");
  if (docMockTax) docMockTax.textContent = `$${CURRENT_SIMULATED_INVOICE.taxAmount.toFixed(2)}`;
  const docMockTotal = document.getElementById("docMockTotal");
  if (docMockTotal) docMockTotal.textContent = `$${CURRENT_SIMULATED_INVOICE.total.toFixed(2)}`;
  const docMockItemTotal = document.getElementById("docMockItemTotal");
  if (docMockItemTotal) docMockItemTotal.textContent = `$${CURRENT_SIMULATED_INVOICE.subtotal.toFixed(2)}`;
  
  const grid = document.getElementById("rulesDetailsGrid");
  if (grid) {
    grid.innerHTML = "";
    const checks = [
      { key: "ocr", title: "Document Layout OCR", desc: "Verifies standard invoice fields exist." },
      { key: "arithmetic", title: "Arithmetic Audit", desc: "Recalculates subtotal + VAT rate matches total." },
      { key: "vat", title: "Supplier Registry Lookup", desc: "Validates active VAT ID syntax." },
      { key: "duplicate", title: "Duplicate Index Analysis", desc: "Checks against historical invoice archives." }
    ];
    checks.forEach(check => {
      const outcome = CURRENT_SIMULATED_INVOICE.details[check.key];
      const div = document.createElement("div");
      div.className = "rule-check-item";
      
      let iconColor = "var(--success)";
      let iconName = "check-circle-2";
      if (!outcome.success) {
        iconColor = CURRENT_SIMULATED_INVOICE.status === "duplicate" ? "var(--danger)" : "var(--warning)";
        iconName = "alert-circle";
      }

      div.innerHTML = `
        <i data-lucide="${iconName}" style="color: ${iconColor}; flex-shrink: 0; width: 18px; height: 18px;"></i>
        <div>
          <strong>${check.title}</strong>
          <p>${outcome.msg || check.desc}</p>
        </div>
      `;
      grid.appendChild(div);
    });
    lucide.createIcons();
  }

  updateTopLevelStatus();
}

function updateTopLevelStatus() {
  const iconWrapper = document.getElementById("resultStatusIconWrapper");
  const icon = document.getElementById("resultStatusIcon");
  const title = document.getElementById("resultStatusTitle");
  const subtitle = document.getElementById("resultStatusSubtitle");
  
  if (iconWrapper && icon && title) {
    iconWrapper.style.backgroundColor = ""; 
    iconWrapper.style.color = "";
    
    if (CURRENT_SIMULATED_INVOICE.status === "valid") {
      iconWrapper.style.backgroundColor = "var(--success-light)";
      iconWrapper.style.color = "var(--success-text)";
      icon.setAttribute("data-lucide", "check");
      title.textContent = "Passed Checks";
      if (subtitle) subtitle.textContent = "Invoice matches all structural validation criteria.";
    } else if (CURRENT_SIMULATED_INVOICE.status === "flagged") {
      iconWrapper.style.backgroundColor = "var(--warning-light)";
      iconWrapper.style.color = "var(--warning-text)";
      icon.setAttribute("data-lucide", "alert-triangle");
      title.textContent = "Flagged Check";
      if (subtitle) subtitle.textContent = "Validation warnings detected. Review exception logs below.";
    } else {
      iconWrapper.style.backgroundColor = "var(--danger-light)";
      iconWrapper.style.color = "var(--danger-text)";
      icon.setAttribute("data-lucide", "copy");
      title.textContent = "Duplicate Failure";
      if (subtitle) subtitle.textContent = "Duplicate invoice detected in archive history.";
    }
    lucide.createIcons();
  }
}
  


function resetUploadPanel() {
  document.getElementById("dragDropArea").style.display = "flex";
  document.getElementById("uploadStaticRules").style.display = "block";
  document.getElementById("validationProgress").style.display = "none";
  document.getElementById("validationResultCard").style.display = "none";
  document.getElementById("invoiceFileInput").value = "";
  CURRENT_SIMULATED_INVOICE = null;
}

// ==========================================
// 6. Settings Panel Mechanics
// ==========================================
function initSettingsMechanics() {
  document.getElementById("addNewUserBtn").addEventListener("click", async () => {
    const auditorName = prompt("Enter auditor's full name:");
    if (!auditorName) return;
    const auditorEmail = prompt("Enter company email address:");
    if (!auditorEmail) return;
    
    const splitName = auditorName.split(" ");
    const firstName = splitName[0];
    const lastName = splitName.slice(1).join(" ") || "Auditor";

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: auditorEmail,
          password: "AuditorPassword@123",
          first_name: firstName,
          last_name: lastName,
          role: "Auditor"
        })
      });

      if (res.ok) {
        showToast(`User successfully created in MySQL.`);
        loadUsersFromBackend();
      } else {
        const error = await res.json();
        showToast(error.detail || "Only administrators can create users.");
      }
    } catch (err) {
      showToast("Invitation failed due to unauthorized roles.");
    }
  });
}

// ==========================================
// 8. AI Assistant Chatbot panel (Connected to REST)
// ==========================================
function initAiAssistantMechanics() {
  const aiFab = document.getElementById("aiFab");
  const aiDrawer = document.getElementById("aiDrawer");
  const closeAiDrawer = document.getElementById("closeAiDrawer");
  const btnSendAi = document.getElementById("btnSendAi");
  const aiInput = document.getElementById("aiInput");
  const aiChatBody = document.getElementById("aiChatBody");

  aiFab.addEventListener("click", () => {
    aiDrawer.classList.add("open");
  });

  closeAiDrawer.addEventListener("click", () => {
    aiDrawer.classList.remove("open");
  });

  btnSendAi.addEventListener("click", submitPrompt);
  aiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitPrompt();
  });

  async function submitPrompt() {
    const text = aiInput.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    aiInput.value = "";

    const typingIndicator = showTypingIndicator();

    try {
      const res = await fetch(`${API_BASE_URL}/ai/ask`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prompt: text })
      });

      typingIndicator.remove();

      if (res.ok) {
        const data = await res.json();
        appendMessage(data.message, "ai");
      } else {
        appendMessage("Unable to connect to Copilot AI. Access token expired.", "ai");
      }
    } catch (err) {
      typingIndicator.remove();
      appendMessage("Network failure, could not contact AI service.", "ai");
    }
  }

  function appendMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `ai-msg ${sender}`;
    div.textContent = text;
    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const div = document.createElement("div");
    div.className = "ai-msg ai";
    div.innerHTML = `
      <div style="display: flex; gap: 4px; align-items: center; padding: 4px 0;">
        <span style="width: 4px; height: 4px; background: #94a3b8; border-radius: 50%;" class="bounce-1"></span>
        <span style="width: 4px; height: 4px; background: #94a3b8; border-radius: 50%;" class="bounce-2"></span>
        <span style="width: 4px; height: 4px; background: #94a3b8; border-radius: 50%;" class="bounce-3"></span>
      </div>
      <style>
        .bounce-1 { animation: bounce 1.2s infinite; }
        .bounce-2 { animation: bounce 1.2s infinite 0.15s; }
        .bounce-3 { animation: bounce 1.2s infinite 0.3s; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      </style>
    `;
    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
    return div;
  }
}

// ==========================================
// SVG Chart Drawing Math Calculations
// ==========================================
function drawValidationChart(dailyTrend) {
  const svg = document.getElementById("dashboardLineChart");
  if (!svg) return;
  
  const vals = dailyTrend.map(d => d.validated + d.flagged + d.rejected);
  const maxVal = Math.max(...vals, 10);
  
  const textElements = svg.querySelectorAll("text.chart-axis-text");
  if (textElements.length >= 4) {
    textElements[0].textContent = Math.round(maxVal);
    textElements[1].textContent = Math.round(maxVal * 2 / 3);
    textElements[2].textContent = Math.round(maxVal / 3);
    textElements[3].textContent = "0";
  }
  
  const xCoords = [60, 140, 220, 300, 380, 460, 540];
  const points = [];
  
  dailyTrend.forEach((item, index) => {
    if (index >= xCoords.length) return;
    const total = item.validated + item.flagged + item.rejected;
    const x = xCoords[index];
    const y = 180 - ((total / maxVal) * (180 - 45));
    points.push({ x, y, total, label: item.name });
    
    if (textElements[4 + index]) {
      textElements[4 + index].textContent = item.name;
    }
  });
  
  let lineD = "";
  let areaD = "";
  if (points.length > 0) {
    lineD = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ");
    areaD = `M ${points[0].x},180 L ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${points[points.length-1].x},180 Z`;
  }
  
  const linePath = svg.querySelector("path.chart-line");
  const areaPath = svg.querySelector("path.chart-area");
  if (linePath) linePath.setAttribute("d", lineD);
  if (areaPath) areaPath.setAttribute("d", areaD);
  
  svg.querySelectorAll("circle.chart-point").forEach(c => c.remove());
  
  points.forEach(p => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "chart-point");
    circle.setAttribute("cx", p.x);
    circle.setAttribute("cy", p.y);
    circle.setAttribute("r", "4");
    circle.setAttribute("data-value", `${p.total} Invoices (${p.label})`);
    svg.appendChild(circle);
  });
  
  connectChartEvents();
}

function updateSupplierPerformanceRates(suppliersTrend) {
  const reportsPanel = document.getElementById("view-reports");
  if (!reportsPanel) return;

  const barContainer = reportsPanel.querySelector(".section-body div[style*='flex-direction: column']");
  if (!barContainer) return;

  barContainer.innerHTML = "";
  suppliersTrend.slice(0, 4).forEach(sup => {
    const bar = document.createElement("div");
    bar.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
        <span>${sup.name}</span>
        <strong class="legend-val">${sup.invoices} Logged (${sup.pass_rate}% Pass)</strong>
      </div>
      <div style="height: 8px; background-color: var(--bg-app); border-radius: 4px; overflow: hidden;">
        <div style="width: ${sup.pass_rate}%; height: 100%; background-color: ${sup.pass_rate >= 80 ? "var(--success)" : "var(--warning)"}; border-radius: 4px;"></div>
      </div>
    `;
    barContainer.appendChild(bar);
  });
}

function connectChartEvents() {
  const points = document.querySelectorAll(".chart-point");
  const tooltip = document.getElementById("chartTooltip");
  const container = document.getElementById("lineChartContainer");
  
  points.forEach(point => {
    point.addEventListener("mouseenter", (e) => {
      const value = point.getAttribute("data-value");
      tooltip.textContent = value;
      tooltip.style.display = "block";
      
      const rect = point.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      
      const left = rect.left - parentRect.left + (rect.width / 2);
      const top = rect.top - parentRect.top;
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    
    point.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}

// ==========================================
// User Profile Subtabs, Uploads, & Changes Logic
// ==========================================
function initUserProfileMechanics() {
  const trigger = document.getElementById("headerProfileTrigger");
  const dropdown = document.getElementById("headerProfileDropdown");

  if (trigger && dropdown) {
    // Toggle Dropdown menu
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("show");
    });

    // Dropdown options click triggers
    const dropdownItems = dropdown.querySelectorAll(".dropdown-item[data-profile-tab]");
    dropdownItems.forEach(item => {
      item.addEventListener("click", () => {
        const tab = item.getAttribute("data-profile-tab");
        
        // Navigate to View Profile section tab
        const sidebarProfileItem = document.querySelector('.sidebar-nav .nav-item[data-tab="profile"]');
        if (sidebarProfileItem) {
          sidebarProfileItem.click();
        } else {
          // Fallback: manually open profile tab
          document.querySelectorAll(".sidebar-nav .nav-item").forEach(i => i.classList.remove("active"));
          document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
          
          const viewProf = document.getElementById("view-profile");
          if (viewProf) viewProf.classList.add("active");
          const viewTitle = document.getElementById("viewTitle");
          if (viewTitle) viewTitle.textContent = "User Profile Settings";
        }

        // Select matching profile subtab
        const subtabBtn = document.querySelector(`.profile-tab-btn[data-subtab="${tab === 'profile' ? 'my-profile' : tab === 'settings' ? 'account-settings' : 'change-password'}"]`);
        if (subtabBtn) subtabBtn.click();
      });
    });
  }

  // Profile View Sub-tabs switches
  const subtabBtns = document.querySelectorAll(".profile-tab-btn");
  subtabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      subtabBtns.forEach(b => {
        b.classList.remove("active");
        b.style.color = "var(--text-muted)";
        b.style.borderBottomColor = "transparent";
      });

      btn.classList.add("active");
      btn.style.color = "var(--primary)";
      btn.style.borderBottomColor = "var(--primary)";

      const target = btn.getAttribute("data-subtab");
      document.querySelectorAll(".profile-subtab-content").forEach(c => c.style.display = "none");
      document.getElementById(`subtab-${target}`).style.display = "block";
    });
  });

  // Dynamic Password Strength gauge checks
  const newPwInput = document.getElementById("pwNew");
  newPwInput.addEventListener("input", () => {
    const pw = newPwInput.value;
    const strengthText = document.getElementById("strengthText");
    const bar1 = document.getElementById("strength-bar-1");
    const bar2 = document.getElementById("strength-bar-2");
    const bar3 = document.getElementById("strength-bar-3");

    // Reset indicator classes
    [bar1, bar2, bar3].forEach(b => {
      b.className = "";
      b.style.backgroundColor = "#e2e8f0";
    });

    if (!pw) {
      strengthText.textContent = "Strength: Enter password";
      return;
    }

    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    const hasNum = /[0-9]/.test(pw);

    if (pw.length < 8) {
      strengthText.textContent = "Strength: Weak (Min 8 chars)";
      bar1.className = "strength-weak";
    } else if (pw.length >= 8 && (!hasSpecial || !hasNum)) {
      strengthText.textContent = "Strength: Medium";
      bar1.className = "strength-medium";
      bar2.className = "strength-medium";
    } else {
      strengthText.textContent = "Strength: Strong";
      bar1.className = "strength-strong";
      bar2.className = "strength-strong";
      bar3.className = "strength-strong";
    }
  });

  // Upload/replace profile photo hooks
  const uploadBtn = document.getElementById("btnUploadPhoto");
  const photoInput = document.getElementById("profilePhotoInput");
  const removeBtn = document.getElementById("btnRemovePhoto");

  uploadBtn.addEventListener("click", () => {
    photoInput.click();
  });

  photoInput.addEventListener("change", async () => {
    if (photoInput.files.length > 0) {
      const file = photoInput.files[0];
      
      // Limit 5MB size check
      if (file.size > 5 * 1024 * 1024) {
        showToast("Error: Profile photo exceeds 5MB size limit.");
        return;
      }

      // Preview photo locally
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById("profilePreviewImage");
        preview.src = e.target.result;
        preview.style.display = "block";
        document.getElementById("profileTextAvatar").style.display = "none";
      };
      reader.readAsDataURL(file);

      // Upload to MySQL FastAPI
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE_URL}/users/profile/photo`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData
        });
        if (res.ok) {
          showToast("Profile photo updated successfully.");
          await loadUserProfile();
        }
      } catch (err) {
        showToast("Failed to upload photo to server.");
      }
    }
  });

  // Remove photo handler
  removeBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to remove your profile photo?")) {
      try {
        const res = await fetch(`${API_BASE_URL}/users/profile/photo`, {
          method: "DELETE",
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast("Profile photo removed.");
          await loadUserProfile();
        }
      } catch (err) {
        showToast("Failed to remove photo.");
      }
    }
  });
}

// Fetch user profile details from database
async function loadUserProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const profile = await res.json();
      
      // Bind Edit Form inputs
      document.getElementById("profFirstName").value = profile.first_name || "";
      document.getElementById("profLastName").value = profile.last_name || "";
      document.getElementById("profCompany").value = profile.company_name || "";
      document.getElementById("profJobTitle").value = profile.job_title || "";
      document.getElementById("profPhone").value = profile.phone || "";
      document.getElementById("profTaxId").value = profile.tax_id || "";
      document.getElementById("profCountry").value = profile.country || "";
      document.getElementById("profCity").value = profile.city || "";
      document.getElementById("profAddress").value = profile.address || "";
      document.getElementById("profPostal").value = profile.postal_code || "";
      document.getElementById("profBio").value = profile.bio || "";

      // Bind Preferences switches
      document.getElementById("prefLanguage").value = profile.language_preference || "en";
      document.getElementById("prefTheme").value = profile.theme_preference || "light";
      document.getElementById("prefTimezone").value = profile.timezone || "UTC";

      document.getElementById("prefNotifEmail").checked = profile.email_notifications;
      document.getElementById("prefNotifSystem").checked = profile.system_notifications;
      document.getElementById("prefNotifFraud").checked = profile.fraud_alerts;
      document.getElementById("prefNotifValidation").checked = profile.validation_alerts;

      // Update name text
      document.querySelectorAll(".user-name").forEach(el => el.textContent = `${profile.first_name} ${profile.last_name}`);
      document.querySelectorAll(".user-role-badge").forEach(el => el.textContent = profile.role);

      // Render Photo preview
      const preview = document.getElementById("profilePreviewImage");
      const textAvatar = document.getElementById("profileTextAvatar");
      const headerAvatar = document.getElementById("headerUserAvatar");

      if (profile.profile_photo) {
        const photoUrl = profile.profile_photo.startsWith("http") ? profile.profile_photo : `http://localhost:8000/${profile.profile_photo}`;
        preview.src = photoUrl;
        preview.style.display = "block";
        textAvatar.style.display = "none";
        
        if (headerAvatar) {
          headerAvatar.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
      } else {
        preview.style.display = "none";
        textAvatar.style.display = "flex";
        
        const initials = ((profile.first_name[0] || "") + (profile.last_name[0] || "")).toUpperCase();
        textAvatar.textContent = initials;
        if (headerAvatar) {
          headerAvatar.textContent = initials;
          headerAvatar.style.background = "var(--primary-light)";
          headerAvatar.style.color = "var(--primary)";
        }
      }

      // Bind Security Metadata card details
      document.getElementById("metaLastLogin").textContent = profile.last_login ? formatLogTime(profile.last_login) : "Now";
      document.getElementById("metaLastPwChange").textContent = profile.last_password_change ? formatDate(profile.last_password_change) : "Never";

      // Detect and bind client user browser details
      const userAgent = navigator.userAgent;
      let browserName = "Unknown Browser";
      if (userAgent.match(/chrome|chromium|crios/i)) browserName = "Chrome";
      else if (userAgent.match(/firefox|fxios/i)) browserName = "Firefox";
      else if (userAgent.match(/safari/i)) browserName = "Safari";
      else if (userAgent.match(/edg/i)) browserName = "Edge";

      let osName = "Unknown OS";
      if (navigator.appVersion.indexOf("Win") !== -1) osName = "Windows";
      else if (navigator.appVersion.indexOf("Mac") !== -1) osName = "MacOS";
      else if (navigator.appVersion.indexOf("X11") !== -1) osName = "UNIX";
      else if (navigator.appVersion.indexOf("Linux") !== -1) osName = "Linux";

      document.getElementById("metaOs").textContent = osName;
      document.getElementById("metaBrowser").textContent = browserName;
    }
  } catch (err) {
    console.error("Failed to load user profile variables: ", err);
  }
}

// Save User profile updates to MySQL database
async function saveUserProfile() {
  const body = {
    first_name: document.getElementById("profFirstName").value.trim(),
    last_name: document.getElementById("profLastName").value.trim(),
    company_name: document.getElementById("profCompany").value.trim(),
    job_title: document.getElementById("profJobTitle").value.trim(),
    phone: document.getElementById("profPhone").value.trim(),
    tax_id: document.getElementById("profTaxId").value.trim(),
    country: document.getElementById("profCountry").value.trim(),
    city: document.getElementById("profCity").value.trim(),
    address: document.getElementById("profAddress").value.trim(),
    postal_code: document.getElementById("profPostal").value.trim(),
    bio: document.getElementById("profBio").value.trim()
  };

  try {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    if (res.ok) {
      showToast("Profile details updated successfully.");
      
      // Update local credentials
      localStorage.setItem("user_first_name", body.first_name);
      localStorage.setItem("user_last_name", body.last_name);
      
      checkAuthState();
    } else {
      showToast("Profile update rejected.");
    }
  } catch (err) {
    showToast("Profile update failed.");
  }
}

// Save Account preference changes
async function saveUserPreferences() {
  const body = {
    language_preference: document.getElementById("prefLanguage").value,
    theme_preference: document.getElementById("prefTheme").value,
    timezone: document.getElementById("prefTimezone").value,
    email_notifications: document.getElementById("prefNotifEmail").checked,
    system_notifications: document.getElementById("prefNotifSystem").checked,
    fraud_alerts: document.getElementById("prefNotifFraud").checked,
    validation_alerts: document.getElementById("prefNotifValidation").checked,
    report_notifications: true
  };

  try {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    if (res.ok) {
      showToast("Account settings saved successfully.");
      
      // Apply theme preferences changes
      if (body.theme_preference === "dark") {
        document.body.classList.add("dark-theme");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.body.classList.remove("dark-theme");
        document.documentElement.setAttribute("data-theme", "light");
      }
      
      loadUserProfile();
    }
  } catch (err) {
    showToast("Preferences update failed.");
  }
}

// Submit Password updates request
async function changeUserPassword() {
  const currentPassword = document.getElementById("pwCurrent").value;
  const newPassword = document.getElementById("pwNew").value;
  const confirmPassword = document.getElementById("pwConfirm").value;

  if (newPassword !== confirmPassword) {
    showToast("New passwords mismatch.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });
    if (res.ok) {
      showToast("Password updated successfully.");
      document.getElementById("pwCurrent").value = "";
      document.getElementById("pwNew").value = "";
      document.getElementById("pwConfirm").value = "";
      
      // Clear strength indicators
      const bar1 = document.getElementById("strength-bar-1");
      const bar2 = document.getElementById("strength-bar-2");
      const bar3 = document.getElementById("strength-bar-3");
      [bar1, bar2, bar3].forEach(b => {
        b.className = "";
        b.style.backgroundColor = "#e2e8f0";
      });
      document.getElementById("strengthText").textContent = "Strength: Enter password";

      loadUserProfile();
    } else {
      const error = await res.json();
      showToast(error.detail || "Incorrect current password credentials.");
    }
  } catch (err) {
    showToast("Server rejected credentials update.");
  }
}

// ==========================================
// UI Helper Utilities
// ==========================================

function showToast(message) {
  const container = document.getElementById("toastContainer");
  
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <i data-lucide="info" style="width: 16px; height: 16px;"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.animation = "toastIn 0.3s reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatLogTime(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return formatDate(dateStr);
}
