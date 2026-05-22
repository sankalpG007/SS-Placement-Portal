// ======================================================
// SS INFOTECH - CLIENT SIDE LOGIC (FULL app.js)
// ======================================================

// ================= CONFIGURATION =================
// REPLACE THE URL BELOW WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwJxWoDiTIvY66EGUs6PQbcJ5Z8V7bZrzsE6GSC_pYHsB2kGJOkgfbRSLGPmjz9qeQmMQ/exec";

// ================= STATE VARIABLES =================
let loggedInCandidateName = "";
let currentCandidateEmail = "";

// ================= API HELPER =================
// Handles fetch requests to Google Apps Script
async function apiRequest(payload) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("API Response:", result); // For debugging in Browser Console (F12)
    return result;
  } catch (error) {
    console.error("API ERROR:", error);
    return { status: "error", message: "Network Error: " + error.message };
  }
}

// ================= UI HELPERS =================
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
    const originalText = btn.innerHTML;
    btn.setAttribute("data-original", originalText);
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  }
}

function resetButton(btn) {
  if (btn) {
    btn.disabled = false;
    const originalText = btn.getAttribute("data-original");
    if (originalText) btn.innerHTML = originalText;
  }
}

// ================= VIEW MANAGEMENT =================
function switchView(viewId, titleText) {
  // Hide all views
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.remove("active-view");
  });

  // Show requested view
  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add("active-view");
  }

  // Update Header Title
  if (document.getElementById("portalTitle")) {
    document.getElementById("portalTitle").innerHTML = `<i class="fas fa-briefcase"></i> SS Infotech · ${titleText}`;
  }

  // Toggle Logout Button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.style.display = viewId === "loginView" ? "none" : "block";
  }

  // Trigger Data Loading based on view
  if (viewId === "adminView") {
    fetchAdminData();
    fetchFeedbackData();
  } else if (viewId === "companyView") {
    fetchHRApplications();
  } else if (viewId === "candidateView") {
    fetchActiveDrives();
     fetchSelectedCandidates();
  }
}

// ================= AUTH LOGIC =================

// Toggle between Login and Register forms
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

// Handle Login
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;

  // 1. Hardcoded Admin Check
  if (user === "admin" && pass === "admin123") {
    localStorage.setItem("userRole", "admin");
    switchView("adminView", "Admin Dashboard");
    return;
  }

  // 2. Hardcoded HR Check
  if (user === "hrpartner" && pass === "hr123") {
    localStorage.setItem("userRole", "hr");
    switchView("companyView", "HR Partner Workspace");
    return;
  }

  // 3. Candidate Login (Backend)
  const btn = e.target.querySelector("button");
  setButtonLoading(btn, "Verifying...");
  showLoader("Verifying credentials...");

  const res = await apiRequest({
    action: "loginCandidate",
    email: user,
    password: pass
  });

  hideLoader();
  resetButton(btn);

  if (res.status === "success") {
    loggedInCandidateName = res.candidateName;
    currentCandidateEmail = res.email;
    localStorage.setItem("userRole", "candidate");
    localStorage.setItem("candidateName", loggedInCandidateName);
    localStorage.setItem("candidateEmail", currentCandidateEmail);
    switchView("candidateView", `Welcome ${loggedInCandidateName}`);
  } else {
    alert("Login Failed: " + (res.message || "Invalid credentials"));
  }
});

// Handle Registration
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
    resetButton(btn);

    if (res.status === "success") {
      alert("✅ Registration Successful! Please login.");
      e.target.reset();
      toggleAuthMode();
    } else {
      alert("❌ Registration Failed: " + (res.message || "Unknown error"));
    }
  };

  // Handle File Upload (Base64 conversion)
  const fileInput = document.getElementById("regResume").files[0];
  if (fileInput) {
    // Check file size (limit to 5MB for Google Sheets safety)
    if (fileInput.size > 5 * 1024 * 1024) {
      alert("File is too large. Please upload a file smaller than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      payload.resumeFile = ev.target.result.split(",")[1]; // Get Base64 data
      payload.resumeName = fileInput.name;
      payload.resumeType = fileInput.type;
      sendRegistration(payload);
    };
    reader.readAsDataURL(fileInput);
  } else {
    sendRegistration(payload);
  }
});

// Logout
function logout() {
  loggedInCandidateName = "";
  currentCandidateEmail = "";
  localStorage.clear();
  switchView("loginView", "Placement Provider");
}

