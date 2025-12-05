  let onScanSuccess;
let onScanFailure;

  // ================= Firebase ==================
const firebaseConfig = {
    apiKey: "AIzaSyB8T7Y692ytTeHlfdAPQ9fOvZ3e2qEPTKs",
  authDomain: "aasms-6a83a.firebaseapp.com",
  projectId: "aasms-6a83a",
  storageBucket: "aasms-6a83a.firebasestorage.app",
  messagingSenderId: "475962750818",
  appId: "1:475962750818:web:53b5064c18c7f1e56f1e3b",
  measurementId: "G-4Y58R6KR35"
};
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const loginSection = document.getElementById("loginSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const statusEl = document.getElementById("status");

  // ================= LOGIN (Firestore only) ==================
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email.endsWith("@ksrce.ac.in")) {
      statusEl.textContent = "❌ Only @ksrce.ac.in emails are allowed";
      statusEl.style.color = "red";
      return;
    }

    try {
      const snapshot = await db.collection("students")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        statusEl.textContent = "❌ No student found with this email";
        statusEl.style.color = "red";
        return;
      }

      const doc = snapshot.docs[0];
      const student = doc.data();

      if (student.password === password) {
        statusEl.textContent = "";
document.getElementById("loadingOverlay").style.display = "flex";
        statusEl.style.color = "blue";
        localStorage.setItem("studentId", doc.id);
        localStorage.setItem("isLoggedIn", "true");
     
       
  // smooth fade
  
  setTimeout(() => {
  document.getElementById("loadingOverlay").style.display = "none";
  loginSection.style.display = "none";
  dashboardSection.style.display = "block";
  initDashboard(doc.id, student);
  dashboardSection.style.opacity = 0;
dashboardSection.style.display = "block";
requestAnimationFrame(() => {
  dashboardSection.style.opacity = 1;
  openTab('attendanceTab', document.querySelector('[onclick="openTab(\'attendanceTab\', this)"]'));
showLoginGuide(); 

});

}, 300);


      } else {
        statusEl.textContent = "❌ Incorrect password";
        statusEl.style.color = "red";
      }
    } catch (err) {
      statusEl.textContent = "❌ Error: " + err.message;
      statusEl.style.color = "red";
    }
  });

 
  // ================= Period Timings ==================
  const periods = [
    { start: "09:00", end: "09:50" },
    { start: "09:50", end: "10:40" },
    { start: "10:55", end: "11:45" },
    { start: "11:45", end: "12:35" },
    { start: "13:30", end: "14:20" },
    { start: "14:20", end: "15:10" },
    { start: "15:10", end: "16:00" },
    { start: "16:00", end: "16:50" }
  ];

  function getPeriodIndex(now) {
    const current = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < periods.length; i++) {
      const [sh, sm] = periods[i].start.split(":").map(Number);
      const [eh, em] = periods[i].end.split(":").map(Number);
      const startMin = sh * 60 + sm, endMin = eh * 60 + em;
      if (current >= startMin && current <= endMin) return i;
    }
    return -1;
  }

  function getStatus(periodIndex, now) {
    const [sh, sm] = periods[periodIndex].start.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(sh, sm, 0, 0);
    const diffMinutes = (now - startTime) / 60000;
    if (diffMinutes <= 10) return "Present";
    if (diffMinutes > 10 && diffMinutes <= 50) return "Late";
    return "Absent";
  }

  async function markAttendance(studentId, periodIndex, status, now, type) {
    const today = new Date().toISOString().split("T")[0];
 const ref = db.collection("attendance").doc(studentId).collection(today).doc(`period${periodIndex + 1}`);


    // ✅ Prevent double scan
    const existing = await ref.get();
    if (existing.exists) {
      document.getElementById("feedback").textContent = "⚠ Already marked for this period!";
      return;
    }

    await ref.set({
      date: today, period: periodIndex + 1, type: type,
      status: status, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

   const row = document.querySelector(`#attendanceTable tbody tr[data-period="${periodIndex + 1}"]`);
    if (row) {
      row.cells[2].textContent = type;
      row.cells[3].textContent = status;
      row.cells[3].className = status.toLowerCase();
    }

    // ✅ Show toast
   showNotification(`✅ Attendance marked for Period ${periodIndex + 1} (${type})`, "success");

  document.getElementById("feedback").textContent = `✅ ${status} recorded for Period ${periodIndex + 1}`;
}
  // ================== QR SCANNER CONTROL ==================
  let html5QrCode;
  let scanning = false;

  async function startScanner(onScanSuccess, onScanFailure) {
  const feedback = document.getElementById("feedback");
  document.getElementById("reader");
  reader.innerHTML = "";

  // Check if we already have camera permission
  const devices = navigator.mediaDevices;
  let permissionGranted = false;

  try {
    const permissions = await navigator.permissions.query({ name: "camera" });
    if (permissions.state === "granted") {
      permissionGranted = true;
    } else if (permissions.state === "prompt") {
      // Ask the user once
      try {
        await devices.getUserMedia({ video: true });
        permissionGranted = true;
      } catch {
        permissionGranted = false;
      }
    }

    // If denied previously → keep asking politely until allowed
    while (!permissionGranted) {
      feedback.textContent = "⚠️ Please allow camera access to start scanning.";
      try {
        await devices.getUserMedia({ video: true });
        permissionGranted = true;
      } catch {
        // Wait 3 seconds before trying again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // ✅ Once permission granted → start QR scanner
    html5QrCode = new Html5Qrcode("reader");
    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      feedback.textContent = "❌ No camera devices found.";
      return;
    }

    const backCamera = cameras.find(cam => /back|rear|environment/i.test(cam.label));
    const cameraId = backCamera ? backCamera.id : cameras[0].id;

   // ✅ Responsive QR box size
const qrBoxSize = Math.min(window.innerWidth * 0.6, 300);

await html5QrCode.start(
  cameraId,
  {
    fps: 60,
    aspectRatio: 1.0, // keeps it square
        rememberLastUsedCamera: true,
    qrbox: { width: qrBoxSize, height: qrBoxSize },
  },
  decodedText => onScanSuccess(decodedText),
  onScanFailure
);


    scanning = true;
    feedback.textContent = "📸 Scanner ready. Align the QR code inside the box.";
  } catch (error) {
    feedback.textContent = "❌ Camera initialization failed: " + error.message;
  }
}


  // ✅ Pause camera when tab is hidden or minimized
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && scanning && html5QrCode) {
      html5QrCode.stop().then(() => {
        scanning = false;
        console.log("Camera stopped because tab is hidden");
      }).catch(err => console.error("Stop failed", err));
    }
  });


