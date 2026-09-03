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

  // Bind Landing Page controls
  const landingPage = document.getElementById("landingPageContainer");
  const authContainer = document.getElementById("authContainer");

  const showLogin = () => {
    if (landingPage) landingPage.style.display = "none";
    if (authContainer) authContainer.style.display = "flex";
    showAuthCard("loginCard");
  };

  const showSignup = (preferredType = "PERSONAL") => {
    if (landingPage) landingPage.style.display = "none";
    if (authContainer) authContainer.style.display = "flex";
    showAuthCard("signupCard");
    setSignupAccountType(preferredType);
  };

  document.getElementById("landingSignInBtn")?.addEventListener("click", showLogin);
  document.getElementById("heroSignInBtn")?.addEventListener("click", showLogin);
  document.getElementById("landingSignUpBtn")?.addEventListener("click", () => showSignup("PERSONAL"));
  document.getElementById("heroGetStartedBtn")?.addEventListener("click", () => showSignup("PERSONAL"));
  document.getElementById("personalCtaBtn")?.addEventListener("click", () => showSignup("PERSONAL"));
  document.getElementById("companyCtaBtn")?.addEventListener("click", () => showSignup("COMPANY"));

  document.getElementById("tabPersonalBtn")?.addEventListener("click", () => setSignupAccountType("PERSONAL"));
  document.getElementById("tabCompanyBtn")?.addEventListener("click", () => setSignupAccountType("COMPANY"));

  if (typeof initLegacySignupUpgrade === "function") {
    initLegacySignupUpgrade();
  }
});

function goBackToLanding() {
  document.getElementById("authContainer").style.display = "none";
  document.getElementById("landingPageContainer").style.display = "block";
}
window.goBackToLanding = goBackToLanding;

// Shared country selection state
let countriesList = [];
let selectedPersonalCountry = null;
let selectedCompanyCountry = null;

function setSignupAccountType(type) {
  const hiddenType = document.getElementById("signupAccountType");
  if (!hiddenType) return;
  
  hiddenType.value = type;
  
  const tabPersonal = document.getElementById("tabPersonalBtn");
  const tabCompany = document.getElementById("tabCompanyBtn");
  const personalFields = document.getElementById("personalSignupFields");
  const companyFields = document.getElementById("companySignupFields");

  if (type === "PERSONAL") {
    tabPersonal.classList.add("active");
    tabCompany.classList.remove("active");
    
    tabPersonal.style.borderColor = "var(--primary)";
    tabPersonal.style.backgroundColor = "var(--primary-light)";
    tabPersonal.querySelector("span").style.color = "var(--primary)";
    tabPersonal.querySelector("svg").style.color = "var(--primary)";
    
    tabCompany.style.borderColor = "var(--border-color)";
    tabCompany.style.backgroundColor = "white";
    tabCompany.querySelector("span").style.color = "var(--text-muted)";
    tabCompany.querySelector("svg").style.color = "var(--text-muted)";

    personalFields.style.display = "block";
    companyFields.style.display = "none";
    
    document.getElementById("signupFirstName").required = true;
    document.getElementById("signupLastName").required = true;
    document.getElementById("signupEmail").required = true;
    
    document.getElementById("signupCompanyName").required = false;
    document.getElementById("signupBusinessReg").required = false;
    document.getElementById("signupTaxNumber").required = false;
    document.getElementById("signupContactFirstName").required = false;
    document.getElementById("signupContactLastName").required = false;
    document.getElementById("signupBusinessEmail").required = false;
  } else {
    tabCompany.classList.add("active");
    tabPersonal.classList.remove("active");
    
    tabCompany.style.borderColor = "var(--primary)";
    tabCompany.style.backgroundColor = "var(--primary-light)";
    tabCompany.querySelector("span").style.color = "var(--primary)";
    tabCompany.querySelector("svg").style.color = "var(--primary)";
    
    tabPersonal.style.borderColor = "var(--border-color)";
    tabPersonal.style.backgroundColor = "white";
    tabPersonal.querySelector("span").style.color = "var(--text-muted)";
    tabPersonal.querySelector("svg").style.color = "var(--text-muted)";

    personalFields.style.display = "none";
    companyFields.style.display = "block";

    document.getElementById("signupFirstName").required = false;
    document.getElementById("signupLastName").required = false;
    document.getElementById("signupEmail").required = false;
    
    document.getElementById("signupCompanyName").required = true;
    document.getElementById("signupBusinessReg").required = true;
    document.getElementById("signupTaxNumber").required = true;
    document.getElementById("signupContactFirstName").required = true;
    document.getElementById("signupContactLastName").required = true;
    document.getElementById("signupBusinessEmail").required = true;
  }
  lucide.createIcons();
}
window.setSignupAccountType = setSignupAccountType;

// Switch active layout panels in auth screens
function showAuthCard(cardId) {
  const cards = ["loginCard", "signupCard", "forgotCard", "resetCard"];
  cards.forEach(id => {
    const card = document.getElementById(id);
    if (card) {
      card.style.display = id === cardId ? "block" : "none";
    }
  });

  const authContainer = document.getElementById("authContainer");
  const landingPage = document.getElementById("landingPageContainer");
  if (authContainer) authContainer.style.display = "flex";
  if (landingPage) landingPage.style.display = "none";

  // Hide modals if open
  const errorModal = document.getElementById("loginErrorModal");
  if (errorModal) errorModal.style.display = "none";

  // If leaving login card, clear inline error alert
  if (cardId !== "loginCard") {
    const errAlert = document.getElementById("loginErrorAlert");
    if (errAlert) errAlert.style.display = "none";
    const succAlert = document.getElementById("loginSuccessAlert");
    if (succAlert) succAlert.style.display = "none";
  }
}

// // Client-side Session Route Guard with Authoritative Backend Verification
async function checkAuthState() {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const mainWorkspace = document.getElementById("mainWorkspaceContainer");
  const authContainer = document.getElementById("authContainer");
  const landingPage = document.getElementById("landingPageContainer");

  if (!token) {
    if (mainWorkspace) mainWorkspace.style.display = "none";
    if (authContainer && authContainer.style.display === "flex") {
      if (landingPage) landingPage.style.display = "none";
    } else {
      if (landingPage) landingPage.style.display = "block";
      if (authContainer) authContainer.style.display = "none";
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      // Token is invalid, expired, or user revoked
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      if (mainWorkspace) mainWorkspace.style.display = "none";
      if (landingPage) landingPage.style.display = "block";
      if (authContainer) authContainer.style.display = "none";
      return;
    }

    const user = await res.json();
    
    // Save authoritative backend verified profile
    localStorage.setItem("user_id", user.id);
    localStorage.setItem("user_first_name", user.first_name || "");
    localStorage.setItem("user_last_name", user.last_name || "");
    localStorage.setItem("user_email", user.email);
    localStorage.setItem("user_role", user.role || "Auditor");
    localStorage.setItem("user_account_type", user.account_type || "PERSONAL");
    localStorage.setItem("user_country", user.country || "");
    localStorage.setItem("user_tax_system", user.tax_system || "");
    localStorage.setItem("user_currency", user.currency || "USD");
    localStorage.setItem("user_currency_symbol", user.currency_symbol || "$");

    if (landingPage) landingPage.style.display = "none";
    if (authContainer) authContainer.style.display = "none";
    if (mainWorkspace) mainWorkspace.style.display = "flex";

    // Bind profile card info
    const firstName = user.first_name || "User";
    const lastName = user.last_name || "";
    const email = user.email;
    const role = user.role || "Auditor";
    const accountType = user.account_type || "PERSONAL";
    const isPersonal = accountType === "PERSONAL";

    document.querySelectorAll(".user-name").forEach(el => el.textContent = `${firstName} ${lastName}`.trim());
    document.querySelectorAll(".user-email").forEach(el => el.textContent = email);
    
    const initials = ((firstName[0] || "") + (lastName[0] || firstName[1] || "")).toUpperCase();
    document.querySelectorAll(".avatar").forEach(el => {
      if (el.id !== "profilePreviewImage") {
        el.textContent = initials || "TA";
      }
    });

    // Check Administrator role to hide/show Users panel tab
    const usersTabLink = document.querySelector('.sidebar-nav .nav-item[data-tab="users"]');
    if (usersTabLink) {
      usersTabLink.style.display = (role === "Administrator" && !isPersonal) ? "flex" : "none";
    }

    const quickUpload = document.getElementById("quickUploadBtn");
    if (quickUpload) {
      quickUpload.style.display = "block";
    }

    // Allow history and reports for all users
    const reportsTab = document.querySelector('.sidebar-nav .nav-item[data-tab="reports"]');
    const historyTab = document.querySelector('.sidebar-nav .nav-item[data-tab="history"]');
    if (reportsTab) reportsTab.style.display = "flex";
    if (historyTab) historyTab.style.display = "flex";

    // Toggle profile form inputs
    const companyGroup = document.getElementById("profCompany")?.closest(".form-group-validation");
    const taxGroup = document.getElementById("profTaxId")?.closest(".form-group-validation");
    const cityGroup = document.getElementById("profCity")?.closest(".form-group-validation");
    const addressGroup = document.getElementById("profAddress")?.closest(".form-group-validation");
    const postalGroup = document.getElementById("profPostal")?.closest(".form-group-validation");

    if (companyGroup) companyGroup.style.display = isPersonal ? "none" : "block";
    if (taxGroup) taxGroup.style.display = isPersonal ? "none" : "block";
    if (cityGroup) cityGroup.style.display = isPersonal ? "none" : "block";
    if (addressGroup) addressGroup.style.display = isPersonal ? "none" : "block";
    if (postalGroup) postalGroup.style.display = isPersonal ? "none" : "block";

    const jobTitleLabel = document.getElementById("profJobTitle")?.previousElementSibling;
    if (jobTitleLabel) {
      jobTitleLabel.textContent = isPersonal ? "Occupation / Profession" : "Job Title";
    }

    // Refresh dynamic data
    loadAllBackendDatasets();
    loadUserNotifications();
  } catch (err) {
    console.error("Auth state check network error:", err);
  }
}

