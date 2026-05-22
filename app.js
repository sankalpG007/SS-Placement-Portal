// ======================================================
// SS INFOTECH - PLACEMENT PORTAL (FULLY CORRECTED)
// ======================================================

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwJxWoDiTIvY66EGUs6PQbcJ5Z8V7bZrzsE6GSC_pYHsB2kGJOkgfbRSLGPmjz9qeQmMQ/exec";

let loggedInCandidateName = "";
let currentCandidateEmail = "";

// ==================== API REQUEST (NO CORS PREFLIGHT) ====================
async function apiRequest(payload) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("API Response:", result);
    return result;
  } catch (error) {
    console.error("API ERROR:", error);
    return { status: "error", message: "Network Error: " + error.message };
  }
}

// ==================== LOADER FUNCTIONS ====================
function showLoader(msg) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.querySelector("p").innerText = msg || "Processing...";
    overlay.classList.add("show");
  }
}

function hideLoader() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.classList.remove("show");
  }
}

function setButtonLoading(btn, text) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  }
}

function resetButton(btn, originalHtml) {
  if (btn) {
    btn.disabled = false;
    if (originalHtml) btn.innerHTML = originalHtml;
  }
}

// ==================== AUTH TOGGLE ====================
let isRegisterMode = false;

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const loginForm = document.getElementById("loginForm");
  const regForm = document.getElementById("candidateRegisterForm");
  const toggleBtn = document.getElementById("toggleAuthBtn");
  const toggleText = document.getElementById("toggleText");

  if (isRegisterMode) {
    loginForm.style.display = "none";
    regForm.style.display = "block";
    toggleBtn.innerHTML = "<i class='fas fa-sign-in-alt'></i> Back to Login";
    toggleText.innerText = "Already have an account?";
  } else {
    loginForm.style.display = "block";
    regForm.style.display = "none";
    toggleBtn.innerHTML = "<i class='fas fa-user-plus'></i> Register as Candidate";
    toggleText.innerText = "New candidate looking for jobs?";
  }
}

// ==================== SWITCH VIEW ====================
function switchView(viewId, titleText) {
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.remove("active-view");
  });
  document.getElementById(viewId).classList.add("active-view");
  document.getElementById("portalTitle").innerHTML = `<i class="fas fa-briefcase"></i> SS Infotech · ${titleText}`;
  document.getElementById("logoutBtn").style.display = viewId === "loginView" ? "none" : "block";

  if (viewId === "adminView") {
    fetchAdminData();
    fetchFeedbackData();
  }
  if (viewId === "companyView") {
    fetchHRApplications();
  }
  if (viewId === "candidateView") {
    fetchActiveDrives();
  }
}

// ==================== LOGOUT ====================
function logout() {
  loggedInCandidateName = "";
  currentCandidateEmail = "";
  localStorage.clear();
  switchView("loginView", "Placement Provider");
}

// ==================== LOGIN HANDLER ====================
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;

  if (user === "admin" && pass === "admin123") {
    localStorage.setItem("userRole", "admin");
    switchView("adminView", "Admin Dashboard");
    return;
  }

  if (user === "hrpartner" && pass === "hr123") {
    localStorage.setItem("userRole", "hr");
    switchView("companyView", "HR Partner Workspace");
    return;
  }

  const btn = e.target.querySelector("button");
  setButtonLoading(btn, "Logging in...");
  showLoader("Verifying credentials...");

  const res = await apiRequest({
    action: "loginCandidate",
    email: user,
    password: pass
  });

  hideLoader();
  resetButton(btn, '<i class="fas fa-arrow-right-to-bracket"></i> Verify Credentials');

  if (res.status === "success") {
    loggedInCandidateName = res.candidateName;
    currentCandidateEmail = res.email;
    localStorage.setItem("userRole", "candidate");
    localStorage.setItem("candidateName", loggedInCandidateName);
    localStorage.setItem("candidateEmail", currentCandidateEmail);
    switchView("candidateView", `Welcome ${loggedInCandidateName}`);
  } else {
    alert(res.message || "Invalid Credentials");
  }
});