// ================== DASHBOARD ==================
async function initDashboard(studentId, student) {
  // ================= TIMETABLE =================
  document.getElementById("studentName").textContent = student.name
  ? `${student.name} - Dashboard`
  : "Student Dashboard";


if (student.timetable) {
  const tbody = document.getElementById("timetableBody");
  tbody.innerHTML = "";

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todaySchedule = student.timetable[todayName];

  if (!todaySchedule || Object.keys(todaySchedule).length === 0) {
    // ✅ If no timetable, show placeholder row
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; font-style:italic; color:#888;">
          No timetable available today
        </td>
      </tr>`;
  } else {
    // Sort periods like period1, period2, ...
    const sortedPeriods = Object.keys(todaySchedule).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")); // extract number
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });

    sortedPeriods.forEach((p, i) => {
      const row = todaySchedule[p];
      tbody.innerHTML += `
        <tr data-period="${i + 1}">
          <td>${i + 1}</td>
          <td>${periods[i].start} – ${periods[i].end}</td>
          <td>${row.subject}</td>
        </tr>`;
    });
  }
}


  // ================= ATTENDANCE TABLE =================
  // ================= ATTENDANCE TABLE (FIXED) =================
const atBody = document.querySelector("#attendanceTable tbody");
atBody.innerHTML = "";

// Always get fresh today's date
const now = new Date();
const today = now.toISOString().split("T")[0];
console.log("📅 Loading attendance for:", today);

// Fetch attendance from Firestore with cache disabled
const attendanceRef = db.collection("attendance").doc(studentId).collection(today);

try {
  const snapshot = await attendanceRef.get({ source: "server" }); // force server data
  atBody.innerHTML = "";

  for (let i = 0; i < periods.length; i++) {
    const doc = snapshot.docs.find(d => d.id === `period${i + 1}`);
    const data = doc ? doc.data() : null;
    atBody.innerHTML += `
      <tr data-period="${i + 1}">
        <td>${i + 1}</td>
        <td>${periods[i].start} – ${periods[i].end}</td>
        <td>${data ? data.type : '-'}</td>
        <td class="${data ? data.status.toLowerCase() : 'absent'}">
          ${data ? data.status : 'Absent'}
        </td>
      </tr>`;
  }

  // ✅ Clear any existing listener to avoid old data mixing
  if (window.attendanceUnsub) window.attendanceUnsub();

  // ✅ Real-time updates for today's date
  window.attendanceUnsub = attendanceRef.onSnapshot(snapshot => {
    const rows = document.querySelectorAll("#attendanceTable tbody tr");
    snapshot.forEach(doc => {
      const data = doc.data();
      const periodIndex = data.period - 1;
      const row = rows[periodIndex];
      if (row) {
        row.cells[2].textContent = data.type || "-";
        row.cells[3].textContent = data.status || "Absent";
        row.cells[3].className = (data.status || "absent").toLowerCase();
      }
    });
  });
} catch (error) {
  console.error("⚠️ Failed to load today's attendance:", error);
  atBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Failed to load attendance</td></tr>`;
}


  // ================= REAL-TIME UPDATES =================
  attendanceRef.onSnapshot(snapshot => {
    const rows = document.querySelectorAll("#attendanceTable tbody tr");
    snapshot.forEach(doc => {
      const data = doc.data();
      const periodIndex = data.period - 1;
      const row = rows[periodIndex];
      if (row) {
        row.cells[2].textContent = data.type || "-";
        row.cells[3].textContent = data.status || "Absent";
        row.cells[3].className = (data.status || "absent").toLowerCase();
      }
    });
  });

  // QR Scanner init remains same...



  // ================== QR SCANNER CONTROL ==================
  let lastScanTime = 0;
   onScanSuccess=function(decodedText) {
    const now = new Date();
    const currentTime = now.getTime();
    if (currentTime - lastScanTime < 5000) return;
    lastScanTime = currentTime;
    
    feedback.textContent = "✅ Scanned successfully!";
    feedback.style.color = "green";

    const periodIndex = getPeriodIndex(now);
    if (periodIndex === -1) {
      document.getElementById("feedback").textContent = "❌ Not within class time!";
      return;
    }

    const text = decodedText.trim().toUpperCase().replace(/\s+/g, "");
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const todaySchedule = student.timetable[todayName];
    const periodKey = Object.keys(todaySchedule)[periodIndex];
     if (!todaySchedule[periodKey]) {
    document.getElementById("feedback").textContent = "❌ No class scheduled!";
    return;
}
    const subject = todaySchedule[periodKey].subject;

    if (text === "NORMALCLASSROOM") {
      markAttendance(studentId, periodIndex, getStatus(periodIndex, now), now, "Normal");

      // Mark consecutive lab periods if any
      if (subject.toLowerCase().includes("lab")) {
        for (let i = periodIndex + 1; i < periods.length; i++) {
          const nextKey = Object.keys(todaySchedule)[i];
          if (todaySchedule[nextKey] && todaySchedule[nextKey].subject === subject) {
            markAttendance(studentId, i, getStatus(i, now), now, "Normal");
          } else break;
        }
      }
    } else if (text === "SKILLCLASSROOM") {
      markAttendance(studentId, periodIndex, getStatus(periodIndex, now), now, "Skill");
    } else {
      document.getElementById("feedback").textContent = "❌ Invalid QR Code!";
    }
  }

  onScanFailure=function(err) {
    console.warn("Scan failed:", err);
    document.getElementById("feedback").textContent = "Scanning...";
  };



 
}



  // ================== AUTO LOGIN ==================

  function openTab(tabId, btn) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-nav button").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");

  // subtle vibration or glow animation
  btn.style.animation = "tabClick 0.25s ease";
  setTimeout(() => (btn.style.animation = ""), 250);
  // ✅ Auto-start scanner when switching to scanner tab
 if (tabId === "scannerTab" && !scanning) {
  setTimeout(() => startScanner(onScanSuccess, onScanFailure), 500);
}

}
const style = document.createElement("style");

