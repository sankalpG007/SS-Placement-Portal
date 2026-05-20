// Global Application Configurations
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjEaBaDBMdZ4faG7lOhQDfFG_yBROixHMy8b2wVHmhvAygKZz34Q0FUrzkBIxyamZwZw/exec";

// Global variable to remember who logged in during this session
let loggedInCandidateName = ""; 

// Toggle between Login Form and Registration Form
let isRegisterMode = false;
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('candidateRegisterForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const toggleBtn = document.getElementById('toggleAuthBtn');
    const toggleText = document.getElementById('toggleText');

    if (isRegisterMode) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        authTitle.innerText = "Candidate Registration";
        authSubtitle.innerText = "Create an account to browse and apply for jobs";
        toggleBtn.innerText = "Back to Login";
        toggleText.innerText = "Already have an account?";
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        authTitle.innerText = "Portal Authentication";
        authSubtitle.innerText = "Sign in to access your designated workspace";
        toggleBtn.innerText = "Register as Candidate";
        toggleText.innerText = "New candidate looking for jobs?";
    }
}

// ================= PLATFORM LOGIN HUB ROUTER =================
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userField = document.getElementById('loginUser').value.trim();
    const passField = document.getElementById('loginPass').value;

    // 1. ADMIN CHECK
    if (userField === "admin" && passField === "admin123") {
        document.getElementById('loginForm').reset();
        switchView('adminView', 'Admin Dashboard Hub');
    } 
    // 2. HR CHECK
    else if (userField === "hr" && passField === "hr123") {
        document.getElementById('loginForm').reset();
        switchView('companyView', 'Company Workspace');
    } 
    // 3. CANDIDATE VERIFICATION VIA SPREADSHEET
    else {
        const payload = {
            action: "loginCandidate",
            email: userField,
            password: passField
        };

        // Call database backend to verify credentials
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                loggedInCandidateName = res.candidateName; // Capture verified name!
                document.getElementById('loginForm').reset();
                switchView('candidateView', `Welcome, ${loggedInCandidateName}`);
            } else {
                alert(res.message);
            }
        })
        .catch(err => alert("Authentication node timeout error."));
    }
});