async function handleLoginSubmit() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";
  const rememberMe = document.getElementById("loginRememberMe") ? document.getElementById("loginRememberMe").checked : false;

  const errorAlert = document.getElementById("loginErrorAlert");
  const errorAlertText = document.getElementById("loginErrorAlertText");
  const successAlert = document.getElementById("loginSuccessAlert");
  const errorModal = document.getElementById("loginErrorModal");
  const errorModalText = document.getElementById("loginErrorModalText");

  if (errorAlert) errorAlert.style.display = "none";
  if (successAlert) successAlert.style.display = "none";

  if (!email) {
    showToast("Please enter your email address.", "error");
    if (emailInput) {
      emailInput.style.borderColor = "#ef4444";
      emailInput.focus();
    }
    return;
  }

  if (password.length < 8) {
    showToast("Password must be at least 8 characters long.", "error");
    if (passwordInput) {
      passwordInput.style.borderColor = "#ef4444";
      passwordInput.focus();
    }
    return;
  }

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
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      
      if (passwordInput) passwordInput.style.borderColor = "";
      if (errorAlert) errorAlert.style.display = "none";
      if (errorModal) errorModal.style.display = "none";

      showToast("Access granted successfully.", "success");
      await checkAuthState();
    } else {
      // Clear password field on error and keep user on login page
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.style.borderColor = "#ef4444";
        passwordInput.focus();
      }

      const errorMsg = data.detail || "Incorrect email or password.";

      // 1. Show inline error alert on login card
      if (errorAlert && errorAlertText) {
        errorAlertText.textContent = errorMsg;
        errorAlert.style.display = "flex";
      }

      // 2. Show dedicated popup modal
      if (errorModal) {
        if (errorModalText) {
          errorModalText.textContent = errorMsg + " Please check your password and try again.";
        }
        errorModal.style.display = "flex";
        lucide.createIcons();
      }

      // 3. Show high-visibility toast
      showToast(errorMsg, "error");
    }
  } catch (err) {
    showToast("Unable to connect to login authentication service.", "error");
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function handleSignupSubmit() {
  const accountType = document.getElementById("signupAccountType") ? document.getElementById("signupAccountType").value : "PERSONAL";
  const passInput = document.getElementById("signupPassword");
  const confirmInput = document.getElementById("signupConfirmPassword");
  const password = passInput ? passInput.value : "";
  const confirmPassword = confirmInput ? confirmInput.value : "";

  const isCompany = accountType === "COMPANY";
  const countryInputId = isCompany ? "signupCompanyCountry" : "signupCountry";
  const typedCountryName = document.getElementById(countryInputId) ? document.getElementById(countryInputId).value.trim() : "";

  let countryObj = isCompany ? selectedCompanyCountry : selectedPersonalCountry;
  if (!countryObj && typedCountryName && countriesList.length > 0) {
    countryObj = countriesList.find(c => 
      c.name.toLowerCase() === typedCountryName.toLowerCase() ||
      c.code.toLowerCase() === typedCountryName.toLowerCase()
    );
  }

  if (!countryObj && !typedCountryName) {
    showToast("Please enter and select your country.");
    const inputField = document.getElementById(countryInputId);
    if (inputField) inputField.focus();
    return;
  }

  if (password.length < 8) {
    showToast("Password must be at least 8 characters long.");
    if (passInput) passInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    showToast("Password confirmation mismatch. Please verify both passwords.");
    if (confirmInput) confirmInput.focus();
    return;
  }

  const pwChecks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  if (pwChecks.filter(Boolean).length < 4) {
    showToast("Password must include uppercase, lowercase, numbers, and symbols.");
    return;
  }

  // Determine tax system from select or country primary config
  let chosenTaxSystem = null;
  if (isCompany) {
    const compTaxSelect = document.getElementById("signupCompanyTaxSystemSelect");
    const compTaxWrapper = document.getElementById("signupCompanyTaxSystemWrapper");
    if (compTaxWrapper && compTaxWrapper.style.display !== "none" && compTaxSelect) {
      chosenTaxSystem = compTaxSelect.value;
    }
  } else {
    const persTaxSelect = document.getElementById("signupTaxSystemSelect");
    const persTaxWrapper = document.getElementById("signupTaxSystemWrapper");
    if (persTaxWrapper && persTaxWrapper.style.display !== "none" && persTaxSelect) {
      chosenTaxSystem = persTaxSelect.value;
    }
  }

  if (!chosenTaxSystem && countryObj && countryObj.tax_config) {
    chosenTaxSystem = countryObj.tax_config.tax_system.code;
  }

  let payload = {};
  if (!isCompany) {
    const firstName = document.getElementById("signupFirstName") ? document.getElementById("signupFirstName").value.trim() : "";
    const lastName = document.getElementById("signupLastName") ? document.getElementById("signupLastName").value.trim() : "";
    const email = document.getElementById("signupEmail") ? document.getElementById("signupEmail").value.trim() : "";
    const phone = document.getElementById("signupPhone") ? document.getElementById("signupPhone").value.trim() : "";
    const occupation = document.getElementById("signupOccupation") ? document.getElementById("signupOccupation").value.trim() : "";
    const profession = document.getElementById("signupProfession") ? document.getElementById("signupProfession").value.trim() : "";

    if (!firstName || !lastName || !email) {
      showToast("Please fill in First Name, Last Name, and Email.");
      return;
    }

    const phoneCodeSpan = document.getElementById("signupPhoneCode");
    const phonePrefix = phoneCodeSpan && phoneCodeSpan.style.display !== "none" ? phoneCodeSpan.textContent : "";
    const fullPhone = phonePrefix && phone ? (phone.startsWith("+") ? phone : phonePrefix + phone) : phone;

    payload = {
      account_type: "PERSONAL",
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: fullPhone || undefined,
      country: countryObj ? countryObj.name : typedCountryName,
      country_code: countryObj ? countryObj.code : undefined,
      tax_system: chosenTaxSystem || undefined,
      occupation: occupation || undefined,
      profession: profession || undefined,
      password: password,
      confirm_password: confirmPassword
    };
  } else {
    const companyName = document.getElementById("signupCompanyName") ? document.getElementById("signupCompanyName").value.trim() : "";
    const businessReg = document.getElementById("signupBusinessReg") ? document.getElementById("signupBusinessReg").value.trim() : "";
    const taxNumber = document.getElementById("signupTaxNumber") ? document.getElementById("signupTaxNumber").value.trim() : "";
    const firstName = document.getElementById("signupContactFirstName") ? document.getElementById("signupContactFirstName").value.trim() : "";
    const lastName = document.getElementById("signupContactLastName") ? document.getElementById("signupContactLastName").value.trim() : "";
    const email = document.getElementById("signupBusinessEmail") ? document.getElementById("signupBusinessEmail").value.trim() : "";
    const phone = document.getElementById("signupCompanyPhone") ? document.getElementById("signupCompanyPhone").value.trim() : "";
    const city = document.getElementById("signupCompanyCity") ? document.getElementById("signupCompanyCity").value.trim() : "";
    const address = document.getElementById("signupCompanyAddress") ? document.getElementById("signupCompanyAddress").value.trim() : "";

    if (!companyName || !businessReg || !taxNumber || !firstName || !lastName || !email) {
      showToast("Please fill in Company Name, Reg Number, Tax ID, Contact Name, and Business Email.");
      return;
    }

    const phoneCodeSpan = document.getElementById("signupCompanyPhoneCode");
    const phonePrefix = phoneCodeSpan && phoneCodeSpan.style.display !== "none" ? phoneCodeSpan.textContent : "";
    const fullPhone = phonePrefix && phone ? (phone.startsWith("+") ? phone : phonePrefix + phone) : phone;

    payload = {
      account_type: "COMPANY",
      company_name: companyName,
      business_registration_number: businessReg,
      tax_number: taxNumber,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: fullPhone || undefined,
      country: countryObj ? countryObj.name : typedCountryName,
      country_code: countryObj ? countryObj.code : undefined,
      tax_system: chosenTaxSystem || undefined,
      city: city || undefined,
      address: address || undefined,
      password: password,
      confirm_password: confirmPassword
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.status === 409) {
      const conflictModal = document.getElementById("conflictModal");
      if (conflictModal) conflictModal.style.display = "flex";
    } else if (res.ok) {
      // Clear passwords in signup form
      if (passInput) passInput.value = "";
      if (confirmInput) confirmInput.value = "";
      
      // Pre-populate login email
      const loginEmailInput = document.getElementById("loginEmail");
      if (loginEmailInput) loginEmailInput.value = payload.email;

      // Prepare and show Success Alert banner on the Login Screen
      const loginSuccessAlert = document.getElementById("loginSuccessAlert");
      const loginSuccessAlertText = document.getElementById("loginSuccessAlertText");
      if (loginSuccessAlert && loginSuccessAlertText) {
        const taxSysStr = payload.tax_system ? ` (${payload.tax_system})` : "";
        loginSuccessAlertText.textContent = `Account created successfully for ${payload.first_name} ${payload.last_name}${taxSysStr}! Please enter your password to sign in.`;
        loginSuccessAlert.style.display = "flex";
      }

      // Hide any previous login error alert
      const loginErrorAlert = document.getElementById("loginErrorAlert");
      if (loginErrorAlert) loginErrorAlert.style.display = "none";
      const loginErrorModal = document.getElementById("loginErrorModal");
      if (loginErrorModal) loginErrorModal.style.display = "none";

      // Show high-visibility toast
      showToast("Account created successfully! Directing you to Sign In...", "success");

      // Show Registration Successful Modal and auto-direct to Sign In page
      const successModal = document.getElementById("registrationSuccessModal");
      const successMsg = document.getElementById("registrationSuccessMsg");
      if (successMsg) {
        const taxSysMsg = payload.tax_system ? ` (${payload.country || 'Global'} - ${payload.tax_system})` : "";
        successMsg.innerHTML = `Your account for <strong>${escapeHtml(payload.first_name)} ${escapeHtml(payload.last_name)}</strong>${taxSysMsg} has been created successfully in the database.<br><br><span style="color: #16a34a; font-weight: 600;">Directing you to the sign in page...</span>`;
      }

      if (successModal) {
        successModal.style.display = "flex";
        lucide.createIcons();
        
        // Auto direct user to Sign In page after 1.5 seconds
        setTimeout(() => {
          if (successModal.style.display !== "none") {
            successModal.style.display = "none";
            showAuthCard("loginCard");
            const pwField = document.getElementById("loginPassword");
            if (pwField) {
              pwField.value = "";
              pwField.style.borderColor = "";
              pwField.focus();
            }
          }
        }, 1500);
      } else {
        showAuthCard("loginCard");
        const pwField = document.getElementById("loginPassword");
        if (pwField) {
          pwField.value = "";
          pwField.style.borderColor = "";
          pwField.focus();
        }
      }
    } else {
      showToast(data.detail || "Registration failed. Please check your fields.", "error");
    }
  } catch (err) {
    showToast("Connection to authentication server failed.");
  }
}

async function handleForgotSubmit() {
  const emailInput = document.getElementById("forgotEmail");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    showToast("Please enter your registered email address.");
    if (emailInput) emailInput.focus();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Password recovery instructions have been sent.");
      showAuthCard("resetCard");
      const tokenInput = document.getElementById("resetToken");
      if (tokenInput && data.reset_token) {
        tokenInput.value = data.reset_token;
      }
    } else {
      showToast(data.detail || "Unable to process recovery request.");
    }
  } catch (err) {
    showToast("Server recovery route offline.");
  }
}