document.head.appendChild(style);
function logout() {
    alert("Logging out...");
    // Stop QR scanner safely
    if (html5QrCode && scanning) {
        html5QrCode.stop().catch(() => {});
        scanning = false;
    }

    // Fade out dashboard
    dashboardSection.style.opacity = 0;

    setTimeout(() => {
        dashboardSection.style.display = "none";
        loginSection.style.display = "flex";
        loginSection.style.opacity = 0;

        // Trigger fade-in animation
        requestAnimationFrame(() => {
            loginSection.style.opacity = 1;
        });

        // Clear student session
        localStorage.removeItem("studentId");
    }, 300);
}

// Auto-login handling
// ✅ AUTO-LOGIN CHECK
window.addEventListener("load", async () => {
  const savedStudentId = localStorage.getItem("studentId");

  if (savedStudentId) {
    try {
      // Ensure Firebase is ready before accessing Firestore
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 sec for safety

      const docRef = db.collection("students").doc(savedStudentId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        // Hide login, show dashboard
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";

        // Initialize dashboard UI
initDashboard(savedStudentId, docSnap.data());
openTab('attendanceTab', document.querySelector('[onclick="openTab(\'attendanceTab\', this)"]'));
showLoginGuide(); 

        console.log("✅ Auto-login successful for:", savedStudentId);
      } else {
        // If ID invalid, clear it
        localStorage.removeItem("studentId");
        console.warn("⚠️ Saved student not found, cleared localStorage.");
      }
    } catch (error) {
      console.error("Auto-login error:", error);
    }
  } else {
    console.log("ℹ️ No saved login found — staying on login screen.");
  }
});