// ================= ADMIN FUNCTIONS =================

async function fetchAdminData() {
  showLoader("Loading Dashboard...");

  // Fetch Candidates
  const candRes = await apiRequest({ action: "getCandidates" });
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
        <td>${u.resume ? '<a href="#" onclick="alert(\'Viewing resume directly from Sheet\')">View</a>' : '-'}</td>
        <td><span class="status-badge">${u.status || "In Process"}</span></td>
      </tr>`;
    });
    document.getElementById("candidateTableBody").innerHTML = html || "<tr><td colspan='10'>No candidates found</td></tr>";
  }

  // Fetch Drives (just for count)
  const driveRes = await apiRequest({ action: "getDrives" });
  if (driveRes.status === "success") {
    const activeCount = driveRes.data.filter(d => (d.status || "").toLowerCase() === "active").length;
    document.getElementById("totalDrivesCount").innerText = activeCount;
  }

  // Fetch Applications
  const appRes = await apiRequest({ action: "getApplications" });
  if (appRes.status === "success") {
    let appHtml = "";
    appRes.data.forEach((app) => {
      appHtml += `<tr>
        <td>${app.timestamp || '-'}</td>
        <td><strong>${app.candidate_name || ''}</strong></td>
        <td>${app.company_name || ''}</td>
        <td>${app.job_title || ''}</td>
        <td><span class="status-badge ${app.application_status || 'Applied'}">${app.application_status || "Applied"}</span></td>
      </tr>`;
    });
    document.getElementById("adminApplicationsTableBody").innerHTML = appHtml || "<tr><td colspan='5'>No applications found</td></tr>";
  }

  hideLoader();
}

async function fetchFeedbackData() {
  const res = await apiRequest({ action: "getFeedbackToSSInfotech" });

  if (res.status === "success") {
    let feedbackHtml = "";
    let totalRating = 0;
    
    res.data.forEach((fb) => {
      const rating = parseFloat(fb.avg_rating || 0);
      totalRating += rating;
      
      feedbackHtml += `<tr>
        <td>${fb.feedback_date || '-'}</td>
        <td>${fb.candidate_name || ''}</td>
        <td>${fb.candidate_email || ''}</td>
        <td>⭐ ${rating}</td>
        <td>${fb.q1 || 0}</td><td>${fb.q2 || 0}</td><td>${fb.q3 || 0}</td>
        <td>${fb.q4 || 0}</td><td>${fb.q5 || 0}</td><td>${fb.q6 || 0}</td>
        <td>${fb.q7 || 0}</td><td>${fb.q8 || 0}</td><td>${fb.q9 || 0}</td>
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

// ================= HR PARTNER FUNCTIONS =================

// Post a new Drive
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
  resetButton(btn);
  
  if (res.status === "success") {
    alert("✅ Drive Published Successfully!");
    e.target.reset();
  } else {
    alert("❌ Error: " + (res.message || "Failed to publish drive"));
  }
});

