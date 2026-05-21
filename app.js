// ============================
// SS INFOTECH - PLACEMENT PROVIDER PORTAL
// ============================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyNaXGlXLF_7QrYQyvF1b_7nI0u-dcx0crjFd4EUFT-CfzSauFLfQpCIU1zXG3vpOXmjw/exec";

let loggedInCandidateName = "";
let currentCandidateEmail = "";

// ============================
// COMMON API FUNCTION
// ============================

async function apiRequest(payload) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error("API ERROR:", error);

    return {
      status: "error",
      message: "Network Error",
    };
  }
}

// ============================
// LOADER
// ============================

function showLoader(msg) {
  const overlay = document.getElementById("loadingOverlay");

  if (overlay) {
    overlay.querySelector("p").innerText = msg;
    overlay.classList.add("show");
  }
}

function hideLoader() {
  document.getElementById("loadingOverlay")?.classList.remove("show");
}

// ============================
// AUTH TOGGLE
// ============================

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

    toggleBtn.innerHTML =
      "<i class='fas fa-sign-in-alt'></i> Back to Login";

    toggleText.innerText = "Already have an account?";
  } else {
    loginForm.style.display = "block";
    regForm.style.display = "none";

    toggleBtn.innerHTML =
      "<i class='fas fa-user-plus'></i> Register as Candidate";

    toggleText.innerText = "New candidate looking for jobs?";
  }
}

// ============================
// SWITCH VIEW
// ============================

function switchView(viewId, titleText) {
  document
    .querySelectorAll(".view-panel")
    .forEach((p) => p.classList.remove("active-view"));

  document.getElementById(viewId).classList.add("active-view");

  document.getElementById(
    "portalTitle"
  ).innerHTML = `<i class="fas fa-briefcase"></i> SS Infotech · ${titleText}`;

  document.getElementById("logoutBtn").style.display =
    viewId === "loginView" ? "none" : "block";

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

// ============================
// LOGOUT
// ============================

function logout() {
  loggedInCandidateName = "";
  currentCandidateEmail = "";

  localStorage.clear();

  switchView("loginView", "Placement Provider");
}

// ============================
// LOGIN
// ============================

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;

    // ADMIN LOGIN
    if (user === "admin" && pass === "admin123") {
      localStorage.setItem("userRole", "admin");

      switchView("adminView", "Admin Dashboard");

      return;
    }

    // HR LOGIN
    if (user === "hrpartner" && pass === "hr123") {
      localStorage.setItem("userRole", "hr");

      switchView("companyView", "HR Partner Workspace");

      return;
    }

    showLoader("Logging in...");

    const res = await apiRequest({
      action: "loginCandidate",
      email: user,
      password: pass,
    });

    hideLoader();

    if (res.status === "success") {
      loggedInCandidateName = res.candidateName;

      currentCandidateEmail = res.email;

      localStorage.setItem("userRole", "candidate");

      localStorage.setItem(
        "candidateName",
        loggedInCandidateName
      );

      localStorage.setItem(
        "candidateEmail",
        currentCandidateEmail
      );

      switchView(
        "candidateView",
        `Welcome ${loggedInCandidateName}`
      );
    } else {
      alert(res.message || "Invalid Credentials");
    }
  });

// ============================
// REGISTRATION
// ============================

document
  .getElementById("candidateRegisterForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    showLoader("Registering Candidate...");

    const payload = {
      action: "registerCandidate",

      name: document.getElementById("regName").value.trim(),

      email: document.getElementById("regEmail").value.trim(),

      password: document.getElementById("regPass").value,

      phone: document.getElementById("regPhone").value.trim(),

      skills: document.getElementById("regSkills").value.trim(),
    };

    const res = await apiRequest(payload);

    hideLoader();

    if (res.status === "success") {
      alert("Registration Successful!");

      e.target.reset();

      toggleAuthMode();
    } else {
      alert(res.message || "Registration Failed");
    }
  });

// ============================
// FETCH ADMIN DATA
// ============================

async function fetchAdminData() {
  showLoader("Loading Admin Data...");

  try {
    const [candRes, driveRes, appRes] = await Promise.all([
      apiRequest({ action: "getCandidates" }),

      apiRequest({ action: "getDrives" }),

      apiRequest({ action: "getApplications" }),
    ]);

    // CANDIDATES
    if (candRes.status === "success") {
      document.getElementById(
        "totalCandidatesCount"
      ).innerText = candRes.data.length;

      let html = "";

      candRes.data.forEach((u) => {
        html += `
          <tr>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.skills}</td>
            <td>${u.resume || "-"}</td>
          </tr>
        `;
      });

      document.getElementById(
        "candidateTableBody"
      ).innerHTML =
        html ||
        "<tr><td colspan='5'>No candidates found</td></tr>";
    }

    // DRIVES
    if (driveRes.status === "success") {
      document.getElementById(
        "totalDrivesCount"
      ).innerText = driveRes.data.length;
    }

    // APPLICATIONS
    if (appRes.status === "success") {
      let appHtml = "";

      appRes.data.forEach((app) => {
        appHtml += `
          <tr>
            <td>${new Date(
              app.timestamp
            ).toLocaleDateString()}</td>

            <td><strong>${app.candidate_name}</strong></td>

            <td>${app.company_name}</td>

            <td>${app.job_title}</td>

            <td>
              <span class="status-badge">
                ${app.application_status || "Applied"}
              </span>
            </td>
          </tr>
        `;
      });

      document.getElementById(
        "adminApplicationsTableBody"
      ).innerHTML =
        appHtml ||
        "<tr><td colspan='5'>No applications</td></tr>";
    }
  } catch (err) {
    console.error(err);
  }

  hideLoader();
}