// ================= CANDIDATE REGISTRATION HANDLER (WITH RESUME FIX) =================
document.getElementById('candidateRegisterForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('regResume').files[0];
    
    // Core payload setup
    const payload = {
        action: "registerCandidate",
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPass').value,
        phone: document.getElementById('regPhone').value.trim(),
        skills: document.getElementById('regSkills').value.trim(),
        resumeFile: null,
        resumeName: null,
        resumeType: null
    };
    
    // Updated Helper function to transmit data smoothly to the backend sheet
    function sendData(finalPayload) {
        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Bypasses browser CORS policy entirely for Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(finalPayload)
        })
        .then(() => {
            // NOTE: 'no-cors' mode returns an empty response, so we safely assume success here
            alert('Registration Successful! Your profile and resume are safely saved.');
            document.getElementById('candidateRegisterForm').reset();
            toggleAuthMode();
        })
        .catch(err => {
            console.error(err);
            alert("Connection error occurred. Please verify your Web App configuration deployment settings.");
        });
    }
    
    // Process file transformation if a file exists
    if (fileInput) {
        const reader = new FileReader();
        reader.onload = function(event) {
            // Strip the metadata prefix from base64 string
            const base64String = event.target.result.split(',')[1];
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

// View Routing Engine
function switchView(viewId, titleText) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    document.getElementById('portalTitle').innerText = titleText;
    
    if (viewId === 'loginView') {
        document.getElementById('logoutBtn').style.display = 'none';
    } else {
        document.getElementById('logoutBtn').style.display = 'block';
    }

    if (viewId === 'adminView') {
        fetchAdminMetrics();
    } else if (viewId === 'companyView') {
        fetchCandidatesForHR();
    } else if (viewId === 'candidateView') {
        fetchActiveDrives();
    }
}

function logout() {
    loggedInCandidateName = ""; // Clear active session name
    switchView('loginView', 'Placement Portal');
}

// ================= DATA FETCHING ENGINE =================

function fetchCandidatesForHR() {

    fetch(`${WEB_APP_URL}?target=Candidates`)
        .then(res => res.json())
        .then(res => {

            if (res.status === 'success') {

                let tableHTML = '';

                res.data.forEach(user => {

                    // =========================
                    // RESUME DISPLAY LOGIC
                    // =========================

                    let resumeDisplay = "No Resume";

                    if (
                        user.resume_link &&
                        user.resume_link.startsWith("data:")
                    ) {

                        resumeDisplay = `
                            <a 
                                href="${user.resume_link}" 
                                download="${user.name}_Resume.pdf"
                                style="
                                    color:#3b82f6;
                                    font-weight:bold;
                                    text-decoration:underline;
                                ">
                                Download PDF
                            </a>
                        `;

                    } else if (
                        user.resume_link &&
                        user.resume_link !== "No Resume Uploaded" &&
                        user.resume_link.trim() !== ""
                    ) {

                        resumeDisplay = `
                            <a 
                                href="${user.resume_link}" 
                                target="_blank"
                                style="
                                    color:#3b82f6;
                                    font-weight:bold;
                                    text-decoration:underline;
                                ">
                                View File
                            </a>
                        `;
                    }

                    // =========================
                    // TABLE ROW UI
                    // =========================

                    tableHTML += `
                        <tr>

                            <td>
                                <strong>${user.name || '-'}</strong>
                            </td>

                            <td>
                                ${user.email || '-'}
                            </td>

                            <td>
                                ${user.phone || '-'}
                            </td>

                            <td>
                                ${user.skills || '-'}
                            </td>

                            <td>
                                ${resumeDisplay}
                            </td>

                            <!-- HR FEEDBACK DROPDOWN -->

                            <td>

                                <select 
                                    id="feedback_${user.email}" 
                                    class="feedback-select"
                                >

                                    <option 
                                        value="In Process"
                                        ${user.feedback === 'In Process' ? 'selected' : ''}
                                    >
                                        In Process
                                    </option>

                                    <option 
                                        value="Selected"
                                        ${user.feedback === 'Selected' ? 'selected' : ''}
                                    >
                                        Selected
                                    </option>

                                    <option 
                                        value="Rejected"
                                        ${user.feedback === 'Rejected' ? 'selected' : ''}
                                    >
                                        Rejected
                                    </option>

                                    <option 
                                        value="On Hold"
                                        ${user.feedback === 'On Hold' ? 'selected' : ''}
                                    >
                                        On Hold
                                    </option>

                                </select>

                            </td>

                            <!-- SAVE BUTTON -->

                            <td>

                                <button
                                    class="feedback-btn"
                                    onclick="updateCandidateFeedback('${user.email}', '${user.name}')"
                                >
                                    Save
                                </button>

                            </td>

                        </tr>
                    `;
                });

                // =========================
                // EMPTY STATE
                // =========================

                document.getElementById('hrCandidateTableBody').innerHTML =
                    tableHTML ||
                    `
                    <tr>
                        <td colspan='7' class='text-center'>
                            No candidates signed up yet.
                        </td>
                    </tr>
                    `;

                // =========================
                // SEARCH SUGGESTIONS
                // =========================

                updateSearchSuggestions(
                    'hrCandidateTableBody',
                    'hrNameSuggestions'
                );
            }
        })
        .catch(err => {

            console.error(err);

            document.getElementById('hrCandidateTableBody').innerHTML = `
                <tr>
                    <td colspan='7' class='text-center'>
                        Error loading candidate records.
                    </td>
                </tr>
            `;
        });
}

function fetchAdminMetrics() {
    fetch(`${WEB_APP_URL}?target=Candidates`).then(res => res.json()).then(res => {
        if (res.status === 'success') {
            document.getElementById('totalCandidatesCount').innerText = res.data.length;
            let tableHTML = '';
            res.data.forEach(user => {
                // Added Resume String Decoder Logic for Admin Dashboard Table
                let resumeDisplay = "No Resume";
                if (user.resume_link && user.resume_link.startsWith("data:")) {
                    resumeDisplay = `<a href="${user.resume_link}" download="${user.name}_Resume.pdf" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">Download PDF</a>`;
                } else if (user.resume_link && user.resume_link !== "No Resume Uploaded" && user.resume_link.trim() !== "") {
                    resumeDisplay = `<a href="${user.resume_link}" target="_blank" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">View File</a>`;
                }

                tableHTML += `
                    <tr>
                        <td><strong>${user.name || '-'}</strong></td>
                        <td>${user.email || '-'}</td>
                        <td>${user.phone || '-'}</td>
                        <td>${user.skills || '-'}</td> <td>${resumeDisplay}</td>
                    </tr>
                `;
            });
            document.getElementById('candidateTableBody').innerHTML = tableHTML;

            updateSearchSuggestions('candidateTableBody', 'adminNameSuggestions');
        }
    });

    fetch(`${WEB_APP_URL}?target=Drives`).then(res => res.json()).then(res => {
        if (res.status === 'success') document.getElementById('totalDrivesCount').innerText = res.data.length;
    });

    fetch(`${WEB_APP_URL}?target=Applications`).then(res => res.json()).then(res => {
        if (res.status === 'success') {
            let appHTML = '';
            res.data.forEach(item => {
                let dateObj = new Date(item.timestamp);
                appHTML += `<tr><td>${dateObj.toLocaleDateString()}</td><td><strong>${item.candidate_name||'-'}</strong></td><td>${item.company_name||'-'}</td><td>${item.job_title||'-'}</td><td><span style='background:#fef3c7; color:#d97706; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;'>${item.application_status||'Applied'}</span></td></tr>`;
            });
            document.getElementById('applicationsTableBody').innerHTML = appHTML || `<tr><td colspan='5' class='text-center'>No submissions logged yet.</td></tr>`;
        }
    });
}

document.getElementById('driveForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const drivePayload = {
        action: "postDrive",
        companyName: document.getElementById('compName').value,
        hrName: document.getElementById('hrName').value,
        jobTitle: document.getElementById('jobTitle').value,
        eligibility: document.getElementById('eligibility').value,
        description: document.getElementById('jobDesc').value
    };
    fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(drivePayload) }).then(() => {
        alert('Placement Drive Published Successfully!');
        document.getElementById('driveForm').reset();
        logout();
    });
});