// Fetch Applications for HR
async function fetchHRApplications() {
  showLoader("Loading Applications...");
  const res = await apiRequest({ action: "getApplications" });
  
  if (res.status === "success") {
    let html = "";
    res.data.forEach((app, idx) => {
      // ESCAPE STRINGS: Prevents JavaScript errors if names contain quotes (e.g. O'Connor)
      const cName = escapeForAttr(app.candidate_name || "");
      const cEmail = escapeForAttr(app.candidate_email || "");
      const comp = escapeForAttr(app.company_name || "");
      const job = escapeForAttr(app.job_title || "");
      
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
          <button class="save-btn" style="padding:5px 10px; cursor:pointer;" onclick='updateAppStatus(${idx}, "${cName}", "${cEmail}", "${comp}", "${job}")'>
            <i class="fas fa-save"></i> Save
          </button>
        </td>
      </tr>`;
    });
    document.getElementById("hrApplicationsTableBody").innerHTML = html || "<tr><td colspan='7'>No applications found</td></tr>";
  }
  hideLoader();
}

// Update Application Status
window.updateAppStatus = async function(idx, candidateName, candidateEmail, companyName, jobTitle) {
  const select = document.getElementById(`statusSelect_${idx}`);
  if (!select) return;
  
  const newStatus = select.value;
  const btn = select.closest("tr").querySelector(".save-btn");
  
  if (!confirm(`Update status for "${candidateName}" to "${newStatus}"?`)) return;
  
  setButtonLoading(btn, "Saving...");
  showLoader("Updating status...");
  
  const res = await apiRequest({
    action: "updateApplicationStatus",
    candidateName: candidateName,
    candidateEmail: candidateEmail,
    companyName: companyName,
    jobTitle: jobTitle,
    newStatus: newStatus
  });
  
  hideLoader();
  resetButton(btn);
  
  if (res.status === "success") {
    alert("✅ " + res.message);
    // Refresh table to show update (optional, or just keep local state)
    // fetchHRApplications(); 
  } else {
    alert("❌ Error: " + (res.message || "Could not update status"));
    console.error("Debug:", res.debug);
  }
};

// ================= CANDIDATE FUNCTIONS =================

// Fetch Active Drives (FIXED)
async function fetchActiveDrives() {
  const gridContainer = document.getElementById("drivesGrid");
  showLoader("Loading Drives...");
  gridContainer.innerHTML = '<p class="placeholder-text">Fetching opportunities...</p>';

  const res = await apiRequest({ action: "getDrives" });
  
  if (res.status === "success") {
    console.log("Drives Data:", res.data);
    
    // Filter: Must be "Active" (case-insensitive)
    const activeDrives = res.data.filter(d => {
      const status = (d.status || "active").toString().toLowerCase().trim();
      return status === "active";
    });

    if (activeDrives.length > 0) {
      let grid = "";
      activeDrives.forEach((d) => {
        // Escape strings for HTML safety
        const cSafe = (d.company_name || "").replace(/'/g, "&#39;");
        const jSafe = (d.job_title || "").replace(/'/g, "&#39;");
        const desc = (d.description || "No description.").replace(/'/g, "&#39;");
        const elig = (d.eligibility || "N/A").replace(/'/g, "&#39;");

        grid += `<div class="drive-card">
          <h4>${jSafe}</h4>
          <span class="company-badge"><i class="fas fa-building"></i> ${cSafe}</span>
          <p><strong><i class="fas fa-graduation-cap"></i> Eligibility:</strong> ${elig}</p>
          <p class="desc"><strong><i class="fas fa-info-circle"></i> Description:</strong> ${desc}</p>
          <p style="font-size:0.9rem; color:#666; margin-top:5px;"><strong>HR:</strong> ${d.hr_name || 'N/A'}</p>
          <button class="apply-btn" onclick="applyToDrive('${cSafe}', '${jSafe}')">
            <i class="fas fa-paper-plane"></i> Quick Apply
          </button>
        </div>`;
      });
      gridContainer.innerHTML = grid;
    } else {
      gridContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;">
          <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>No active drives found at the moment.</p>
        </div>`;
    }
  } else {
    gridContainer.innerHTML = `<p style="color:red; text-align:center;">Error loading drives: ${res.message}</p>`;
  }
  hideLoader();
}

// Apply to a Drive
// =================================================================
// APPLY TO A DRIVE (WITH 3-COMPANY MAX LIMIT VALIDATION)
// =================================================================
window.applyToDrive = async function(company, jobTitle) {
  if (!loggedInCandidateName || !currentCandidateEmail) {
    alert("Session expired or invalid. Please login again.");
    logout();
    return;
  }
  
  showLoader("Checking application threshold limits...");

  try {
    // 1. Fetch all applications from the centralized backend stream
    const verificationCheck = await apiRequest({ action: "getApplications" });
    
    if (verificationCheck.status === "success") {
      // Filter out application records belonging strictly to this user's email
      const myActiveApplications = verificationCheck.data.filter(app => 
        String(app.candidate_email).toLowerCase().trim() === String(currentCandidateEmail).toLowerCase().trim()
      );

      // Check if they already applied to this exact company role to prevent duplicates
      const isAlreadyApplied = myActiveApplications.some(app => 
        String(app.company_name).toLowerCase().trim() === String(company).toLowerCase().trim() &&
        String(app.job_title).toLowerCase().trim() === String(jobTitle).toLowerCase().trim()
      );

      if (isAlreadyApplied) {
        hideLoader();
        alert(`ℹ️ You have already submitted an active application profile for the ${jobTitle} role at ${company}.`);
        return;
      }

      // 2. ENFORCE VALIDATION CRITERIA: Check threshold
      if (myActiveApplications.length >= 3) {
        hideLoader();
        alert(`❌ Threshold Limit Reached: You are registered for ${myActiveApplications.length} companies. Candidates are restricted to a maximum of 3 placement drive choices.`);
        return;
      }
    }

    // 3. Process transmission to database sheet if validation checks pass smoothly
    showLoader("Submitting Application Profile...");
    const res = await apiRequest({
      action: "submitApplication",
      candidateName: loggedInCandidateName,
      candidateEmail: currentCandidateEmail,
      companyName: company,
      jobTitle: jobTitle
    });
    
    hideLoader();
    
    if (res.status === "success") {
      alert(`✅ Application Submitted Successfully for ${jobTitle} at ${company}!`);
    } else {
      alert("ℹ️ " + (res.message || "Could not submit application"));
    }

  } catch (err) {
    console.error("Pipeline failure during limit check:", err);
    hideLoader();
    alert("Network pipeline connection timeout error.");
  }
};

// Submit Feedback
window.submitFeedbackToSSInfotech = async function() {
  if (!loggedInCandidateName) {
    alert("Please login first!");
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
    candidateName: loggedInCandidateName,
    candidateEmail: currentCandidateEmail,
    q1: ratings[0], q2: ratings[1], q3: ratings[2], q4: ratings[3], q5: ratings[4],
    q6: ratings[5], q7: ratings[6], q8: ratings[7], q9: ratings[8], q10: ratings[9],
    avgRating: avgRating,
    comments: comments
  });
  
  hideLoader();
  resetButton(btn);

  if (res.status === "success") {
    alert("✅ Thank you for your feedback!");
    // Reset form
    for (let i = 1; i <= 10; i++) document.getElementById(`q${i}`).value = "0";
    document.getElementById("additionalComments").value = "";
  } else {
    alert("❌ " + (res.message || "Failed to submit feedback"));
  }
};