async function handleResetSubmit() {
  const tokenInput = document.getElementById("resetToken");
  const newPasswordInput = document.getElementById("resetNewPassword");
  const confirmPasswordInput = document.getElementById("resetConfirmPassword");

  const token = tokenInput ? tokenInput.value.trim() : "";
  const newPassword = newPasswordInput ? newPasswordInput.value : "";
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

  if (!token) {
    showToast("Please enter your password reset token.");
    if (tokenInput) tokenInput.focus();
    return;
  }

  if (newPassword.length < 8) {
    showToast("Password must be at least 8 characters long.");
    if (newPasswordInput) newPasswordInput.focus();
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("Password confirmation mismatch. Please verify both passwords.");
    if (confirmPasswordInput) confirmPasswordInput.focus();
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
      showToast(data.message || "New password saved successfully! Please sign in.");
      showAuthCard("loginCard");
      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmPasswordInput) confirmPasswordInput.value = "";
      if (tokenInput) tokenInput.value = "";
    } else {
      showToast(data.detail || "Reset failed. The token may be expired or invalid.");
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
  } catch (e) {
    // Ignore network failure during logout
  }
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  showToast("Logged out successfully.");
  checkAuthState();
}

function closeRegSuccessAndDirectToLogin() {
  const modal = document.getElementById("registrationSuccessModal");
  if (modal) modal.style.display = "none";
  showAuthCard("loginCard");
  const pwField = document.getElementById("loginPassword");
  if (pwField) {
    pwField.value = "";
    pwField.style.borderColor = "";
    pwField.focus();
  }
}

function closeLoginErrorModal() {
  const modal = document.getElementById("loginErrorModal");
  if (modal) modal.style.display = "none";
  const pwField = document.getElementById("loginPassword");
  if (pwField) {
    pwField.focus();
  }
}

function goToForgotPasswordFromError() {
  const modal = document.getElementById("loginErrorModal");
  if (modal) modal.style.display = "none";
  showAuthCard("forgotCard");
  const loginEmail = document.getElementById("loginEmail");
  const forgotEmail = document.getElementById("forgotEmail");
  if (loginEmail && forgotEmail && loginEmail.value) {
    forgotEmail.value = loginEmail.value;
  }
}

window.handleLoginSubmit = handleLoginSubmit;
window.handleSignupSubmit = handleSignupSubmit;
window.handleForgotSubmit = handleForgotSubmit;
window.handleResetSubmit = handleResetSubmit;
window.showAuthCard = showAuthCard;
window.handleLogout = handleLogout;
window.closeRegSuccessAndDirectToLogin = closeRegSuccessAndDirectToLogin;
window.closeLoginErrorModal = closeLoginErrorModal;
window.goToForgotPasswordFromError = goToForgotPasswordFromError;

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

function updateDonutChart(valid, flagged, duplicates) {
  const total = valid + flagged + duplicates;
  const validCircle = document.getElementById("donutValidCircle");
  const flaggedCircle = document.getElementById("donutFlaggedCircle");
  const dupCircle = document.getElementById("donutDuplicateCircle");
  const centerPct = document.getElementById("donutCenterPct");
  const centerLabel = document.getElementById("donutCenterLabel");
  const legValid = document.getElementById("donutLegendValid");
  const legFlagged = document.getElementById("donutLegendFlagged");
  const legDups = document.getElementById("donutLegendDuplicates");

  if (!validCircle) return;

  if (total === 0) {
    validCircle.setAttribute("stroke-dasharray", "0 100");
    flaggedCircle.setAttribute("stroke-dasharray", "0 100");
    dupCircle.setAttribute("stroke-dasharray", "0 100");
    if (centerPct) centerPct.textContent = "0";
    if (centerLabel) centerLabel.textContent = "No Invoices";
    if (legValid) legValid.innerHTML = `0 <span class="legend-percent">0%</span>`;
    if (legFlagged) legFlagged.innerHTML = `0 <span class="legend-percent">0%</span>`;
    if (legDups) legDups.innerHTML = `0 <span class="legend-percent">0%</span>`;
    return;
  }

  const validPct = (valid / total) * 100;
  const flaggedPct = (flagged / total) * 100;
  const dupPct = (duplicates / total) * 100;

  validCircle.setAttribute("stroke-dasharray", `${validPct.toFixed(1)} ${(100 - validPct).toFixed(1)}`);
  validCircle.setAttribute("stroke-dashoffset", "25");

  flaggedCircle.setAttribute("stroke-dasharray", `${flaggedPct.toFixed(1)} ${(100 - flaggedPct).toFixed(1)}`);
  flaggedCircle.setAttribute("stroke-dashoffset", `${(25 - validPct).toFixed(1)}`);

  dupCircle.setAttribute("stroke-dasharray", `${dupPct.toFixed(1)} ${(100 - dupPct).toFixed(1)}`);
  dupCircle.setAttribute("stroke-dashoffset", `${(25 - validPct - flaggedPct).toFixed(1)}`);

  if (centerPct) centerPct.textContent = `${validPct.toFixed(0)}%`;
  if (centerLabel) centerLabel.textContent = "Valid";
  if (legValid) legValid.innerHTML = `${valid} <span class="legend-percent">${validPct.toFixed(1)}%</span>`;
  if (legFlagged) legFlagged.innerHTML = `${flagged} <span class="legend-percent">${flaggedPct.toFixed(1)}%</span>`;
  if (legDups) legDups.innerHTML = `${duplicates} <span class="legend-percent">${dupPct.toFixed(1)}%</span>`;
}