function fetchActiveDrives() {
    fetch(`${WEB_APP_URL}?target=Drives`)
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                let gridHTML = '';
                res.data.forEach(drive => {
                    gridHTML += `
                        <div class="drive-card">
                            <h4>${drive.job_title || 'Open Position'}</h4>
                            <span class="company-badge">${drive.company_name || 'Anonymous Recruiter'}</span>
                            <p><strong>Eligibility:</strong> ${drive.eligibility || 'Open to all'}</p>
                            <p><strong>Description:</strong> ${drive.job_description || 'Click apply to view details.'}</p>
                            <button class="apply-btn" onclick="applyToDrive('${drive.company_name}', '${drive.job_title}')">Quick Apply</button>
                        </div>
                    `;
                });
                document.getElementById('drivesGrid').innerHTML = gridHTML || `<p style='grid-column: 1/-1; text-align:center; color:#94a3b8; padding: 40px 0;'>No active drives found.</p>`;
            }
        });
}

// AUTOMATED APPLICATION SUBMISSION
function applyToDrive(companyName, jobTitle) {
    const applicationPayload = {
        action: "submitApplication",
        candidateName: loggedInCandidateName, 
        companyName: companyName,
        jobTitle: jobTitle
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(applicationPayload)
    })
    .then(() => alert(`Success! Application submitted for ${jobTitle} role at ${companyName}.`))
    .catch(err => alert("Pipeline connection error."));
}

// ================= HR FEEDBACK UPDATE ENGINE =================

function updateCandidateFeedback(candidateEmail, candidateName) {

    const feedbackValue = document.getElementById(`feedback_${candidateEmail}`).value;

    const payload = {
        action: "updateFeedback",
        email: candidateEmail,
        name: candidateName,
        feedback: feedbackValue
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(() => {
        alert(`Feedback updated successfully for ${candidateName}`);
    })
    .catch(err => {
        console.error(err);
        alert("Unable to update feedback.");
    });
}

// ================= UPGRADED SEARCH ENGINE WITH AUTO-SUGGESTIONS =================

// Helper function to build autocomplete suggestion lists dynamically
function updateSearchSuggestions(tableBodyId, dataListId) {
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);
    const datalist = document.getElementById(dataListId);
    if (!datalist) return;
    
    // Clear old suggestions
    datalist.innerHTML = "";
    
    let names = [];
    rows.forEach(row => {
        if (row.querySelector('.placeholder-text')) return;
        // The first cell (index 0) contains the candidate's name
        const nameCell = row.cells[0];
        if (nameCell) {
            const name = nameCell.textContent.trim();
            if (name && !names.includes(name)) {
                names.push(name);
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            }
        }
    });
}

// Generic partial matcher that only reads columns 1 to 4 (ignores the resume code)
function runTargetedSearch(searchInputId, tableBodyId) {
    const query = document.getElementById(searchInputId).value.trim().toLowerCase();
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);

    rows.forEach(row => {
        if (row.querySelector('.placeholder-text')) return;

        let matchFound = false;
        
        // Loop ONLY through cell 0 (Name), cell 1 (Email), cell 2 (Phone), and cell 3 (Skills)
        // This completely skips cell 4 (the heavy Base64 Resume Link)
        for (let i = 0; i < 4; i++) {
            if (row.cells[i]) {
                const cellText = row.cells[i].textContent.toLowerCase();
                if (cellText.includes(query)) {
                    matchFound = true;
                    break; // Stop checking columns if we found a match
                }
            }
        }

        // Apply display state toggle
        if (matchFound) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// --- Event Listeners ---

// Admin Inputs
document.getElementById('adminCandidateSearch').addEventListener('input', function() {
    runTargetedSearch('adminCandidateSearch', 'candidateTableBody');
});

// HR Inputs
document.getElementById('hrCandidateSearch').addEventListener('input', function() {
    runTargetedSearch('hrCandidateSearch', 'hrCandidateTableBody');
});


// --- Hook Suggestions Into Your Existing Data Loaders ---
// We need to run updateSearchSuggestions() right after data tables finish drawing.

// Add this line at the very bottom of your existing fetchCandidatesForHR() success block:
// updateSearchSuggestions('hrCandidateTableBody', 'hrNameSuggestions');

// Add this line at the very bottom of your existing fetchAdminMetrics() success block:
// updateSearchSuggestions('candidateTableBody', 'adminNameSuggestions');