// ==================== REGISTRATION HANDLER ====================
document.getElementById("candidateRegisterForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const payload = {
    action: "registerCandidate",
    name: document.getElementById("regName").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPass").value,
    phone: document.getElementById("regPhone").value.trim(),
    skills: document.getElementById("regSkills").value.trim(),
    college: document.getElementById("regCollege").value.trim(),
    department: document.getElementById("regDept").value.trim(),
    experience: document.getElementById("regExp").value,
    relocate: document.getElementById("regRelocate").value
  };

  const sendRegistration = async (finalPayload) => {
    const btn = e.target.querySelector("button");
    setButtonLoading(btn, "Creating Account...");
    showLoader("Registering...");

    const res = await apiRequest(finalPayload);
    
    hideLoader();
    resetButton(btn, '<i class="fas fa-user-plus"></i> Create Account');

    if (res.status === "success") {
      alert("Registration Successful! Please login.");
      e.target.reset();
      toggleAuthMode();
    } else {
      alert(res.message || "Registration failed");
    }
  };

  const fileInput = document.getElementById("regResume").files[0];
  if (fileInput) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      payload.resumeFile = ev.target.result.split(",")[1];
      payload.resumeName = fileInput.name;
      payload.resumeType = fileInput.type;
      sendRegistration(payload);
    };
    reader.readAsDataURL(fileInput);
  } else {
    sendRegistration(payload);
  }
});

// ==================== FETCH ADMIN DATA ====================
async function fetchAdminData() {
  showLoader("Loading Admin Data...");
  
  const candRes = await apiRequest({ action: "getCandidates" });
  const driveRes = await apiRequest({ action: "getDrives" });
  const appRes = await apiRequest({ action: "getApplications" });

  if (candRes.status === "success") {
    document.getElementById("totalCandidatesCount").innerText = candRes.data.length;
    let html = "";
    candRes.data.forEach((u) => {
      html += `<tr>
        <td><strong>${u.name || ''}</strong></td>
        <td>${u.email || ''}</td>
        <td>${u.phone || ''}</td>
        <td>${u.skills || ''}</td>
        <td>${u.college || ''}</td>
        <td>${u.department || ''}</td>
        <td>${u.experience || ''}</td>
        <td>${u.relocate || ''}</td>
        <td>${u.resume || '-'}</td>
        <td><span class="status-badge">${u.status || "In Process"}</span></td>
      </tr>`;
    });
    document.getElementById("candidateTableBody").innerHTML = html || "<tr><td colspan='10'>No candidates found</td></tr>";
  }

  if (driveRes.status === "success") {
    document.getElementById("totalDrivesCount").innerText = driveRes.data.filter(d => d.status === "Active").length;
  }

  if (appRes.status === "success") {
    let appHtml = "";
    appRes.data.forEach((app) => {
      appHtml += `<tr>
        <td>${app.timestamp || '-'}</td>
        <td><strong>${app.candidate_name || ''}</strong></td>
        <td>${app.company_name || ''}</td>
        <td>${app.job_title || ''}</td>
        <td><span class="status-badge">${app.application_status || "Applied"}</span></td>
      </tr>`;
    });
    document.getElementById("adminApplicationsTableBody").innerHTML = appHtml || "<tr><td colspan='5'>No applications found</td></tr>";
  }
  
  hideLoader();
}