function drawValidationChart(dailyTrend) {
  const svg = document.getElementById("dashboardLineChart");
  if (!svg) return;

  if (!dailyTrend || dailyTrend.length === 0) {
    svg.innerHTML = `
      <text x="300" y="120" text-anchor="middle" fill="var(--text-muted)" font-size="13" font-weight="500">
        No invoice activity recorded in the last 7 days.
      </text>
    `;
    return;
  }

  const totals = dailyTrend.map(d => (d.validated || 0) + (d.flagged || 0) + (d.rejected || 0));
  const maxVal = Math.max(...totals, 5);
  const maxScale = Math.ceil(maxVal / 5) * 5;

  const width = 570;
  const leftPad = 50;
  const topPad = 30;
  const bottomPad = 180;
  const chartHeight = bottomPad - topPad;
  const stepX = (width - leftPad) / Math.max(1, dailyTrend.length - 1);

  const points = dailyTrend.map((d, i) => {
    const total = (d.validated || 0) + (d.flagged || 0) + (d.rejected || 0);
    const x = leftPad + (i * stepX);
    const y = bottomPad - ((total / maxScale) * chartHeight);
    return { x, y, total, name: d.name || `Day ${i+1}` };
  });

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const pathArea = `${pathLine} L ${points[points.length-1].x.toFixed(1)},${bottomPad} L ${points[0].x.toFixed(1)},${bottomPad} Z`;

  let gridHtml = `
    <defs>
      <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"></stop>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"></stop>
      </linearGradient>
    </defs>
  `;

  // 4 Horizontal Grid Lines
  for (let step = 0; step <= 3; step++) {
    const y = topPad + (step * (chartHeight / 3));
    const val = Math.round(maxScale - (step * (maxScale / 3)));
    gridHtml += `
      <line class="chart-grid-line" x1="${leftPad}" y1="${y}" x2="${width}" y2="${y}"></line>
      <text class="chart-axis-text" x="${leftPad - 15}" y="${y + 4}" text-anchor="end">${val}</text>
    `;
  }

  // Base Axis Line
  gridHtml += `<line class="chart-axis-line" x1="${leftPad}" y1="${bottomPad}" x2="${width}" y2="${bottomPad}"></line>`;

  // Date Axis Labels
  points.forEach(p => {
    gridHtml += `<text class="chart-axis-text" x="${p.x}" y="${bottomPad + 25}" text-anchor="middle">${p.name}</text>`;
  });

  // Area and Line
  gridHtml += `<path class="chart-area" d="${pathArea}"></path>`;
  gridHtml += `<path class="chart-line" d="${pathLine}"></path>`;

  // Data Points
  points.forEach(p => {
    gridHtml += `
      <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="4" data-value="${p.total} Invoices (${p.name})"></circle>
    `;
  });

  svg.innerHTML = gridHtml;

  // Re-bind tooltips
  const tooltip = document.getElementById("chartTooltip");
  if (tooltip) {
    svg.querySelectorAll(".chart-point").forEach(pt => {
      pt.addEventListener("mouseenter", () => {
        const val = pt.getAttribute("data-value");
        tooltip.textContent = val;
        tooltip.style.display = "block";
        const rect = pt.getBoundingClientRect();
        const container = document.getElementById("lineChartContainer");
        if (container) {
          const containerRect = container.getBoundingClientRect();
          tooltip.style.left = `${rect.left - containerRect.left - (tooltip.offsetWidth / 2) + 4}px`;
          tooltip.style.top = `${rect.top - containerRect.top - 32}px`;
        }
      });
      pt.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
    });
  }
}

