// --- 1. Firebase Setup & Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_qxUHoJ0ED1n3do9_gFdTuhkxLZxeVf4",
  authDomain: "ventdashboard.firebaseapp.com",
  projectId: "ventdashboard",
  storageBucket: "ventdashboard.firebasestorage.app",
  messagingSenderId: "329963303488",
  appId: "1:329963303488:web:bfd4132010f7f7047f25a5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. State & Default Data ---
let currentUser = null;
let userData = {
    background: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
    theme: "light", // Added theme state
    links: [
        { title: "Vent Portal", url: "#", icon: "fa-bolt" },
        { title: "HNC Moodle", url: "#", icon: "fa-graduation-cap" },
        { title: "GitHub", url: "https://github.com", icon: "fa-github" }
    ]
};

// --- 3. DOM Elements ---
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const dashboardGrid = document.getElementById('dashboard-grid');
const settingsModal = document.getElementById('settings-modal');

const emailInput = document.getElementById('input-email');
const passwordInput = document.getElementById('input-password');
const authError = document.getElementById('auth-error');

// --- 4. Authentication Logic ---
function showAuthError(message) {
    authError.textContent = message.replace('Firebase: ', '');
    authError.style.display = 'block';
    setTimeout(() => authError.style.display = 'none', 4000);
}

document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    signInWithEmailAndPassword(auth, email, password).catch(error => showAuthError(error.message));
});

document.getElementById('btn-register').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    createUserWithEmailAndPassword(auth, email, password).catch(error => showAuthError(error.message));
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        emailInput.value = ''; 
        passwordInput.value = '';
        await loadUserData(user.uid);
    } else {
        currentUser = null;
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
});

// --- 5. Database Logic ---
async function loadUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        userData = { ...userData, ...docSnap.data() }; // Merge to ensure new fields like 'theme' exist
    } else {
        await setDoc(docRef, userData);
    }
    
    applySettings();
    renderDashboard();
}

async function saveUserData() {
    if (!currentUser) return;
    const docRef = doc(db, "users", currentUser.uid);
    await setDoc(docRef, userData);
    
    settingsModal.classList.add('hidden');
    applySettings();
    renderDashboard();
}

// --- 6. UI & Rendering Logic ---
function applySettings() {
    document.body.style.background = `url('${userData.background}') no-repeat center center fixed`;
    document.body.style.backgroundSize = "cover";
    
    if (userData.theme === 'dark') {
        document.body.classList.add('dark-tint');
        document.getElementById('btn-toggle-theme').innerHTML = `<i class="fa-solid fa-sun"></i> Switch to Light Tint`;
    } else {
        document.body.classList.remove('dark-tint');
        document.getElementById('btn-toggle-theme').innerHTML = `<i class="fa-solid fa-moon"></i> Switch to Dark Tint`;
    }
}

function renderDashboard() {
    dashboardGrid.innerHTML = '';

    // Search Widget (Static)
    dashboardGrid.innerHTML += `
        <div class="widget search-widget" style="grid-column: span 4; flex-direction: row; padding: 0;">
            <form action="https://www.google.com/search" method="GET" style="display:flex; width:100%; padding: 15px;">
                <i class="fa-brands fa-google" style="margin-right:10px; font-size:1.2rem; color: var(--placeholder-color);"></i>
                <input type="text" name="q" placeholder="Search Google..." style="width:100%; background:transparent; border:none; outline:none; color:var(--text-color); font-size:1.2rem;">
            </form>
        </div>
    `;

    // Clock Widget (Static)
    dashboardGrid.innerHTML += `
        <div class="widget clock-widget">
            <div class="time" id="time">00:00</div>
            <div class="date" id="date">Loading...</div>
        </div>
    `;

    // Draggable Links
    userData.links.forEach((link, index) => {
        dashboardGrid.innerHTML += `
            <a href="${link.url}" class="widget link-widget" target="_blank" data-index="${index}" draggable="false">
                <i class="fa-solid ${link.icon}"></i>
                <span>${link.title}</span>
            </a>
        `;
    });

    attachDragEvents();
    updateClock(); // Force immediate clock update
}

// Clock Engine
function updateClock() {
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    if (!timeEl || !dateEl) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-GB', options);
}
setInterval(updateClock, 1000);