// ============================
// FEEDBACK DATA
// ============================

async function fetchFeedbackData() {
  showLoader("Loading Feedback...");

  const res = await apiRequest({
    action: "getFeedbackToSSInfotech",
  });

  if (res.status === "success") {
    let feedbackHtml = "";

    let totalRating = 0;

    res.data.forEach((fb) => {
      totalRating += parseFloat(fb.avg_rating || 0);

      feedbackHtml += `
        <tr>
          <td>${new Date(
            fb.feedback_date
          ).toLocaleDateString()}</td>

          <td>${fb.candidate_name}</td>

          <td>${fb.candidate_email}</td>

          <td>⭐ ${fb.avg_rating}</td>

          <td>${fb.comments || "-"}</td>
        </tr>
      `;
    });

    document.getElementById(
      "feedbackTableBody"
    ).innerHTML =
      feedbackHtml ||
      "<tr><td colspan='5'>No feedback</td></tr>";

    document.getElementById(
      "totalFeedbacks"
    ).innerText = res.data.length;

    const avg =
      res.data.length > 0
        ? (totalRating / res.data.length).toFixed(1)
        : 0;

    document.getElementById(
      "avgRating"
    ).innerHTML = `⭐ ${avg}`;
  }

  hideLoader();
}

// ============================
// HR APPLICATIONS
// ============================

async function fetchHRApplications() {
  showLoader("Loading Applications...");

  const res = await apiRequest({
    action: "getApplications",
  });

  if (res.status === "success") {
    let html = "";

    res.data.forEach((app, idx) => {
      html += `
        <tr>
          <td>${new Date(
            app.timestamp
          ).toLocaleDateString()}</td>

          <td>${app.candidate_name}</td>

          <td>${app.company_name}</td>

          <td>${app.job_title}</td>

          <td>
            <select id="statusSelect_${idx}" class="rating-select">

              <option value="Applied"
                ${
                  app.application_status === "Applied"
                    ? "selected"
                    : ""
                }>
                Applied
              </option>

              <option value="In Process"
                ${
                  app.application_status === "In Process"
                    ? "selected"
                    : ""
                }>
                In Process
              </option>

              <option value="Selected"
                ${
                  app.application_status === "Selected"
                    ? "selected"
                    : ""
                }>
                Selected
              </option>

              <option value="Rejected"
                ${
                  app.application_status === "Rejected"
                    ? "selected"
                    : ""
                }>
                Rejected
              </option>

            </select>
          </td>

          <td>
            <button
              class="export-btn"
              onclick="updateStatus(
                ${idx},
                '${app.candidate_name}',
                '${app.company_name}',
                '${app.job_title}'
              )"
            >
              Save
            </button>
          </td>
        </tr>
      `;
    });

    document.getElementById(
      "hrApplicationsTableBody"
    ).innerHTML =
      html ||
      "<tr><td colspan='6'>No applications</td></tr>";
  }

  hideLoader();
}

// ============================
// UPDATE STATUS
// ============================

window.updateStatus = async function (
  idx,
  candidateName,
  company,
  role
) {
  const newStatus =
    document.getElementById(`statusSelect_${idx}`).value;

  showLoader("Updating Status...");

  const res = await apiRequest({
    action: "updateApplicationStatus",

    candidateName,

    companyName: company,

    jobTitle: role,

    newStatus,
  });

  hideLoader();

  alert(res.message || "Updated");

  fetchHRApplications();
};

// ============================
// FETCH ACTIVE DRIVES
// ============================

async function fetchActiveDrives() {
  showLoader("Loading Drives...");

  const res = await apiRequest({
    action: "getDrives",
  });

  if (res.status === "success") {
    let grid = "";

    res.data.forEach((d) => {
      grid += `
        <div class="drive-card">

          <h4>${d.job_title}</h4>

          <span class="company-badge">
            ${d.company_name}
          </span>

          <p>
            <strong>Eligibility:</strong>
            ${d.eligibility}
          </p>

          <p>
            <strong>Description:</strong>
            ${d.description}
          </p>

          <button
            class="apply-btn"
            onclick="applyToDrive(
              '${d.company_name}',
              '${d.job_title}'
            )"
          >
            Quick Apply
          </button>

        </div>
      `;
    });

    document.getElementById("drivesGrid").innerHTML =
      grid ||
      "<p class='placeholder-text'>No drives available</p>";
  }

  hideLoader();
}

// ============================
// APPLY TO DRIVE
// ============================