// ==================== FETCH FEEDBACK ====================
async function fetchFeedbackData() {
  const res = await apiRequest({ action: "getFeedbackToSSInfotech" });
  
  if (res.status === "success") {
    let feedbackHtml = "";
    let totalRating = 0;
    res.data.forEach((fb) => {
      totalRating += parseFloat(fb.avg_rating || 0);
      feedbackHtml += `<tr>
        <td>${fb.feedback_date || '-'}</td>
        <td>${fb.candidate_name || ''}</td>
        <td>${fb.candidate_email || ''}</td>
        <td>⭐ ${fb.avg_rating || 0}</td>
        <td>${fb.q1 || 0}</td>
        <td>${fb.q2 || 0}</td>
        <td>${fb.q3 || 0}</td>
        <td>${fb.q4 || 0}</td>
        <td>${fb.q5 || 0}</td>
        <td>${fb.q6 || 0}</td>
        <td>${fb.q7 || 0}</td>
        <td>${fb.q8 || 0}</td>
        <td>${fb.q9 || 0}</td>
        <td>${fb.q10 || 0}</td>
        <td>${fb.comments || '-'}</td>
      </tr>`;
    });
    document.getElementById("feedbackTableBody").innerHTML = feedbackHtml || "<tr><td colspan='15'>No feedback found</td></tr>";
    document.getElementById("totalFeedbacks").innerText = res.data.length;
    const avg = res.data.length > 0 ? (totalRating / res.data.length).toFixed(1) : 0;
    document.getElementById("avgRating").innerHTML = `⭐ ${avg}`;
  }
}

// ==================== FETCH HR APPLICATIONS (FIXED) ====================
async function fetchHRApplications() {
  showLoader("Loading Applications...");
  const res = await apiRequest({ action: "getApplications" });
  
  if (res.status === "success") {
    let html = "";
    res.data.forEach((app, idx) => {
      // ===== FIX: Properly escape ALL fields for inline onclick =====
      const candidateNameSafe = escapeForAttr(app.candidate_name || "");
      const candidateEmailSafe = escapeForAttr(app.candidate_email || "");
      const companyNameSafe = escapeForAttr(app.company_name || "");
      const jobTitleSafe = escapeForAttr(app.job_title || "");
      
      html += `<tr>
        <td>${app.timestamp || '-'}</td>
        <td><strong>${app.candidate_name || ''}</strong></td>
        <td>${app.candidate_email || ''}</td>
        <td>${app.company_name || ''}</td>
        <td>${app.job_title || ''}</td>
        <td>
          <select id="statusSelect_${idx}" class="rating-select">
            <option value="Applied" ${app.application_status === "Applied" ? "selected" : ""}>Applied</option>
            <option value="Under Review" ${app.application_status === "Under Review" ? "selected" : ""}>Under Review</option>
            <option value="Shortlisted" ${app.application_status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
            <option value="Interview Scheduled" ${app.application_status === "Interview Scheduled" ? "selected" : ""}>Interview Scheduled</option>
            <option value="Selected" ${app.application_status === "Selected" ? "selected" : ""}>Selected</option>
            <option value="Rejected" ${app.application_status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>
        </td>
        <td>
          <button class="save-btn" onclick='updateAppStatus(${idx}, "${candidateNameSafe}", "${candidateEmailSafe}", "${companyNameSafe}", "${jobTitleSafe}")'>
            <i class="fas fa-save"></i> Save
          </button>
        </td>
      </tr>`;
    });
    document.getElementById("hrApplicationsTableBody").innerHTML = html || "<tr><td colspan='7'>No applications found</td></tr>";
  }
  hideLoader();
}

