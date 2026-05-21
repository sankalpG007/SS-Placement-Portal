// ============================
// GLOBAL CONFIGURATION
// ============================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyNaXGlXLF_7QrYQyvF1b_7nI0u-dcx0crjFd4EUFT-CfzSauFLfQpCIU1zXG3vpOXmjw/exec";
let loggedInCandidateName = "";

function showLoader(msg) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) { overlay.querySelector("p").innerText = msg; overlay.classList.add("show"); }
}
function hideLoader() { document.getElementById("loadingOverlay")?.classList.remove("show"); }
function setButtonLoading(btn) { if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; } }
function removeButtonLoading(btn, originalText) { if(btn) { btn.disabled = false; btn.innerHTML = originalText; } }

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

function switchView(viewId, titleText) {
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active-view"));
    document.getElementById(viewId).classList.add("active-view");
    document.getElementById("portalTitle").innerHTML = `<i class="fas fa-briefcase"></i> SS Infotech · ${titleText}`;
    document.getElementById("logoutBtn").style.display = viewId === "loginView" ? "none" : "block";
    if (viewId === "adminView") { fetchAdminMetrics(); }
    if (viewId === "companyView") { fetchHRApplications(); }
    if (viewId === "candidateView") { fetchActiveDrives(); }
}
function logout() { loggedInCandidateName = ""; localStorage.clear(); switchView("loginView", "Placement Portal"); }

// ============================
// AUTH & REGISTRATION
// ============================
document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;
    const btn = e.target.querySelector('button');
    if (user === "admin" && pass === "admin123") { localStorage.setItem("userRole","admin"); switchView("adminView","Admin Dashboard"); removeButtonLoading(btn,"Verify"); return; }
    if (user === "hr" && pass === "hr123") { localStorage.setItem("userRole","hr"); switchView("companyView","HR Workspace"); removeButtonLoading(btn,"Verify"); return; }
    setButtonLoading(btn);
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"loginCandidate", email:user, password:pass }) })
        .then(res=>res.json()).then(res=>{
            if(res.status==="success") {
                loggedInCandidateName = res.candidateName;
                localStorage.setItem("userRole","candidate");
                localStorage.setItem("candidateName",loggedInCandidateName);
                switchView("candidateView",`Welcome ${loggedInCandidateName}`);
            } else alert(res.message || "Invalid Credentials");
        }).catch(err=>alert("Auth Error")).finally(()=>removeButtonLoading(btn,"Verify"));
});