window.applyToDrive = async function (
  company,
  jobTitle
) {
  const candidateName =
    localStorage.getItem("candidateName");

  const candidateEmail =
    localStorage.getItem("candidateEmail");

  if (!candidateName) {
    alert("Please login again");

    logout();

    return;
  }

  showLoader("Applying...");

  const res = await apiRequest({
    action: "submitApplication",

    candidateName,

    candidateEmail,

    companyName: company,

    jobTitle,
  });

  hideLoader();

  alert(
    res.status === "success"
      ? "Applied Successfully!"
      : res.message
  );
};

// ============================
// SUBMIT FEEDBACK
// ============================

window.submitFeedbackToSSInfotech =
  async function () {
    const candidateName =
      localStorage.getItem("candidateName");

    const candidateEmail =
      localStorage.getItem("candidateEmail");

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

    const sum = ratings.reduce(
      (a, b) => a + parseInt(b),
      0
    );

    const avgRating = (sum / 10).toFixed(1);

    const comments =
      document.getElementById(
        "additionalComments"
      ).value;

    showLoader("Submitting Feedback...");

    const res = await apiRequest({
      action: "addFeedbackToSSInfotech",

      candidateName,

      candidateEmail,

      q1: ratings[0],
      q2: ratings[1],
      q3: ratings[2],
      q4: ratings[3],
      q5: ratings[4],
      q6: ratings[5],
      q7: ratings[6],
      q8: ratings[7],
      q9: ratings[8],
      q10: ratings[9],

      avgRating,

      comments,
    });

    hideLoader();

    if (res.status === "success") {
      alert("Feedback Submitted!");

      for (let i = 1; i <= 10; i++) {
        document.getElementById(`q${i}`).value = "0";
      }

      document.getElementById(
        "additionalComments"
      ).value = "";
    } else {
      alert(res.message);
    }
  };

// ============================
// CREATE DRIVE
// ============================

document
  .getElementById("driveForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    showLoader("Publishing Drive...");

    const res = await apiRequest({
      action: "postDrive",

      companyName:
        document.getElementById("compName").value,

      hrName:
        document.getElementById("hrName").value,

      jobTitle:
        document.getElementById("jobTitle").value,

      eligibility:
        document.getElementById("eligibility").value,

      description:
        document.getElementById("jobDesc").value,
    });

    hideLoader();

    alert(
      res.status === "success"
        ? "Drive Published!"
        : res.message
    );

    if (res.status === "success") {
      e.target.reset();
    }
  });

// ============================
// EXPORT TABLE
// ============================

function exportTableToExcel(tableBodyId, filename) {
  const tbody = document.getElementById(tableBodyId);

  if (
    !tbody ||
    tbody.querySelectorAll("tr").length === 0
  ) {
    return alert("No Data");
  }

  let csv = [];

  const table = tbody.closest("table");

  const headers = Array.from(
    table.querySelectorAll("th")
  ).map(
    (th) => `"${th.innerText.replace(/"/g, '""')}"`
  );

  csv.push(headers.join(","));

  Array.from(tbody.querySelectorAll("tr")).forEach(
    (row) => {
      let rowData = [];

      Array.from(row.cells).forEach((cell) => {
        rowData.push(
          `"${cell.innerText.replace(/"/g, '""')}"`
        );
      });

      csv.push(rowData.join(","));
    }
  );

  const blob = new Blob(
    ["\uFEFF" + csv.join("\n")],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);

  link.download = `${filename}_${
    new Date().toISOString().slice(0, 10)
  }.csv`;

  link.click();
}

// ============================
// FILTER TABLE
// ============================

function filterTable(tbodyId, query) {
  const rows = document.querySelectorAll(
    `#${tbodyId} tr`
  );

  const q = query.toLowerCase();

  rows.forEach((row) => {
    row.style.display = row.innerText
      .toLowerCase()
      .includes(q)
      ? ""
      : "none";
  });
}

// ============================
// SEARCH EVENTS
// ============================

document
  .getElementById("adminCandidateSearch")
  ?.addEventListener("input", function () {
    filterTable("candidateTableBody", this.value);
  });

document
  .getElementById("adminAppSearch")
  ?.addEventListener("input", function () {
    filterTable(
      "adminApplicationsTableBody",
      this.value
    );
  });

document
  .getElementById("hrAppSearch")
  ?.addEventListener("input", function () {
    filterTable("hrApplicationsTableBody", this.value);
  });

document
  .getElementById("feedbackSearch")
  ?.addEventListener("input", function () {
    filterTable("feedbackTableBody", this.value);
  });

// ============================
// RESTORE SESSION
// ============================

window.onload = () => {
  const role = localStorage.getItem("userRole");

  if (role === "admin") {
    switchView("adminView", "Admin Dashboard");
  } else if (role === "hr") {
    switchView(
      "companyView",
      "HR Partner Workspace"
    );
  } else if (role === "candidate") {
    loggedInCandidateName =
      localStorage.getItem("candidateName") || "";

    currentCandidateEmail =
      localStorage.getItem("candidateEmail") || "";

    switchView(
      "candidateView",
      `Welcome ${loggedInCandidateName}`
    );
  } else {
    switchView("loginView", "Placement Provider");
  }
};