// ==================== UPDATE APPLICATION STATUS (FIXED) ====================
window.updateAppStatus = async function(idx, candidateName, candidateEmail, companyName, jobTitle) {
  const select = document.getElementById(`statusSelect_${idx}`);
  if (!select) {
    alert("Error: Could not find status selector");
    return;
  }
  
  const newStatus = select.value;
  const btn = select.closest("tr").querySelector(".save-btn");
  
  if (!confirm(`Update status of "${candidateName}" for "${jobTitle}" at "${companyName}" to "${newStatus}"?`)) {
    return;
  }
  
  setButtonLoading(btn, "Saving...");
  showLoader("Updating status...");
  
  // ===== FIX: Now sending candidateEmail along with other fields =====
  const res = await apiRequest({
    action: "updateApplicationStatus",
    candidateName: candidateName,
    candidateEmail: candidateEmail,     // <-- THIS WAS MISSING
    companyName: companyName,
    jobTitle: jobTitle,
    newStatus: newStatus
  });
  
  hideLoader();
  resetButton(btn, '<i class="fas fa-save"></i> Save');
  
  if (res.status === "success") {
    alert("✅ " + res.message);
    fetchHRApplications();
  } else {
    alert("❌ Error: " + (res.message || "Could not update status"));
    // Log debug info if available
    if (res.debug) {
      console.error("Server Debug Info:", res.debug);
    }
  }
};

// ==================== FETCH ACTIVE DRIVES ====================
async function fetchActiveDrives() {
  showLoader("Loading Drives...");
  const res = await apiRequest({ action: "getDrives" });
  
  if (res.status === "success") {
    const activeDrives = res.data.filter(d => d.status === "Active");
    let grid = "";
    activeDrives.forEach((d) => {
      const companySafe = escapeForAttr(d.company_name || "");
      const jobSafe = escapeForAttr(d.job_title || "");
      
      grid += `<div class="drive-card">
        <h4>${d.job_title || ''}</h4>
        <span class="company-badge"><i class="fas fa-building"></i> ${d.company_name || ''}</span>
        <p><strong><i class="fas fa-graduation-cap"></i> Eligibility:</strong> ${d.eligibility || 'N/A'}</p>
        <p><strong><i class="fas fa-file-alt"></i> Description:</strong> ${d.description || 'No description'}</p>
        <p><strong><i class="fas fa-user-tie"></i> HR:</strong> ${d.hr_name || 'N/A'}</p>
        <button class="apply-btn" onclick="applyToDrive('${companySafe}', '${jobSafe}')">
          <i class="fas fa-paper-plane"></i> Quick Apply
        </button>
      </div>`;
    });
    document.getElementById("drivesGrid").innerHTML = grid || "<p class='placeholder-text'>No active drives available</p>";
  }
  hideLoader();
}

// ==================== APPLY TO DRIVE ====================
window.applyToDrive = async function(company, jobTitle) {
  const candidateName = localStorage.getItem("candidateName");
  const candidateEmail = localStorage.getItem("candidateEmail");
  
  if (!candidateName) {
    alert("Please login again");
    logout();
    return;
  }
  
  showLoader("Submitting Application...");
  const res = await apiRequest({
    action: "submitApplication",
    candidateName: candidateName,
    candidateEmail: candidateEmail,
    companyName: company,
    jobTitle: jobTitle
  });
  
  hideLoader();
  
  if (res.status === "success") {
    alert("✅ Application Submitted Successfully!");
  } else {
    alert("ℹ️ " + (res.message || "Could not submit application"));
  }
};

// ==================== SUBMIT FEEDBACK ====================
window.submitFeedbackToSSInfotech = async function() {
  const candidateName = localStorage.getItem("candidateName");
  const candidateEmail = localStorage.getItem("candidateEmail");
  
  if (!candidateName) {
    alert("Please login first!");
    logout();
    return;
  }

  const ratings = [];
  for (let i = 1; i <= 10; i++) {
    const val = document.getElementById(`q${i}`).value;
    if (val === "0") {
      alert(`Please answer Question ${i}`);
      return;
    }
    ratings.push(val);
  }

  const sum = ratings.reduce((a, b) => a + parseInt(b), 0);
  const avgRating = (sum / 10).toFixed(1);
  const comments = document.getElementById("additionalComments").value;

  const btn = document.querySelector(".feedback-submit-btn");
  setButtonLoading(btn, "Submitting...");
  showLoader("Submitting Feedback...");

  const res = await apiRequest({
    action: "addFeedbackToSSInfotech",
    candidateName: candidateName,
    candidateEmail: candidateEmail,
    q1: ratings[0], q2: ratings[1], q3: ratings[2], q4: ratings[3], q5: ratings[4],
    q6: ratings[5], q7: ratings[6], q8: ratings[7], q9: ratings[8], q10: ratings[9],
    avgRating: avgRating,
    comments: comments
  });
  
  hideLoader();
  resetButton(btn, '<i class="fas fa-paper-plane"></i> Submit Feedback to SS Infotech');

  if (res.status === "success") {
    alert("✅ Thank you for your feedback!");
    for (let i = 1; i <= 10; i++) {
      document.getElementById(`q${i}`).value = "0";
    }
    document.getElementById("additionalComments").value = "";
  } else {
    alert("❌ " + (res.message || "Failed to submit feedback"));
  }
};