document.getElementById("refreshButton").addEventListener("click", async () => {
  const studentId = localStorage.getItem("studentId");
  if (!studentId) return;

  const doc = await db.collection("students").doc(studentId).get();
  if (doc.exists) {
    const student = doc.data();
    initDashboard(studentId, student);
    showToast("🔄 Data refreshed");
  }
});


let inactivityTimer;
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    showToast("⏰ Session expired. Logging out...");
    setTimeout(logout, 2000);
  }, 15 * 60 * 1000); // 15 minutes
}

// Reset timer on any interaction
["click", "mousemove", "keypress", "scroll", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer);
});
resetInactivityTimer();
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}


function refreshPage() {
  const icon = document.querySelector("#refreshBtn i");
  icon.style.animation = "spin 0.6s linear";
  setTimeout(() => {
       icon.style.animation = "";
    location.reload(); // Refreshes the page
  }, 600);
}

function showLoginGuide() {
 
 

  toast.style.opacity = 1;
  arrow.style.opacity = 1;

  // Hide after 5 seconds
  setTimeout(() => {
    toast.style.opacity = 0;
    arrow.style.opacity = 0;
  }, 5000);
}

function showNotification(message, type = "info") {
  const toast = document.getElementById("toast");

  // Style based on type
  if (type === "success") {
    toast.style.background = "#4CAF50"; // green
  } else if (type === "warning") {
    toast.style.background = "#FFC107"; // amber
  } else if (type === "error") {
    toast.style.background = "#F44336"; // red
  } else {
    toast.style.background = "#4e54c8"; // default
  }

  toast.textContent = message;
  toast.style.display = "block";
  toast.style.opacity = 1;

  // Fade out after 4s
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s";
    toast.style.opacity = 0;
    setTimeout(() => (toast.style.display = "none"), 500);
  }, 4000);
}