document.getElementById("candidateRegisterForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const fileInput = document.getElementById("regResume").files[0];
    
    // Core payload setup including the 4 new data parameters
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
    
    const sendData = (finalPayload) => {
        const btn = e.target.querySelector('button');
        setButtonLoading(btn);
        showLoader("Registering...");
        
        fetch(WEB_APP_URL, { 
            method: "POST", 
            body: JSON.stringify(finalPayload) 
        })
        .then(res => res.json())
        .then(res => { 
            alert(res.status === "success" ? "Registration Successful" : res.message); 
            if (res.status === "success") { 
                e.target.reset(); 
                toggleAuthMode(); 
            } 
        })
        .catch(err => alert("Error communicating with servers."))
        .finally(() => { 
            hideLoader(); 
            removeButtonLoading(btn, "Create Account"); 
        });
    };
    
    if (fileInput) {
        const reader = new FileReader();
        reader.onload = ev => { 
            const base64 = ev.target.result.split(",")[1]; 
            payload.resumeFile = base64; 
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
// ADMIN: Registered Candidates + Applications Sheet
// ============================
function fetchAdminMetrics() {
    showLoader("Loading Admin Data...");
    Promise.all([
        fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"getCandidates" }) }).then(r=>r.json()),
        fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"getDrives" }) }).then(r=>r.json()),
        fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"getApplications" }) }).then(r=>r.json())
    ]).then(([candRes, driveRes, appRes]) => {
        if(candRes.status==="success") {
            document.getElementById("totalCandidatesCount").innerText = candRes.data.length;
            let html = "";
            candRes.data.forEach(u => {
                let resumeLink = "No Resume";
                if(u.resume_link && u.resume_link.includes("HYPERLINK")) {
                    let match = u.resume_link.match(/HYPERLINK\("([^"]+)"/);
                    if(match) resumeLink = `<a href="${match[1]}" target="_blank" class="resume-link">📄 Download</a>`;
                } else if(u.resume_link && u.resume_link.startsWith("data:")) resumeLink = `<a href="${u.resume_link}" download="${u.name}_Resume.pdf">📄 Download</a>`;
                html += `<tr><td><strong>${u.name}</strong></td><td>${u.email}</td><td>${u.phone}</td><td>${u.skills}</td><td>${resumeLink}</td></tr>`;
            });
            document.getElementById("candidateTableBody").innerHTML = html || "<tr><td colspan='5'>No candidates</td></tr>";
        }
        if(driveRes.status==="success") document.getElementById("totalDrivesCount").innerText = driveRes.data.length;
        if(appRes.status==="success") {
            let appHtml = "";
            appRes.data.forEach(app => {
                let statusBadge = `<span class="status-badge">${app.application_status || "Applied"}</span>`;
                appHtml += `<tr><td>${new Date(app.timestamp).toLocaleDateString()}</td><td><strong>${app.candidate_name}</strong></td><td>${app.company_name}</td><td>${app.job_title}</td><td>${statusBadge}</td></tr>`;
            });
            document.getElementById("adminApplicationsTableBody").innerHTML = appHtml || "<tr><td colspan='5'>No applications</td></tr>";
        }
    }).catch(err=>alert("Admin Error")).finally(()=>hideLoader());
}

// ============================
// HR: APPLICATIONS SHEET WITH FEEDBACK
// ============================
function fetchHRApplications() {
    showLoader("Loading Applications for HR...");
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"getApplications" }) })
        .then(res=>res.json()).then(res=>{
            if(res.status!=="success") throw new Error("Failed");
            let html = "";
            res.data.forEach((app, idx) => {
                let currentStatus = app.application_status || "Applied";
                html += `<tr id="appRow_${idx}">
                            <td>${new Date(app.timestamp).toLocaleDateString()}</td>
                            <td><strong>${app.candidate_name}</strong></td>
                            <td>${app.company_name}</td>
                            <td>${app.job_title}</td>
                            <td>
                                <select id="statusSelect_${idx}" class="feedback-select">
                                    <option value="Applied" ${currentStatus==="Applied"?"selected":""}>Applied</option>
                                    <option value="In Process" ${currentStatus==="In Process"?"selected":""}>In Process</option>
                                    <option value="Selected" ${currentStatus==="Selected"?"selected":""}>Selected</option>
                                    <option value="Rejected" ${currentStatus==="Rejected"?"selected":""}>Rejected</option>
                                </select>
                            </td>
                            <td><button class="feedback-btn" onclick="updateApplicationFeedback(${idx}, '${app.candidate_name}', '${app.company_name}', '${app.job_title}')">Save Feedback</button></td>
                         </tr>`;
            });
            document.getElementById("hrApplicationsTableBody").innerHTML = html || "<tr><td colspan='6'>No applications received</td></tr>";
        }).catch(err=>alert("HR Data Error")).finally(()=>hideLoader());
}

window.updateApplicationFeedback = function(rowId, candidateName, company, role) {
    const newStatus = document.getElementById(`statusSelect_${rowId}`).value;
    const payload = { action:"updateApplicationStatus", candidateName, companyName:company, jobTitle:role, newStatus };
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify(payload) }).then(res=>res.json()).then(res=>{
        if(res.status==="success") alert(`Feedback updated to ${newStatus} for ${candidateName}`);
        else alert("Update failed");
        fetchHRApplications(); // refresh
    }).catch(err=>alert("Error updating feedback"));
};

