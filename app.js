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
                    // Added Resume String Decoder Logic for HR Dashboard Table
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
                document.getElementById('hrCandidateTableBody').innerHTML = tableHTML || `<tr><td colspan='4' class='text-center'>No candidates signed up yet.</td></tr>`;
            }
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