// ================= UTILITIES =================

// Escape strings for use inside HTML attributes (e.g. onclick='...')
function escapeForAttr(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, " ");
}

// Export Table to Excel (CSV)
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

// Search/Filter Table
function filterTable(tbodyId, query) {
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}

// Attach Search Listeners
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

// ======================================================
// FETCH SELECTED CANDIDATES TABLE
// ======================================================

async function fetchSelectedCandidates() {

  const tableBody = document.getElementById("selectedCandidatesTableBody");

  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading-row">
        Loading selected candidates...
      </td>
    </tr>
  `;

  try {

    const res = await apiRequest({
      action: "getApplications"
    });

    // SUCCESS
    if (res.status === "success") {

      // FILTER ONLY SELECTED
      const selectedCandidates = res.data.filter(app =>
        (app.application_status || "").toLowerCase() === "selected"
      );

      // NO DATA
      if (selectedCandidates.length === 0) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="loading-row">
              No selected candidates yet.
            </td>
          </tr>
        `;

        return;
      }

      let html = "";

      selectedCandidates.reverse().forEach((app, index) => {

        // GET INITIALS
        const initials = (app.candidate_name || "C")
          .split(" ")
          .map(word => word[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

        html += `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              <div class="candidate-info">

                <div class="candidate-avatar">
                  ${initials}
                </div>

                <div class="candidate-name">
                  ${app.candidate_name || "Candidate"}
                </div>

              </div>
            </td>

            <td>
              <span class="role-badge">
                ${app.job_title || "Role"}
              </span>
            </td>

            <td>
              <span class="company-badge">
                <i class="fas fa-building"></i>
                ${app.company_name || "Company"}
              </span>
            </td>

            <td>
              <i class="fas fa-envelope"></i>
              ${app.candidate_email || "-"}
            </td>

            <td>
              <i class="fas fa-calendar"></i>
              ${app.timestamp || "-"}
            </td>

            <td>
              <span class="status-badge">
                <i class="fas fa-circle-check"></i>
                Selected
              </span>
            </td>

          </tr>
        `;

      });

      tableBody.innerHTML = html;

    } else {

      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-row">
            Failed to load selected candidates.
          </td>
        </tr>
      `;

    }

  } catch (error) {

    console.error(error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-row">
          Something went wrong while fetching data.
        </td>
      </tr>
    `;

  }

}

// CALL FUNCTION
fetchSelectedCandidates();

// ================= INITIALIZATION =================
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