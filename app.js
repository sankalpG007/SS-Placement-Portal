// ============================
// GLOBAL APPLICATION CONFIG
// ============================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzZB_CpPCXKf3A1CUOv79EgY-d8nozfRJi9yh_cmBwSI1KkzQySOs9fFCt_mG7WlLe4/exec";

let loggedInCandidateName = "";

// ============================
// GLOBAL LOADERS & BUTTONS
// ============================

function showLoader(message = "Loading Data...") {
  const overlay = document.getElementById("loadingOverlay");

  if (overlay) {
    overlay.querySelector("p").innerText = message;
    overlay.classList.add("show");
  }
}

function hideLoader() {
  const overlay = document.getElementById("loadingOverlay");

  if (overlay) {
    overlay.classList.remove("show");
  }
}

function setButtonLoading(buttonElement) {
  if (!buttonElement) return;

  buttonElement.setAttribute(
    "data-original-text",
    buttonElement.innerHTML
  );

  buttonElement.classList.add("btn-loading");
  buttonElement.disabled = true;
}

function removeButtonLoading(buttonElement) {
  if (!buttonElement) return;

  buttonElement.classList.remove("btn-loading");
  buttonElement.disabled = false;

  if (buttonElement.hasAttribute("data-original-text")) {
    buttonElement.innerHTML =
      buttonElement.getAttribute("data-original-text");
  }
}

// ============================
// AUTH SCREEN TOGGLE
// ============================

let isRegisterMode = false;

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById(
    "candidateRegisterForm"
  );

  const authTitle = document.getElementById("authTitle");
  const authSubtitle = document.getElementById("authSubtitle");

  const toggleBtn = document.getElementById("toggleAuthBtn");
  const toggleText = document.getElementById("toggleText");

  if (isRegisterMode) {
    loginForm.style.display = "none";
    registerForm.style.display = "block";

    authTitle.innerText = "Candidate Registration";
    authSubtitle.innerText =
      "Create account to browse and apply jobs";

    toggleBtn.innerText = "Back to Login";
    toggleText.innerText = "Already have an account?";
  } else {
    loginForm.style.display = "block";
    registerForm.style.display = "none";

    authTitle.innerText = "Portal Authentication";
    authSubtitle.innerText =
      "Sign in to access your workspace";

    toggleBtn.innerText = "Register as Candidate";
    toggleText.innerText = "New candidate looking for jobs?";
  }
}

// ============================
// LOGIN SYSTEM
// ============================

document
  .getElementById("loginForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const submitBtn =
      e.target.querySelector('button[type="submit"]');

    const userField = document
      .getElementById("loginUser")
      .value.trim();

    const passField =
      document.getElementById("loginPass").value;

    setButtonLoading(submitBtn);

    // ================= ADMIN LOGIN =================

    if (userField === "admin" && passField === "admin123") {
      document.getElementById("loginForm").reset();

      removeButtonLoading(submitBtn);

      switchView("adminView", "Admin Dashboard");
      return;
    }

    // ================= HR LOGIN =================

    if (userField === "hr" && passField === "hr123") {
      document.getElementById("loginForm").reset();

      removeButtonLoading(submitBtn);

      switchView("companyView", "HR Workspace");
      return;
    }

    // ================= CANDIDATE LOGIN =================

    const payload = {
      action: "loginCandidate",
      email: userField,
      password: passField,
    };

    fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "success") {
          loggedInCandidateName = res.candidateName;

          document.getElementById("loginForm").reset();

          switchView(
            "candidateView",
            `Welcome ${loggedInCandidateName}`
          );
        } else {
          alert(res.message || "Invalid Credentials");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Authentication Error");
      })
      .finally(() => {
        removeButtonLoading(submitBtn);
      });
  });

// ============================
// CANDIDATE REGISTRATION
// ============================