// ==================== CREATE DRIVE (HR) ====================
document.getElementById("driveForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const btn = e.target.querySelector("button");
  setButtonLoading(btn, "Publishing...");
  showLoader("Publishing Drive...");
  
  const res = await apiRequest({
    action: "postDrive",
    companyName: document.getElementById("compName").value,
    hrName: document.getElementById("hrName").value,
    jobTitle: document.getElementById("jobTitle").value,
    eligibility: document.getElementById("eligibility").value,
    description: document.getElementById("jobDesc").value
  });
  
  hideLoader();
  resetButton(btn, '<i class="fas fa-bullhorn"></i> Publish Drive');
  
  if (res.status === "success") {
    alert("✅ Drive Published Successfully!");
    e.target.reset();
  } else {
    alert("❌ " + (res.message || "Failed to publish drive"));
  }
});

// ==================== ESCAPE FOR HTML ATTRIBUTE ====================
function escapeForAttr(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}

// ==================== EXPORT TABLE ====================
function exportTableToExcel(tableBodyId, filename) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody || tbody.querySelectorAll("tr").length === 0) {
    return alert("No data to export");
  }
  
  let csv = [];
  const table = tbody.closest("table");
  const headers = Array.from(table.querySelectorAll("th")).map(th => `"${th.innerText.replace(/"/g, '""')}"`);
  csv.push(headers.join(","));
  
  Array.from(tbody.querySelectorAll("tr")).forEach(row => {
    let rowData = [];
    Array.from(row.cells).forEach(cell => {
      rowData.push(`"${cell.innerText.replace(/"/g, '""')}"`);
    });
    csv.push(rowData.join(","));
  });
  
  const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ==================== FILTER TABLE ====================
function filterTable(tbodyId, query) {
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}

// ==================== SEARCH LISTENERS ====================
document.getElementById("adminCandidateSearch")?.addEventListener("input", function() {
  filterTable("candidateTableBody", this.value);
});
document.getElementById("adminAppSearch")?.addEventListener("input", function() {
  filterTable("adminApplicationsTableBody", this.value);
});
document.getElementById("hrAppSearch")?.addEventListener("input", function() {
  filterTable("hrApplicationsTableBody", this.value);
});
document.getElementById("feedbackSearch")?.addEventListener("input", function() {
  filterTable("feedbackTableBody", this.value);
});

// ==================== RESTORE SESSION ====================
window.onload = () => {
  const role = localStorage.getItem("userRole");
  if (role === "admin") {
    switchView("adminView", "Admin Dashboard");
  } else if (role === "hr") {
    switchView("companyView", "HR Partner Workspace");
  } else if (role === "candidate") {
    loggedInCandidateName = localStorage.getItem("candidateName") || "";
    currentCandidateEmail = localStorage.getItem("candidateEmail") || "";
    if (loggedInCandidateName) {
      switchView("candidateView", `Welcome ${loggedInCandidateName}`);
    } else {
      switchView("loginView", "Placement Provider");
    }
  } else {
    switchView("loginView", "Placement Provider");
  }
};