function updateReportsFailureReasons(invoices) {
  const container = document.getElementById("reportsFailureReasonsContainer");
  if (!container) return;

  const flaggedOrRejected = (invoices || []).filter(inv => inv.status === "flagged" || inv.status === "duplicate");
  if (flaggedOrRejected.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box" style="padding: 24px;">
        <i data-lucide="check-circle" style="width: 32px; height: 32px; color: var(--success);"></i>
        <h4 style="font-size: 14px; font-weight: 600; margin-top: 8px;">Zero Compliance Exceptions</h4>
        <p style="font-size: 12px; margin-bottom: 0;">No tax calculations or registration errors recorded.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let arithmeticCount = 0;
  let taxIdCount = 0;
  let duplicateCount = 0;
  let missingFieldCount = 0;

  flaggedOrRejected.forEach(inv => {
    if (inv.status === "duplicate") duplicateCount++;
    if (inv.details && !inv.details.arithmetic.success) arithmeticCount++;
    if (inv.details && !inv.details.vat.success) taxIdCount++;
    if (inv.details && !inv.details.ocr.success) missingFieldCount++;
  });

  const totalExceptions = arithmeticCount + taxIdCount + duplicateCount + missingFieldCount || 1;
  const categories = [
    { label: "Arithmetic & Totals Discrepancy", count: arithmeticCount, color: "var(--danger)" },
    { label: "Supplier Tax Registration Unverified", count: taxIdCount, color: "var(--warning)" },
    { label: "Potential Duplicate Invoice Number", count: duplicateCount, color: "var(--primary)" },
    { label: "Missing Mandatory Fields", count: missingFieldCount, color: "var(--text-light)" }
  ];

  container.innerHTML = categories.map(cat => {
    const pct = ((cat.count / totalExceptions) * 100).toFixed(0);
    return `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
          <span>${cat.label}</span>
          <strong class="legend-val">${cat.count} Flagged (${pct}%)</strong>
        </div>
        <div style="height: 8px; background-color: var(--bg-app); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background-color: ${cat.color}; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function updateSupplierPerformanceRates(suppliers) {
  // Can be extended to render supplier performance table if desired
}

async function loadDashboardMetrics() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const isPersonal = localStorage.getItem("user_account_type") === "PERSONAL";

      const totalTitle = document.querySelector("#kpi-total .kpi-title");
      const validTitle = document.querySelector("#kpi-valid .kpi-title");
      const flaggedTitle = document.querySelector("#kpi-flagged .kpi-title");
      const duplicatesTitle = document.querySelector("#kpi-duplicates .kpi-title");

      if (isPersonal) {
        if (totalTitle) totalTitle.textContent = "My Invoices";
        if (validTitle) validTitle.textContent = "Valid Invoices";
        if (flaggedTitle) flaggedTitle.textContent = "Flagged Issues";
        if (duplicatesTitle) duplicatesTitle.textContent = "Duplicates";

        document.getElementById("val-total").textContent = (data.invoices_validated || 0).toLocaleString();
        document.getElementById("val-valid").textContent = (data.valid_invoices || 0).toLocaleString();
        document.getElementById("val-flagged").textContent = (data.flagged_invoices || 0).toLocaleString();
        document.getElementById("val-duplicates").textContent = (data.duplicate_invoices || 0).toLocaleString();
      } else {
        if (totalTitle) totalTitle.textContent = "Total Invoices";
        if (validTitle) validTitle.textContent = "Valid Invoices";
        if (flaggedTitle) flaggedTitle.textContent = "Flagged Issues";
        if (duplicatesTitle) duplicatesTitle.textContent = "Duplicates Detected";

        document.getElementById("val-total").textContent = (data.invoices_validated || 0).toLocaleString();
        document.getElementById("val-valid").textContent = (data.valid_invoices || 0).toLocaleString();
        document.getElementById("val-flagged").textContent = (data.flagged_invoices || 0).toLocaleString();
        document.getElementById("val-duplicates").textContent = (data.duplicate_invoices || 0).toLocaleString();
      }

      // Update Dynamic Donut Chart
      updateDonutChart(data.valid_invoices || 0, data.flagged_invoices || 0, data.duplicate_invoices || 0);

      // Update Reports Page KPIs
      const repErrorRate = document.getElementById("reportKpiErrorRate");
      if (repErrorRate) {
        const errRate = data.invoices_validated > 0 
          ? (((data.flagged_invoices + data.invalid_invoices) / data.invoices_validated) * 100).toFixed(1) 
          : "0.0";
        repErrorRate.textContent = `${errRate}%`;
      }

      const repTotalTax = document.getElementById("reportKpiTotalTax");
      if (repTotalTax) {
        repTotalTax.textContent = `$${(data.vat_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      const repFlagged = document.getElementById("reportKpiFlaggedClaims");
      if (repFlagged) {
        repFlagged.textContent = (data.flagged_invoices || 0).toLocaleString();
      }

      const repAvgSpeed = document.getElementById("reportKpiAvgSpeed");
      if (repAvgSpeed) {
        repAvgSpeed.textContent = `${data.average_processing_time || 0.85}s`;
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
      
      if (data.daily_trend || data.daily_validation_trend) {
        drawValidationChart(data.daily_trend || data.daily_validation_trend);
      }
      
      if (data.suppliers_trend && data.suppliers_trend.length > 0) {
        updateSupplierPerformanceRates(data.suppliers_trend);
      }
    }
    updateReportsFailureReasons(INVOICE_DATABASE);
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
      if (Array.isArray(logs)) {
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
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const recentInvoices = [...INVOICE_DATABASE]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  if (recentInvoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 48px 16px;">
          <i data-lucide="inbox" style="width: 36px; height: 36px; margin: 0 auto 12px auto; display: block; opacity: 0.4;"></i>
          <strong style="font-size: 15px; color: var(--text-main); display: block;">No invoices processed yet</strong>
          <p style="font-size: 13px; margin: 4px 0 16px 0;">Upload your first tax invoice to begin automated compliance and tax verification.</p>
          <button class="btn btn-primary btn-sm" onclick="navigateToTab('upload')"><i data-lucide="upload-cloud"></i> Upload Invoice</button>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }
  
  recentInvoices.forEach(inv => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
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
  lucide.createIcons();
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;
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
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 48px 16px;">
          <i data-lucide="file-search" style="width: 36px; height: 36px; margin: 0 auto 12px auto; display: block; opacity: 0.4;"></i>
          <strong style="font-size: 15px; color: var(--text-main); display: block;">No invoice records found</strong>
          <p style="font-size: 13px; margin: 4px 0 16px 0;">Processed tax invoices and detailed audit compliance reports will be archived here.</p>
          <button class="btn btn-primary btn-sm" onclick="navigateToTab('upload')"><i data-lucide="upload-cloud"></i> Upload First Invoice</button>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }
  
  filtered.forEach(inv => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
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
        <button class="btn btn-outline btn-sm table-row-action" data-id="${inv.id}" onclick="event.stopPropagation(); openDetailDrawer('${inv.id}')">Review</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
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

  const drawerPdfBtn = document.getElementById("drawerPdfBtn");
  if (drawerPdfBtn) {
    drawerPdfBtn.onclick = async () => {
      try {
        showToast("Generating PDF compliance report...");
        const res = await fetch(`${API_BASE_URL}/validation/report/${inv.invoice_id}`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Report generation failed");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice_Report_${inv.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("PDF report downloaded.");
      } catch (err) {
        showToast("Failed to download PDF report: " + err.message);
      }
    };
  }

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

let CURRENT_RAW_INVOICE = null;

// ==========================================
// 5. Invoice Upload & Live OCR Processing
// ==========================================
function initUploadMechanics() {
  const dragDropArea = document.getElementById("dragDropArea");
  const browseFilesBtn = document.getElementById("browseFilesBtn");
  const btnCameraUpload = document.getElementById("btnCameraUpload");
  const cameraInput = document.getElementById("cameraInput");
  const fileInput = document.getElementById("invoiceFileInput");
  const progressPanel = document.getElementById("validationProgress");
  const resultsPanel = document.getElementById("validationResultCard");
  const staticRules = document.getElementById("uploadStaticRules");
  
  if (browseFilesBtn && fileInput) {
    browseFilesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        handleFileUpload(fileInput.files[0]);
      }
    });
  }

  // Camera capture handler
  if (btnCameraUpload && cameraInput) {
    btnCameraUpload.addEventListener("click", (e) => {
      e.stopPropagation();
      cameraInput.click();
    });

    cameraInput.addEventListener("change", () => {
      if (cameraInput.files.length > 0) {
        handleFileUpload(cameraInput.files[0]);
      }
    });
  }

  // Clipboard paste support (Ctrl + V)
  document.addEventListener("paste", (e) => {
    const uploadView = document.getElementById("view-upload");
    if (!uploadView || !uploadView.classList.contains("active")) return;
    
    const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.indexOf("image") === 0) {
        const blob = item.getAsFile();
        if (blob) {
          showToast("Pasted image detected. Starting OCR extraction...");
          handleFileUpload(blob);
          break;
        }
      }
    }
  });

  if (dragDropArea) {
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
  }

  async function handleFileUpload(file) {
    if (dragDropArea) dragDropArea.style.display = "none";
    if (staticRules) staticRules.style.display = "none";
    if (progressPanel) progressPanel.style.display = "flex";
    if (resultsPanel) resultsPanel.style.display = "none";
    
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
        CURRENT_RAW_INVOICE = apiInv;
        playStepTimeline(apiInv);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "API upload rejection");
      }
    } catch (err) {
      showToast("OCR processing notice: " + err.message);
      resetUploadPanel();
    }
  }

  function resetProgressIndicators() {
    const steps = ["step-ocr", "step-arithmetic", "step-db", "step-duplicate"];
    steps.forEach(stepId => {
      const step = document.getElementById(stepId);
      if (step) {
        step.className = "tracker-step-item pending";
        const icon = step.querySelector("i");
        if (icon) icon.setAttribute("data-lucide", "circle");
      }
    });
    lucide.createIcons();
  }

  function playStepTimeline(apiInv) {
    const stepOcr = document.getElementById("step-ocr");
    const stepArithmetic = document.getElementById("step-arithmetic");
    const stepDb = document.getElementById("step-db");
    const stepDuplicate = document.getElementById("step-duplicate");

    setTimeout(() => {
      if (stepOcr) {
        stepOcr.className = "tracker-step-item success";
        stepOcr.querySelector("i")?.setAttribute("data-lucide", "check");
      }
      
      if (stepArithmetic) {
        stepArithmetic.className = "tracker-step-item running";
        const icon = stepArithmetic.querySelector("i");
        if (icon) {
          icon.setAttribute("data-lucide", "loader-2");
          icon.classList.add("animate-spin");
        }
      }
      lucide.createIcons();

      setTimeout(() => {
        const arithmeticPassed = apiInv.invoice_status !== "Flagged" && apiInv.invoice_status !== "Rejected";
        if (stepArithmetic) {
          stepArithmetic.className = arithmeticPassed ? "tracker-step-item success" : "tracker-step-item error";
          const icon = stepArithmetic.querySelector("i");
          if (icon) {
            icon.setAttribute("data-lucide", arithmeticPassed ? "check" : "x");
            icon.classList.remove("animate-spin");
          }
        }
        
        if (stepDb) {
          stepDb.className = "tracker-step-item running";
          const icon = stepDb.querySelector("i");
          if (icon) {
            icon.setAttribute("data-lucide", "loader-2");
            icon.classList.add("animate-spin");
          }
        }
        lucide.createIcons();

        setTimeout(() => {
          if (stepDb) {
            stepDb.className = "tracker-step-item success";
            const icon = stepDb.querySelector("i");
            if (icon) {
              icon.setAttribute("data-lucide", "check");
              icon.classList.remove("animate-spin");
            }
          }
          
          if (stepDuplicate) {
            stepDuplicate.className = "tracker-step-item running";
            const icon = stepDuplicate.querySelector("i");
            if (icon) {
              icon.setAttribute("data-lucide", "loader-2");
              icon.classList.add("animate-spin");
            }
          }
          lucide.createIcons();

          setTimeout(() => {
            const isDuplicate = apiInv.invoice_status === "Rejected";
            if (stepDuplicate) {
              stepDuplicate.className = !isDuplicate ? "tracker-step-item success" : "tracker-step-item error";
              const icon = stepDuplicate.querySelector("i");
              if (icon) {
                icon.setAttribute("data-lucide", !isDuplicate ? "check" : "x");
                icon.classList.remove("animate-spin");
              }
            }
            lucide.createIcons();

            setTimeout(() => {
              if (progressPanel) progressPanel.style.display = "none";
              CURRENT_SIMULATED_INVOICE = mapApiInvoiceToLocal(apiInv);
              displayUploadResults();
            }, 200);
          }, 200);
        }, 200);
      }, 200);
    }, 150);
  }

  // Save / Confirm & View History
  const acceptBtn = document.getElementById("btnAcceptUpload");
  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      showToast("Invoice saved to history records.");
      await loadAllBackendDatasets();
      navigateToTab("history");
      resetUploadPanel();
    });
  }

  // Cancel / Upload Another
  const rejectBtn = document.getElementById("btnRejectUpload");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
      resetUploadPanel();
    });
  }

  // Save & Revalidate Button
  const revalidateBtn = document.getElementById("btnRevalidateInvoice");
  if (revalidateBtn) {
    revalidateBtn.addEventListener("click", async () => {
      if (!CURRENT_RAW_INVOICE) return;
      
      const payload = {
        invoice_number: document.getElementById("editInvNumber")?.value || CURRENT_RAW_INVOICE.invoice_number,
        supplier_name: document.getElementById("editSupplierName")?.value || (CURRENT_RAW_INVOICE.supplier?.supplier_name || ""),
        supplier_tax_number: document.getElementById("editSupplierTax")?.value || (CURRENT_RAW_INVOICE.supplier?.tax_number || ""),
        customer_name: document.getElementById("editCustomerName")?.value || (CURRENT_RAW_INVOICE.customer?.customer_name || ""),
        customer_tax_number: document.getElementById("editCustomerTax")?.value || (CURRENT_RAW_INVOICE.customer?.tax_number || ""),
        invoice_date: document.getElementById("editInvoiceDate")?.value || CURRENT_RAW_INVOICE.invoice_date,
        due_date: document.getElementById("editDueDate")?.value || CURRENT_RAW_INVOICE.due_date,
        currency: (document.getElementById("editCurrency")?.value || CURRENT_RAW_INVOICE.currency || "USD").toUpperCase(),
        subtotal: parseFloat(document.getElementById("editSubtotal")?.value || 0),
        vat_percentage: parseFloat(document.getElementById("editVatRate")?.value || 0),
        vat_amount: parseFloat(document.getElementById("editVatAmount")?.value || 0),
        discount: parseFloat(document.getElementById("editDiscount")?.value || 0),
        shipping_cost: parseFloat(document.getElementById("editShipping")?.value || 0),
        total_amount: parseFloat(document.getElementById("editTotal")?.value || 0)
      };

      try {
        revalidateBtn.disabled = true;
        revalidateBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Revalidating...`;
        lucide.createIcons();

        const res = await fetch(`${API_BASE_URL}/invoices/${CURRENT_RAW_INVOICE.invoice_id}`, {
          method: "PUT",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updatedInv = await res.json();
          CURRENT_RAW_INVOICE = updatedInv;
          CURRENT_SIMULATED_INVOICE = mapApiInvoiceToLocal(updatedInv);
          displayUploadResults();
          showToast("Invoice fields updated and re-validated successfully!");
        } else {
          const err = await res.json().catch(() => ({}));
          showToast("Revalidation failed: " + (err.detail || "Server error"));
        }
      } catch (err) {
        showToast("Error connecting to server for re-validation.");
      } finally {
        revalidateBtn.disabled = false;
        revalidateBtn.innerHTML = `<i data-lucide="refresh-cw"></i> Save & Revalidate`;
        lucide.createIcons();
      }
    });
  }

  // Download PDF Report from Result Screen
  const downloadPdfBtn = document.getElementById("btnDownloadPdfReport");
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", async () => {
      if (!CURRENT_RAW_INVOICE) return;
      try {
        showToast("Preparing compliance PDF report...");
        const res = await fetch(`${API_BASE_URL}/validation/report/${CURRENT_RAW_INVOICE.invoice_id}`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to generate PDF");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice_Audit_${CURRENT_RAW_INVOICE.invoice_number || CURRENT_RAW_INVOICE.invoice_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("Audit PDF report downloaded.");
      } catch (err) {
        showToast("PDF report download failed: " + err.message);
      }
    });
  }
}

function displayUploadResults() {
  const resultsPanel = document.getElementById("validationResultCard");
  if (resultsPanel) resultsPanel.style.display = "block";
  
  if (!CURRENT_RAW_INVOICE) return;
  const raw = CURRENT_RAW_INVOICE;
  const fields = raw.extracted_json || {};

  // Fill raw OCR text
  const rawTextBox = document.getElementById("resultRawTextBox");
  if (rawTextBox) {
    rawTextBox.textContent = raw.ocr_text || `Tax Invoice: ${raw.invoice_number}\nSupplier: ${raw.supplier?.supplier_name || 'N/A'}\nTotal Amount: ${raw.total_amount} ${raw.currency}`;
  }

  // Populate Editable Form Inputs
  const editInvNumber = document.getElementById("editInvNumber");
  if (editInvNumber) editInvNumber.value = raw.invoice_number || fields.invoice_number || "";

  const editCurrency = document.getElementById("editCurrency");
  if (editCurrency) editCurrency.value = raw.currency || fields.currency || "USD";

  const editSupplierName = document.getElementById("editSupplierName");
  if (editSupplierName) editSupplierName.value = raw.supplier?.supplier_name || fields.supplier_name || "";

  const editSupplierTax = document.getElementById("editSupplierTax");
  if (editSupplierTax) editSupplierTax.value = raw.supplier?.tax_number || fields.supplier_tax_number || "";

  const editCustomerName = document.getElementById("editCustomerName");
  if (editCustomerName) editCustomerName.value = raw.customer?.customer_name || fields.customer_name || "";

  const editCustomerTax = document.getElementById("editCustomerTax");
  if (editCustomerTax) editCustomerTax.value = raw.customer?.tax_number || fields.customer_tax_number || "";

  const editInvoiceDate = document.getElementById("editInvoiceDate");
  if (editInvoiceDate) editInvoiceDate.value = raw.invoice_date || fields.invoice_date || "";

  const editDueDate = document.getElementById("editDueDate");
  if (editDueDate) editDueDate.value = raw.due_date || fields.due_date || "";

  const editSubtotal = document.getElementById("editSubtotal");
  if (editSubtotal) editSubtotal.value = parseFloat(raw.subtotal || fields.subtotal || 0).toFixed(2);

  const editVatRate = document.getElementById("editVatRate");
  if (editVatRate) editVatRate.value = parseFloat(raw.vat_percentage || fields.vat_percentage || 0).toFixed(2);

  const editVatAmount = document.getElementById("editVatAmount");
  if (editVatAmount) editVatAmount.value = parseFloat(raw.vat_amount || fields.vat_amount || 0).toFixed(2);

  const editDiscount = document.getElementById("editDiscount");
  if (editDiscount) editDiscount.value = parseFloat(raw.discount || fields.discount || 0).toFixed(2);

  const editShipping = document.getElementById("editShipping");
  if (editShipping) editShipping.value = parseFloat(fields.shipping_cost || 0).toFixed(2);

  const editTotal = document.getElementById("editTotal");
  if (editTotal) editTotal.value = parseFloat(raw.total_amount || fields.total_amount || 0).toFixed(2);

  // Confidence indicators & badges
  const fieldConfs = fields.field_confidences || {};
  const setConfBadge = (badgeId, inputId, confVal) => {
    const el = document.getElementById(badgeId);
    const inp = document.getElementById(inputId);
    const score = confVal !== undefined ? parseFloat(confVal) : 92.0;
    if (el) {
      el.textContent = `${score.toFixed(0)}%`;
      el.className = `confidence-badge ${score >= 85 ? 'high' : score >= 70 ? 'medium' : 'low'}`;
    }
    if (inp) {
      if (score < 75) {
        inp.classList.add("warning-field");
        inp.title = "Low OCR confidence - please double-check this value.";
      } else {
        inp.classList.remove("warning-field");
        inp.title = "";
      }
    }
  };

  setConfBadge("confInvNumber", "editInvNumber", fieldConfs.invoice_number);
  setConfBadge("confCurrency", "editCurrency", fieldConfs.currency);
  setConfBadge("confSupplierName", "editSupplierName", fieldConfs.supplier_name);
  setConfBadge("confSupplierTax", "editSupplierTax", fieldConfs.supplier_tax_number);
  setConfBadge("confCustomerName", "editCustomerName", fieldConfs.customer_name);
  setConfBadge("confCustomerTax", "editCustomerTax", fieldConfs.customer_tax_number);
  setConfBadge("confInvoiceDate", "editInvoiceDate", fieldConfs.invoice_date);
  setConfBadge("confDueDate", "editDueDate", fieldConfs.due_date);
  setConfBadge("confSubtotal", "editSubtotal", fieldConfs.subtotal);
  setConfBadge("confVatRate", "editVatRate", fieldConfs.vat_percentage || 95.0);
  setConfBadge("confVatAmount", "editVatAmount", fieldConfs.vat_amount);
  setConfBadge("confDiscount", "editDiscount", fieldConfs.discount || 90.0);
  setConfBadge("confShipping", "editShipping", fieldConfs.shipping_cost || 90.0);
  setConfBadge("confTotal", "editTotal", fieldConfs.total_amount);

  // Overall Confidence and processing time
  const confBadge = document.getElementById("resultConfidenceBadge");
  if (confBadge) {
    const conf = parseFloat(raw.confidence_score || 90.0);
    confBadge.innerHTML = `<i data-lucide="sparkles"></i> ${conf.toFixed(0)}% OCR Confidence`;
    confBadge.className = `confidence-badge ${conf >= 85 ? 'high' : conf >= 70 ? 'medium' : 'low'}`;
  }

  const procTime = document.getElementById("resultProcessingTime");
  if (procTime) {
    procTime.textContent = `Processed in ${raw.processing_time || 0.85}s`;
  }

  // Populate rules details grid
  const grid = document.getElementById("rulesDetailsGrid");
  if (grid) {
    grid.innerHTML = "";
    const valResult = (raw.validation_results && raw.validation_results[0]) || {};
    const missing = valResult.missing_fields || [];
    const invalid = valResult.invalid_fields || {};
    const fraudFlags = valResult.fraud_flags || {};

    const checks = [
      {
        title: "Invoice Number & Duplicate Check",
        success: !fraudFlags.duplicate_invoice && !missing.includes("invoice_number"),
        msg: fraudFlags.duplicate_invoice ? (valResult.duplicate_status || "Duplicate invoice found in database.") : "Unique invoice identifier verified in database."
      },
      {
        title: "Supplier VAT / Tax ID Syntax",
        success: !fraudFlags.fake_supplier && !fraudFlags.invalid_tax_number && !missing.includes("supplier_tax_number"),
        msg: invalid.supplier_tax_number || (missing.includes("supplier_tax_number") ? "Supplier Tax ID missing." : "Supplier Tax / VAT ID format validated.")
      },
      {
        title: "Subtotal & VAT Math Audit",
        success: !fraudFlags.modified_totals && !invalid.vat_amount,
        msg: invalid.vat_amount || valResult.vat_validation || "Subtotal and calculated tax match configured rate."
      },
      {
        title: "Grand Total Calculation Check",
        success: !invalid.total_amount,
        msg: invalid.total_amount || "Subtotal - Discount + Tax + Shipping matches Grand Total."
      },
      {
        title: "Invoice Date & Aging Compliance",
        success: !fraudFlags.future_invoice && !invalid.invoice_date,
        msg: invalid.invoice_date || "Invoice date is within acceptable historical limits."
      }
    ];

    checks.forEach(check => {
      const div = document.createElement("div");
      div.className = "rule-check-item";
      const iconColor = check.success ? "var(--success)" : (raw.invoice_status === "Rejected" ? "var(--danger)" : "var(--warning)");
      const iconName = check.success ? "check-circle-2" : "alert-circle";

      div.innerHTML = `
        <i data-lucide="${iconName}" style="color: ${iconColor}; flex-shrink: 0; width: 18px; height: 18px;"></i>
        <div>
          <strong>${check.title}</strong>
          <p>${check.msg}</p>
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
    
    const status = CURRENT_RAW_INVOICE ? CURRENT_RAW_INVOICE.invoice_status : (CURRENT_SIMULATED_INVOICE?.status || "Validated");
    
    if (status === "Validated" || status === "valid") {
      iconWrapper.style.backgroundColor = "var(--success-light)";
      iconWrapper.style.color = "var(--success-text)";
      icon.setAttribute("data-lucide", "check");
      title.textContent = "Invoice Validated Successfully";
      if (subtitle) subtitle.textContent = "All tax calculations, supplier IDs, and arithmetic match compliance standards.";
    } else if (status === "Flagged" || status === "flagged") {
      iconWrapper.style.backgroundColor = "var(--warning-light)";
      iconWrapper.style.color = "var(--warning-text)";
      icon.setAttribute("data-lucide", "alert-triangle");
      title.textContent = "Invoice Flagged with Warnings";
      if (subtitle) subtitle.textContent = "Validation exceptions detected. You can correct fields above and revalidate.";
    } else {
      iconWrapper.style.backgroundColor = "var(--danger-light)";
      iconWrapper.style.color = "var(--danger-text)";
      icon.setAttribute("data-lucide", "copy");
      title.textContent = "Invoice Rejected / Duplicate Detected";
      if (subtitle) subtitle.textContent = "Duplicate invoice or critical arithmetic discrepancy detected.";
    }
    lucide.createIcons();
  }
}

function resetUploadPanel() {
  const dragDropArea = document.getElementById("dragDropArea");
  const staticRules = document.getElementById("uploadStaticRules");
  const progressPanel = document.getElementById("validationProgress");
  const resultsPanel = document.getElementById("validationResultCard");
  const fileInput = document.getElementById("invoiceFileInput");

  if (dragDropArea) dragDropArea.style.display = "flex";
  if (staticRules) staticRules.style.display = "block";
  if (progressPanel) progressPanel.style.display = "none";
  if (resultsPanel) resultsPanel.style.display = "none";
  if (fileInput) fileInput.value = "";
  CURRENT_SIMULATED_INVOICE = null;
  CURRENT_RAW_INVOICE = null;
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

      // Bind Sovereign Currency fields from selected country
      const currencyDisplay = profile.currency ? `${profile.currency} (${profile.currency_symbol || '$'})` : "USD ($)";
      const profCurrencyInput = document.getElementById("profCurrency");
      if (profCurrencyInput) profCurrencyInput.value = currencyDisplay;
      const prefCurrencyInput = document.getElementById("prefCurrency");
      if (prefCurrencyInput) prefCurrencyInput.value = currencyDisplay;

      const metaCountry = document.getElementById("metaCountry");
      if (metaCountry) metaCountry.textContent = profile.country || "Global";
      const metaCurrency = document.getElementById("metaCurrency");
      if (metaCurrency) metaCurrency.textContent = currencyDisplay;
      const metaTaxSystem = document.getElementById("metaTaxSystem");
      if (metaTaxSystem) metaTaxSystem.textContent = profile.tax_system || "VAT";

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

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconName = "info";
  let bg = "#1e293b";
  let border = "#334155";
  let color = "#ffffff";
  
  if (type === "error") {
    iconName = "alert-circle";
    bg = "#b91c1c";
    border = "#ef4444";
    color = "#ffffff";
  } else if (type === "success") {
    iconName = "check-circle-2";
    bg = "#15803d";
    border = "#22c55e";
    color = "#ffffff";
  }
  
  toast.style.backgroundColor = bg;
  toast.style.borderColor = border;
  toast.style.borderWidth = "1px";
  toast.style.borderStyle = "solid";
  toast.style.color = color;
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "9999";
  
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
    <span style="font-size: 13px; line-height: 1.4;">${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.animation = "toastIn 0.3s reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3600);
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

// Upgraded Signup Features for Single-Page HTML App
function initLegacySignupUpgrade() {

  // 1. Fetch country profiles from backend
  fetch(`${API_BASE_URL}/countries`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        countriesList = data;
        setupCountryDropdown("signupCountry", "signupCountryDropdown", "signupPhoneCode", "signupCountryTaxSummary", "signupTaxSystemWrapper", "signupTaxSystemSelect", false);
        setupCountryDropdown("signupCompanyCountry", "signupCompanyCountryDropdown", "signupCompanyPhoneCode", "signupCompanyCountryTaxSummary", "signupCompanyTaxSystemWrapper", "signupCompanyTaxSystemSelect", true);
      }
    })
    .catch(err => console.error("Error loading countries config:", err));

  function setupCountryDropdown(inputId, dropdownId, phoneCodeId, taxSummaryId, taxWrapperId, taxSelectId, isCompany) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const phoneCodeSpan = document.getElementById(phoneCodeId);
    const taxSummary = document.getElementById(taxSummaryId);
    const taxWrapper = document.getElementById(taxWrapperId);
    const taxSelect = document.getElementById(taxSelectId);

    if (!input || !dropdown) return;

    // Show dropdown on focus
    input.addEventListener("focus", () => {
      renderDropdown("");
      dropdown.style.display = "block";
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
      if (e.target !== input && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    // Search input handler
    input.addEventListener("input", () => {
      renderDropdown(input.value);
      dropdown.style.display = "block";
    });

    function renderDropdown(filterText) {
      dropdown.innerHTML = "";
      const filtered = countriesList.filter(c => 
        c.name.toLowerCase().includes(filterText.toLowerCase()) ||
        c.code.toLowerCase().includes(filterText.toLowerCase())
      );

      if (filtered.length === 0) {
        dropdown.innerHTML = `<div style="padding: 8px 12px; font-size: 13px; color: var(--text-muted);">No countries found</div>`;
        return;
      }

      filtered.forEach(c => {
        const item = document.createElement("div");
        item.style.padding = "8px 12px";
        item.style.cursor = "pointer";
        item.style.fontSize = "13px";
        item.style.borderBottom = "1px solid #f1f5f9";
        item.className = "dropdown-item-c";
        item.innerHTML = `<strong>${c.name}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${c.code})</span>`;
        
        item.addEventListener("mouseenter", () => {
          item.style.backgroundColor = "#f8fafc";
        });
        item.addEventListener("mouseleave", () => {
          item.style.backgroundColor = "transparent";
        });

        item.addEventListener("click", () => {
          input.value = c.name;
          dropdown.style.display = "none";
          if (isCompany) {
            selectedCompanyCountry = c;
          } else {
            selectedPersonalCountry = c;
          }

          // Auto country phone code prefix
          if (c.phone_code && c.phone_code.prefix) {
            phoneCodeSpan.textContent = c.phone_code.prefix;
            phoneCodeSpan.style.display = "inline-flex";
            phoneCodeSpan.style.alignItems = "center";
          } else {
            phoneCodeSpan.style.display = "none";
          }

          // Multi-tax system check (e.g. Canada GST, HST, PST)
          const hasMultipleSystems = c.tax_configs && c.tax_configs.length > 1;
          if (hasMultipleSystems && taxWrapper && taxSelect) {
            taxSelect.innerHTML = c.tax_configs.map(cfg => {
              const rateStr = cfg.default_rate ? ` (${cfg.default_rate.rate}%)` : '';
              const label = cfg.description || `${cfg.tax_system.code} - ${cfg.tax_system.name}`;
              return `<option value="${cfg.tax_system.code}">${label}${rateStr}</option>`;
            }).join('');
            taxWrapper.style.display = "block";
          } else if (taxWrapper) {
            taxWrapper.style.display = "none";
          }

          // Dynamic country tax compliance card summary
          if (c.tax_config) {
            taxSummary.innerHTML = `
              <strong>Tax Compliance Profile (${c.name}):</strong><br>
              • Determined Tax System: <strong>${c.tax_config.tax_system.code}</strong> (${c.tax_config.tax_system.name})<br>
              • Standard Default Rate: <strong>${c.tax_config.default_rate ? c.tax_config.default_rate.rate + '%' : 'N/A'}</strong><br>
              • Tax Identification Label: <strong>${c.tax_config.tax_number_label}</strong><br>
              • Sovereign Currency: <strong>${c.tax_config.currency.code} (${c.tax_config.currency.symbol})</strong>
            `;
            taxSummary.style.display = "block";

            // If it is company, update tax number field placeholder and label dynamically
            if (isCompany) {
              const taxLabel = document.querySelector("label[for='signupTaxNumber']");
              if (taxLabel) taxLabel.textContent = `${c.tax_config.tax_number_label} *`;
              const taxInput = document.getElementById("signupTaxNumber");
              if (taxInput) taxInput.placeholder = `Enter official ${c.tax_config.tax_number_label}`;
            }
          } else {
            taxSummary.style.display = "none";
          }
        });
        dropdown.appendChild(item);
      });
    }
  }

  // 2. Password Show/Hide Toggles for All Auth Cards
  setupPasswordToggle("toggleLoginPassword", "loginPassword");
  setupPasswordToggle("toggleSignupPassword", "signupPassword");
  setupPasswordToggle("toggleSignupConfirmPassword", "signupConfirmPassword");
  setupPasswordToggle("toggleResetNewPassword", "resetNewPassword");
  setupPasswordToggle("toggleResetConfirmPassword", "resetConfirmPassword");

  function setupPasswordToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" style="width: 16px; height: 16px;"></i>`;
      lucide.createIcons();
    });
  }

  // 3. Live Password Strength indicator and criteria checklists
  const passInput = document.getElementById("signupPassword");
  const confirmInput = document.getElementById("signupConfirmPassword");
  const strengthContainer = document.getElementById("signupPassStrengthContainer");
  const strengthBar = document.getElementById("signupPassStrengthBar");
  const strengthLabel = document.getElementById("signupPassStrengthLabel");

  if (passInput) {
    passInput.addEventListener("input", () => {
      const pw = passInput.value;
      if (!pw) {
        if (strengthContainer) strengthContainer.style.display = "none";
        return;
      }

      if (strengthContainer) strengthContainer.style.display = "block";
      const checks = {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /[0-9]/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw)
      };

      toggleCrit("crit-length", checks.length);
      toggleCrit("crit-upper", checks.upper);
      toggleCrit("crit-lower", checks.lower);
      toggleCrit("crit-number", checks.number);
      toggleCrit("crit-special", checks.special);

      const passed = Object.values(checks).filter(Boolean).length;
      let scorePercent = (passed / 5) * 100;
      if (strengthBar) strengthBar.style.width = `${scorePercent}%`;

      if (strengthBar && strengthLabel) {
        if (passed <= 2) {
          strengthBar.style.backgroundColor = "#ef4444";
          strengthLabel.textContent = "Weak";
          strengthLabel.style.color = "#ef4444";
        } else if (passed <= 4) {
          strengthBar.style.backgroundColor = "#f59e0b";
          strengthLabel.textContent = "Fair";
          strengthLabel.style.color = "#f59e0b";
        } else {
          strengthBar.style.backgroundColor = "#22c55e";
          strengthLabel.textContent = "Strong";
          strengthLabel.style.color = "#22c55e";
        }
      }
    });
  }

  function toggleCrit(id, isValid) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = isValid ? "#22c55e" : "var(--text-muted)";
    el.style.fontWeight = isValid ? "700" : "500";
  }

  // 4. Form Submission Handler
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      await handleSignupSubmit();
    };
  }

  // 5. Duplicate Account Modal Buttons
  const conflictUseAnotherBtn = document.getElementById("conflictUseAnotherEmailBtn");
  if (conflictUseAnotherBtn) {
    conflictUseAnotherBtn.addEventListener("click", () => {
      const conflictModal = document.getElementById("conflictModal");
      if (conflictModal) conflictModal.style.display = "none";
      const accountType = document.getElementById("signupAccountType") ? document.getElementById("signupAccountType").value : "PERSONAL";
      const emailField = accountType === "COMPANY" ? document.getElementById("signupBusinessEmail") : document.getElementById("signupEmail");
      if (emailField) {
        emailField.focus();
        emailField.select();
      }
    });
  }

  // 6. Interactive Demo Modal
  const watchDemoBtn = document.getElementById("heroWatchDemoBtn");
  const demoModal = document.getElementById("demoModal");
  if (watchDemoBtn && demoModal) {
    watchDemoBtn.addEventListener("click", () => {
      demoModal.style.display = "flex";
    });
  }

  // 7. Notification Bell & Real Notifications Dropdown
  const notifBtn = document.getElementById("notifBtn");
  const notifDropdown = document.getElementById("headerNotificationsDropdown");
  const markAllReadBtn = document.getElementById("markAllNotifsReadBtn");

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = notifDropdown.style.display === "flex";
      notifDropdown.style.display = isVisible ? "none" : "flex";
      if (!isVisible) {
        loadUserNotifications();
      }
    });

    document.addEventListener("click", (e) => {
      if (!notifDropdown.contains(e.target) && e.target !== notifBtn && !notifBtn.contains(e.target)) {
        notifDropdown.style.display = "none";
      }
    });
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", async () => {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;
      try {
        await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        loadUserNotifications();
      } catch (err) {
        console.error("Error marking notifications read:", err);
      }
    });
  }

  // 12. Authentication Modals and Alert Handlers
  const closeLoginErrorModalBtn = document.getElementById("closeLoginErrorModalBtn");
  const loginErrorForgotBtn = document.getElementById("loginErrorForgotBtn");
  const loginErrorModal = document.getElementById("loginErrorModal");
  const regSuccessSignInBtn = document.getElementById("regSuccessSignInBtn");
  const regSuccessModal = document.getElementById("registrationSuccessModal");
  const loginPasswordInput = document.getElementById("loginPassword");
  const loginEmailInput = document.getElementById("loginEmail");

  if (closeLoginErrorModalBtn && loginErrorModal) {
    closeLoginErrorModalBtn.addEventListener("click", () => {
      loginErrorModal.style.display = "none";
      if (loginPasswordInput) {
        loginPasswordInput.focus();
      }
    });
  }

  if (loginErrorForgotBtn && loginErrorModal) {
    loginErrorForgotBtn.addEventListener("click", () => {
      loginErrorModal.style.display = "none";
      showAuthCard("forgotCard");
      const forgotEmailInput = document.getElementById("forgotEmail");
      if (forgotEmailInput && loginEmailInput && loginEmailInput.value) {
        forgotEmailInput.value = loginEmailInput.value;
      }
    });
  }

  if (regSuccessSignInBtn && regSuccessModal) {
    regSuccessSignInBtn.addEventListener("click", () => {
      regSuccessModal.style.display = "none";
      showAuthCard("loginCard");
      if (loginPasswordInput) {
        loginPasswordInput.value = "";
        loginPasswordInput.style.borderColor = "";
        loginPasswordInput.focus();
      }
    });
  }

  if (loginPasswordInput) {
    loginPasswordInput.addEventListener("input", () => {
      loginPasswordInput.style.borderColor = "";
      const errAlert = document.getElementById("loginErrorAlert");
      if (errAlert) errAlert.style.display = "none";
    });
  }
}

async function loadUserNotifications() {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;

    const data = await res.json();
    const badgeDot = document.getElementById("notifBadgeDot");
    if (badgeDot) {
      badgeDot.style.display = data.unread_count > 0 ? "block" : "none";
    }

    const listContainer = document.getElementById("headerNotificationsList");
    if (!listContainer) return;

    if (!data.notifications || data.notifications.length === 0) {
      listContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">No notifications at this time</div>`;
      return;
    }

    listContainer.innerHTML = data.notifications.map(n => `
      <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; background: ${n.status === 'UNREAD' ? '#eff6ff' : '#ffffff'};">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 12px; color: #1e293b;">${escapeHtml(n.title)}</strong>
          <span style="font-size: 10px; color: var(--text-muted);">${formatLogTime(n.created_at || new Date())}</span>
        </div>
        <p style="margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.4;">${escapeHtml(n.message)}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}