// --- 7. Settings & Theme Toggle ---
document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('input-bg').value = userData.background;
    renderSettingsLinks();
    settingsModal.classList.remove('hidden');
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// The Missing Theme Toggle Logic
document.getElementById('btn-toggle-theme').addEventListener('click', () => {
    userData.theme = userData.theme === 'dark' ? 'light' : 'dark';
    applySettings();
    saveUserData(); // Save preference immediately
});

function renderSettingsLinks() {
    const list = document.getElementById('link-editor-list');
    list.innerHTML = '';
    
    userData.links.forEach((link, index) => {
        list.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" class="glass-input" placeholder="Title" value="${link.title}" onchange="updateLink(${index}, 'title', this.value)" style="margin:0;">
                <input type="text" class="glass-input" placeholder="URL" value="${link.url}" onchange="updateLink(${index}, 'url', this.value)" style="margin:0;">
                <input type="text" class="glass-input" placeholder="Icon" value="${link.icon}" onchange="updateLink(${index}, 'icon', this.value)" style="margin:0; width:120px;">
                <button class="glass-btn" onclick="removeLink(${index})" style="padding:0 15px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

window.updateLink = (index, field, value) => userData.links[index][field] = value;
window.removeLink = (index) => { userData.links.splice(index, 1); renderSettingsLinks(); };
document.getElementById('btn-add-link').addEventListener('click', () => {
    userData.links.push({ title: "New Link", url: "#", icon: "fa-link" });
    renderSettingsLinks();
});
document.getElementById('btn-save-settings').addEventListener('click', () => {
    userData.background = document.getElementById('input-bg').value;
    saveUserData();
});

// --- 8. Drag and Drop Engine ---
let isEditMode = false;
let draggedItemIndex = null;
const btnEditMode = document.getElementById('btn-edit-mode');

function preventLinkClick(e) { e.preventDefault(); }

btnEditMode.addEventListener('click', () => {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        dashboardGrid.classList.add('edit-mode');
        btnEditMode.style.background = "var(--glass-border)";
        btnEditMode.innerHTML = `<i class="fa-solid fa-check"></i> Done`;
        
        document.querySelectorAll('.link-widget').forEach(widget => {
            widget.setAttribute('draggable', 'true');
            widget.addEventListener('click', preventLinkClick);
        });
    } else {
        dashboardGrid.classList.remove('edit-mode');
        btnEditMode.style.background = ""; 
        btnEditMode.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right"></i> Arrange`;
        
        saveUserData(); // Save new positions to cloud
        
        document.querySelectorAll('.link-widget').forEach(widget => {
            widget.setAttribute('draggable', 'false');
            widget.removeEventListener('click', preventLinkClick);
        });
    }
});

function attachDragEvents() {
    const widgets = document.querySelectorAll('.link-widget');

    widgets.forEach(widget => {
        widget.addEventListener('dragstart', (e) => {
            if (!isEditMode) { e.preventDefault(); return; }
            draggedItemIndex = parseInt(widget.getAttribute('data-index'));
            widget.classList.add('dragging');
        });

        widget.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if (isEditMode) widget.classList.add('drag-over');
        });

        widget.addEventListener('dragleave', () => widget.classList.remove('drag-over'));

        widget.addEventListener('drop', (e) => {
            e.preventDefault();
            widget.classList.remove('drag-over');
            if (!isEditMode || draggedItemIndex === null) return;

            const targetIndex = parseInt(widget.getAttribute('data-index'));

            if (draggedItemIndex !== targetIndex) {
                const itemToMove = userData.links.splice(draggedItemIndex, 1)[0];
                userData.links.splice(targetIndex, 0, itemToMove);
                
                renderDashboard(); // Redraw grid with new order
                
                // Re-apply edit mode state because we just redrew the DOM
                dashboardGrid.classList.add('edit-mode');
                document.querySelectorAll('.link-widget').forEach(w => {
                    w.setAttribute('draggable', 'true');
                    w.addEventListener('click', preventLinkClick);
                });
            }
        });

        widget.addEventListener('dragend', () => {
            widget.classList.remove('dragging');
            draggedItemIndex = null;
        });
    });
}