document
  .getElementById("candidateRegisterForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const submitBtn =
      e.target.querySelector('button[type="submit"]');

    const fileInput =
      document.getElementById("regResume").files[0];

    const payload = {
      action: "registerCandidate",
      name: document.getElementById("regName").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      password: document.getElementById("regPass").value,
      phone: document.getElementById("regPhone").value.trim(),
      skills: document
        .getElementById("regSkills")
        .value.trim(),
      resumeFile: null,
      resumeName: null,
      resumeType: null,
    };

    function sendData(finalPayload) {
      setButtonLoading(submitBtn);

      showLoader(
        "Uploading profile & converting resume..."
      );

      fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify(finalPayload),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.status === "success") {
            alert("Registration Successful");
            document
              .getElementById("candidateRegisterForm")
              .reset();
            toggleAuthMode();
          } else {
            alert(res.message || "Registration Failed");
          }
        })
        .catch((err) => {
          console.error(err);
          alert("Registration Error");
        })
        .finally(() => {
          hideLoader();
          removeButtonLoading(submitBtn);
        });
    }

    // ================= FILE PROCESSING =================

    if (fileInput) {
      const reader = new FileReader();

      reader.onload = function (event) {
        const base64String =
          event.target.result.split(",")[1];

        payload.resumeFile = base64String;
        payload.resumeName = fileInput.name;
        payload.resumeType = fileInput.type;

        sendData(payload);
      };

      reader.readAsDataURL(fileInput);
    } else {
      sendData(payload);
    }
  });

// ============================
// VIEW ROUTER
// ============================

function switchView(viewId, titleText) {
  document
    .querySelectorAll(".view-panel")
    .forEach((panel) =>
      panel.classList.remove("active-view")
    );

  document
    .getElementById(viewId)
    .classList.add("active-view");

  document.getElementById("portalTitle").innerText =
    titleText;

  if (viewId === "loginView") {
    document.getElementById("logoutBtn").style.display =
      "none";
  } else {
    document.getElementById("logoutBtn").style.display =
      "block";
  }

  if (viewId === "adminView") {
    fetchAdminMetrics();
  }

  if (viewId === "companyView") {
    fetchCandidatesForHR();
  }

  if (viewId === "candidateView") {
    fetchActiveDrives();
    fetchMyApplications();
  }
}

function logout() {
  loggedInCandidateName = "";

  switchView("loginView", "Placement Portal");
}

// ============================
// FETCH HR CANDIDATES (FIXED)
// ============================