// ============================
// DRIVE & CANDIDATE APPLY LOGIC
// ============================
function fetchActiveDrives() {
    showLoader("Loading Drives...");
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"getDrives" }) }).then(res=>res.json()).then(res=>{
        if(res.status!=="success") return;
        let grid = "";
        res.data.forEach(d => {
            grid += `<div class="drive-card"><h4>${d.job_title}</h4><span class="company-badge">${d.company_name}</span><p><strong>Eligibility:</strong> ${d.eligibility}</p><p><strong>Description:</strong> ${d.job_description}</p><button class="apply-btn" onclick="applyToDrive('${d.company_name.replace(/'/g, "\\'")}', '${d.job_title.replace(/'/g, "\\'")}')">Quick Apply</button></div>`;
        });
        document.getElementById("drivesGrid").innerHTML = grid || "<p class='placeholder-text'>No active drives</p>";
    }).catch(err=>alert("Drive fetch error")).finally(()=>hideLoader());
}

window.applyToDrive = function(company, jobTitle) {
    if(!loggedInCandidateName && localStorage.getItem("candidateName")) loggedInCandidateName = localStorage.getItem("candidateName");
    if(!loggedInCandidateName) { alert("Please login again"); logout(); return; }
    const payload = { action:"submitApplication", candidateName:loggedInCandidateName, companyName:company, jobTitle };
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify(payload) }).then(res=>res.json()).then(res=>{ alert(res.status==="success"?"Applied Successfully":res.message); }).catch(err=>alert("Apply failed"));
};

document.getElementById("driveForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setButtonLoading(btn);
    fetch(WEB_APP_URL, { method:"POST", body:JSON.stringify({ action:"postDrive", companyName:document.getElementById("compName").value, hrName:document.getElementById("hrName").value, jobTitle:document.getElementById("jobTitle").value, eligibility:document.getElementById("eligibility").value, description:document.getElementById("jobDesc").value }) })
        .then(res=>res.json()).then(res=>{ alert(res.status==="success"?"Drive Published":res.message); if(res.status==="success") e.target.reset(); }).catch(err=>alert("Error")).finally(()=>removeButtonLoading(btn,"Publish Active Drive"));
});

// SEARCH + EXPORT
function exportTableToExcel(tableBodyId, filename) {
    const tbody = document.getElementById(tableBodyId);
    if(!tbody || tbody.querySelectorAll("tr").length===0) return alert("No data to export");
    let csv = [];
    let headers = [];
    if(tableBodyId === "candidateTableBody") headers = ["Name","Email","Phone","Skills","Resume"];
    else if(tableBodyId === "adminApplicationsTableBody") headers = ["Date","Candidate","Company","Role","Status"];
    else headers = ["Date","Candidate","Company","Role","Feedback"];
    csv.push(headers.map(h=>`"${h}"`).join(","));
    Array.from(tbody.querySelectorAll("tr")).forEach(row => {
        let rowData = [];
        Array.from(row.cells).forEach(cell => rowData.push(`"${cell.innerText.replace(/"/g,'""')}"`));
        if(rowData.length) csv.push(rowData.join(","));
    });
    const blob = new Blob(["\uFEFF" + csv.join("\n")], {type:"text/csv;charset=utf-8;"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

document.getElementById("adminCandidateSearch")?.addEventListener("input", function() { filterTable("candidateTableBody", this.value); });
document.getElementById("adminAppSearch")?.addEventListener("input", function() { filterTable("adminApplicationsTableBody", this.value); });
document.getElementById("hrAppSearch")?.addEventListener("input", function() { filterTable("hrApplicationsTableBody", this.value); });
function filterTable(tbodyId, query) {
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    const q = query.toLowerCase();
    rows.forEach(row => {
        let text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? "" : "none";
    });
}

// Auto restore session
window.onload = () => {
    const role = localStorage.getItem("userRole");
    if(role === "admin") switchView("adminView","Admin Dashboard");
    else if(role === "hr") switchView("companyView","HR Workspace");
    else if(role === "candidate") { loggedInCandidateName = localStorage.getItem("candidateName") || ""; switchView("candidateView",`Welcome ${loggedInCandidateName}`); }
    else switchView("loginView","Placement Portal");
};