function fetchCandidatesForHR() {
  showLoader("Loading Candidates...");

  // Use POST method with action to get candidates
  const payload = {
    action: "getCandidates"
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status !== "success") {
        console.error("Failed to load candidates:", res.message);
        return;
      }

      let tableHTML = "";

      res.data.forEach((user) => {
        let resumeDisplay = "No Resume";

        // Check if resume_link contains a HYPERLINK formula or data URL
        if (user.resume_link && user.resume_link.includes("HYPERLINK")) {
          // Extract URL from HYPERLINK formula
          const urlMatch = user.resume_link.match(/HYPERLINK\("([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            resumeDisplay = `
              <a 
                href="${urlMatch[1]}" 
                download="${user.name}_Resume.pdf"
                class="resume-link"
                target="_blank"
              >
                Download Resume
              </a>
            `;
          }
        } else if (user.resume_link && user.resume_link.startsWith("data:")) {
          resumeDisplay = `
            <a 
              href="${user.resume_link}" 
              download="${user.name}_Resume.pdf"
              class="resume-link"
            >
              Download Resume
            </a>
          `;
        }

        tableHTML += `
          <tr>
            <td><strong>${user.name || "-"}</strong></td>
            <td>${user.email || "-"}</td>
            <td>${user.phone || "-"}</td>
            <td>${user.skills || "-"}</td>
            <td>${resumeDisplay}</td>
            <td>
              <select 
                id="feedback_${user.email}"
                class="feedback-select"
              >
                <option value="In Process"
                  ${user.feedback === "In Process" ? "selected" : ""}
                >
                  In Process
                </option>
                <option value="Selected"
                  ${user.feedback === "Selected" ? "selected" : ""}
                >
                  Selected
                </option>
                <option value="Rejected"
                  ${user.feedback === "Rejected" ? "selected" : ""}
                >
                  Rejected
                </option>
                <option value="On Hold"
                  ${user.feedback === "On Hold" ? "selected" : ""}
                >
                  On Hold
                </option>
              </select>
            </td>
            <td>
              <button
                class="feedback-btn"
                onclick="updateCandidateFeedback('${user.email}','${user.name}')"
              >
                Save
              </button>
            </td>
          </tr>
        `;
      });

      document.getElementById(
        "hrCandidateTableBody"
      ).innerHTML =
        tableHTML ||
        `
          <tr>
            <td colspan="7" class="text-center">
              No candidates available
            </td>
          </tr>
        `;

      updateSearchSuggestions(
        "hrCandidateTableBody",
        "hrNameSuggestions"
      );
    })
    .catch((err) => {
      console.error(err);
      alert("Unable to load candidates");
    })
    .finally(() => {
      hideLoader();
    });
}

// ============================
// LOAD HR CANDIDATES (Wrapper function for refresh button)
// ============================

function loadHRCandidates() {
  fetchCandidatesForHR();
}

// ============================
// ADMIN DASHBOARD
// ============================

function fetchAdminMetrics() {
  showLoader("Loading Dashboard Metrics...");

  Promise.all([
    fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getCandidates" })
    }).then((r) => r.json()),
    
    fetch(WEB_APP_URL, {
      method: "POST", 
      body: JSON.stringify({ action: "getDrives" })
    }).then((r) => r.json()),
    
    fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getApplications" })
    }).then((r) => r.json())
  ])
    .then(([candidateRes, driveRes, appRes]) => {
      // ================= CANDIDATES =================

      if (candidateRes.status === "success") {
        document.getElementById(
          "totalCandidatesCount"
        ).innerText = candidateRes.data.length;

        let tableHTML = "";

        candidateRes.data.forEach((user) => {
          let resumeDisplay = "No Resume";

          if (user.resume_link && user.resume_link.includes("HYPERLINK")) {
            const urlMatch = user.resume_link.match(/HYPERLINK\("([^"]+)"/);
            if (urlMatch && urlMatch[1]) {
              resumeDisplay = `
                <a 
                  href="${urlMatch[1]}"
                  download="${user.name}_Resume.pdf"
                  class="resume-link"
                  target="_blank"
                >
                  Download Resume
                </a>
              `;
            }
          } else if (user.resume_link && user.resume_link.startsWith("data:")) {
            resumeDisplay = `
              <a 
                href="${user.resume_link}"
                download="${user.name}_Resume.pdf"
                class="resume-link"
              >
                Download Resume
              </a>
            `;
          }

          tableHTML += `
            <tr>
              <td><strong>${user.name}</strong></td>
              <td>${user.email}</td>
              <td>${user.phone}</td>
              <td>${user.skills}</td>
              <td>${resumeDisplay}</td>
            </tr>
          `;
        });

        document.getElementById(
          "candidateTableBody"
        ).innerHTML = tableHTML;

        updateSearchSuggestions(
          "candidateTableBody",
          "adminNameSuggestions"
        );
      }

      // ================= DRIVES =================

      if (driveRes.status === "success") {
        document.getElementById(
          "totalDrivesCount"
        ).innerText = driveRes.data.length;
      }

      // ================= APPLICATIONS =================

      if (appRes.status === "success") {
        let appHTML = "";

        appRes.data.forEach((item) => {
          const dateObj = new Date(item.timestamp);

          appHTML += `
            <tr>
              <td>${dateObj.toLocaleDateString()}</td>
              <td>
                <strong>
                  ${item.candidate_name || "-"}
                </strong>
              </td>
              <td>${item.company_name || "-"}</td>
              <td>${item.job_title || "-"}</td>
              <td>
                <span class="status-badge">
                  ${item.application_status || "Applied"}
                </span>
              </td>
            </tr>
          `;
        });

        document.getElementById(
          "applicationsTableBody"
        ).innerHTML =
          appHTML ||
          `
            <tr>
              <td colspan="5">
                No Applications
              </td>
            </tr>
          `;
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Dashboard Error");
    })
    .finally(() => {
      hideLoader();
    });
}

// ============================
// POST NEW DRIVE
// ============================

document
  .getElementById("driveForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const submitBtn =
      e.target.querySelector('button[type="submit"]');

    setButtonLoading(submitBtn);

    const drivePayload = {
      action: "postDrive",
      companyName:
        document.getElementById("compName").value,
      hrName: document.getElementById("hrName").value,
      jobTitle:
        document.getElementById("jobTitle").value,
      eligibility:
        document.getElementById("eligibility").value,
      description:
        document.getElementById("jobDesc").value,
    };

    fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(drivePayload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "success") {
          alert("Placement Drive Published");
          document.getElementById("driveForm").reset();
          fetchActiveDrives();
        } else {
          alert(res.message || "Drive Publish Failed");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Drive Publish Failed");
      })
      .finally(() => {
        removeButtonLoading(submitBtn);
      });
  });

// ============================
// FETCH ACTIVE DRIVES
// ============================

function fetchActiveDrives() {
  showLoader("Loading Active Drives...");

  const payload = {
    action: "getDrives"
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status !== "success") return;

      let gridHTML = "";

      res.data.forEach((drive) => {
        gridHTML += `
          <div class="drive-card">
            <h4>
              ${drive.job_title || "Open Position"}
            </h4>
            <span class="company-badge">
              ${drive.company_name || "Anonymous Recruiter"}
            </span>
            <p>
              <strong>Eligibility:</strong>
              ${drive.eligibility || "Open"}
            </p>
            <p>
              <strong>Description:</strong>
              ${drive.job_description || "No description"}
            </p>
            <button
              class="apply-btn"
              onclick="applyToDrive(this,'${drive.company_name}','${drive.job_title}')"
            >
              Quick Apply
            </button>
          </div>
        `;
      });

      document.getElementById("drivesGrid").innerHTML =
        gridHTML ||
        `
          <p class="placeholder-text">
            No Active Drives
          </p>
        `;
    })
    .catch((err) => {
      console.error(err);
      alert("Unable to fetch drives");
    })
    .finally(() => {
      hideLoader();
    });
}

// ============================
// APPLY TO DRIVE
// ============================

function applyToDrive(
  buttonElement,
  companyName,
  jobTitle
) {
  setButtonLoading(buttonElement);

  const payload = {
    action: "submitApplication",
    candidateName: loggedInCandidateName,
    companyName,
    jobTitle,
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status === "success") {
        alert(`Application Submitted for ${jobTitle}`);
        fetchMyApplications();
      } else {
        alert(res.message || "Application Failed");
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Application Failed");
    })
    .finally(() => {
      removeButtonLoading(buttonElement);
    });
}

// ============================
// FETCH MY APPLICATIONS
// ============================

function fetchMyApplications() {
  const payload = {
    action: "getApplications"
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status !== "success") return;

      let html = "";

      const myApps = res.data.filter(
        (app) =>
          app.candidate_name ===
          loggedInCandidateName
      );

      myApps.forEach((app) => {
        html += `
          <tr>
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

      const table =
        document.getElementById(
          "candidateApplicationsBody"
        );

      if (table) {
        table.innerHTML =
          html ||
          `
            <tr>
              <td colspan="3">
                No Applications Yet
              </td>
            </tr>
          `;
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

// ============================
// UPDATE FEEDBACK
// ============================

function updateCandidateFeedback(
  candidateEmail,
  candidateName
) {
  const feedbackValue = document.getElementById(
    `feedback_${candidateEmail}`
  ).value;

  const payload = {
    action: "updateFeedback",
    email: candidateEmail,
    name: candidateName,
    feedback: feedbackValue,
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status === "success") {
        alert(`Feedback Updated for ${candidateName}`);
      } else {
        alert(res.message || "Feedback Update Failed");
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Feedback Update Failed");
    });
}

// ============================
// SEARCH + AUTOCOMPLETE
// ============================

function updateSearchSuggestions(
  tableBodyId,
  dataListId
) {
  const rows = document.querySelectorAll(
    `#${tableBodyId} tr`
  );

  const datalist =
    document.getElementById(dataListId);

  if (!datalist) return;

  datalist.innerHTML = "";

  let names = [];

  rows.forEach((row) => {
    const nameCell = row.cells[0];

    if (!nameCell) return;

    const name = nameCell.textContent.trim();

    if (name && !names.includes(name)) {
      names.push(name);

      const option =
        document.createElement("option");

      option.value = name;

      datalist.appendChild(option);
    }
  });
}

function runTargetedSearch(
  searchInputId,
  tableBodyId
) {
  const query = document
    .getElementById(searchInputId)
    .value.toLowerCase();

  const rows = document.querySelectorAll(
    `#${tableBodyId} tr`
  );

  rows.forEach((row) => {
    let found = false;

    for (let i = 0; i < 4; i++) {
      if (row.cells[i]) {
        const text =
          row.cells[i].textContent.toLowerCase();

        if (text.includes(query)) {
          found = true;
          break;
        }
      }
    }

    row.style.display = found ? "" : "none";
  });
}

// ============================
// SEARCH EVENT LISTENERS
// ============================

document
  .getElementById("adminCandidateSearch")
  ?.addEventListener("input", function () {
    runTargetedSearch(
      "adminCandidateSearch",
      "candidateTableBody"
    );
  });

document
  .getElementById("hrCandidateSearch")
  ?.addEventListener("input", function () {
    runTargetedSearch(
      "hrCandidateSearch",
      "hrCandidateTableBody"
    );
  });

// ============================
// AUTO START
// ============================

window.onload = () => {
  switchView("loginView", "Placement Portal");
};