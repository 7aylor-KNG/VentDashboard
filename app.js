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
const MAX_SLOTS = 20; // 4 columns x 5 rows
let currentUser = null;
let userData = {
    background: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
    theme: "light",
    grid: new Array(MAX_SLOTS).fill(null) // The new free-form grid system
};

// --- 3. DOM Elements ---
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const topWidgets = document.getElementById('top-widgets');
const linkGrid = document.getElementById('link-grid');
const settingsModal = document.getElementById('settings-modal');

// --- 4. Authentication Logic ---
function showAuthError(message) {
    const err = document.getElementById('auth-error');
    err.textContent = message.replace('Firebase: ', '');
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 4000);
}

document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    signInWithEmailAndPassword(auth, email, password).catch(error => showAuthError(error.message));
});

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    createUserWithEmailAndPassword(auth, email, password).catch(error => showAuthError(error.message));
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        await loadUserData(user.uid);
    } else {
        currentUser = null;
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
});

// --- 5. Database Logic & Migration ---
async function loadUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        userData.background = data.background || userData.background;
        userData.theme = data.theme || userData.theme;
        
        // Data Migration: Upgrade old "links" list to new "grid" system silently
        if (data.grid) {
            userData.grid = data.grid;
        } else if (data.links) {
            data.links.forEach((link, i) => { if (i < MAX_SLOTS) userData.grid[i] = link; });
            saveUserData(); // Save upgraded structure
        }
    } else {
        // Default start pack
        userData.grid[0] = { title: "Vent Portal", url: "https://example.com" };
        userData.grid[1] = { title: "HNC Moodle", url: "https://example.com" };
        userData.grid[2] = { title: "GitHub", url: "https://github.com" };
        await setDoc(docRef, userData);
    }
    
    applySettings();
    renderDashboard();
}

async function saveUserData() {
    if (!currentUser) return;
    await setDoc(doc(db, "users", currentUser.uid), userData);
    settingsModal.classList.add('hidden');
    applySettings();
    renderDashboard();
}

// --- 6. UI & Rendering Logic ---
function applySettings() {
    document.body.style.background = `url('${userData.background}') no-repeat center center fixed`;
    document.body.style.backgroundSize = "cover";
    
    const btn = document.getElementById('btn-toggle-theme');
    if (userData.theme === 'dark') {
        document.body.classList.add('dark-tint');
        btn.innerHTML = `<i class="fa-solid fa-sun"></i> Switch to Light Tint`;
    } else {
        document.body.classList.remove('dark-tint');
        btn.innerHTML = `<i class="fa-solid fa-moon"></i> Switch to Dark Tint`;
    }
}

// Extract a clean domain for the Google Favicon API
function getFaviconUrl(urlString) {
    try {
        const url = new URL(urlString);
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
        return null;
    }
}

function renderDashboard() {
    // 1. Render Static Top Widgets
    topWidgets.innerHTML = `
        <div class="widget search-widget" style="grid-column: span 2; flex-direction: row; padding: 0;">
            <form action="https://www.google.com/search" method="GET" style="display:flex; width:100%; padding: 15px;">
                <i class="fa-brands fa-google" style="margin-right:10px; font-size:1.2rem; color: var(--placeholder-color);"></i>
                <input type="text" name="q" placeholder="Search..." style="width:100%; background:transparent; border:none; outline:none; color:var(--text-color); font-size:1.2rem;">
            </form>
        </div>
        <div class="widget clock-widget" style="grid-column: span 2; display:flex; flex-direction:column; justify-content:center; align-items:flex-end;">
            <div style="font-size: 2.5rem; font-weight: bold; line-height:1;" id="time">00:00</div>
            <div style="font-size: 0.9rem; opacity: 0.8;" id="date">Loading...</div>
        </div>
    `;

    // 2. Render the 20-Slot Free Form Grid
    linkGrid.innerHTML = '';
    
    for (let i = 0; i < MAX_SLOTS; i++) {
        const link = userData.grid[i];
        
        if (link) {
            const iconUrl = getFaviconUrl(link.url);
            const iconHtml = iconUrl 
                ? `<img src="${iconUrl}" class="widget-icon" onerror="this.outerHTML='<i class=\\'fa-solid fa-globe widget-icon-fallback\\'></i>'">`
                : `<i class="fa-solid fa-globe widget-icon-fallback"></i>`;

            linkGrid.innerHTML += `
                <div class="grid-slot" data-index="${i}">
                    <a href="${link.url}" class="widget link-widget" target="_blank" draggable="false">
                        ${iconHtml}
                        <span>${link.title}</span>
                    </a>
                </div>
            `;
        } else {
            linkGrid.innerHTML += `<div class="grid-slot empty-slot" data-index="${i}"></div>`;
        }
    }

    updateClock();
    attachDragEvents();
}

// Clock Engine
function updateClock() {
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    dateEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
}
setInterval(updateClock, 1000);

// --- 7. Settings Modal ---
document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('input-bg').value = userData.background;
    renderSettingsLinks();
    settingsModal.classList.remove('hidden');
});

document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));

document.getElementById('btn-toggle-theme').addEventListener('click', () => {
    userData.theme = userData.theme === 'dark' ? 'light' : 'dark';
    applySettings();
    saveUserData();
});

function renderSettingsLinks() {
    const list = document.getElementById('link-editor-list');
    list.innerHTML = '';
    
    userData.grid.forEach((link, index) => {
        if (!link) return; // Only show inputs for active slots
        list.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" class="glass-input" placeholder="Title" value="${link.title}" onchange="updateLink(${index}, 'title', this.value)" style="margin:0;">
                <input type="text" class="glass-input" placeholder="URL" value="${link.url}" onchange="updateLink(${index}, 'url', this.value)" style="margin:0;">
                <button class="glass-btn" onclick="removeLink(${index})" style="padding:0 15px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

window.updateLink = (index, field, value) => { userData.grid[index][field] = value; };
window.removeLink = (index) => { userData.grid[index] = null; renderSettingsLinks(); };

document.getElementById('btn-add-link').addEventListener('click', () => {
    const emptyIndex = userData.grid.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
        userData.grid[emptyIndex] = { title: "New Link", url: "https://" };
        renderSettingsLinks();
    } else {
        alert("Your dashboard is full! (20 slots max)");
    }
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
    userData.background = document.getElementById('input-bg').value;
    saveUserData();
});

// --- 8. iOS Free-Form Drag and Drop ---
let isEditMode = false;
let draggedItemIndex = null;
const btnEditMode = document.getElementById('btn-edit-mode');

function preventClick(e) { e.preventDefault(); }

btnEditMode.addEventListener('click', () => {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        linkGrid.classList.add('edit-mode');
        btnEditMode.style.background = "var(--glass-border)";
        btnEditMode.innerHTML = `<i class="fa-solid fa-check"></i> Done`;
        document.querySelectorAll('.link-widget').forEach(w => {
            w.setAttribute('draggable', 'true');
            w.addEventListener('click', preventClick);
        });
    } else {
        linkGrid.classList.remove('edit-mode');
        btnEditMode.style.background = ""; 
        btnEditMode.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right"></i> Arrange`;
        saveUserData(); // Lock in new arrangement
        document.querySelectorAll('.link-widget').forEach(w => {
            w.setAttribute('draggable', 'false');
            w.removeEventListener('click', preventClick);
        });
    }
});

function attachDragEvents() {
    const slots = document.querySelectorAll('.grid-slot');

    slots.forEach(slot => {
        const index = parseInt(slot.getAttribute('data-index'));

        slot.addEventListener('dragstart', (e) => {
            if (!isEditMode || !userData.grid[index]) { e.preventDefault(); return; }
            draggedItemIndex = index;
            slot.classList.add('dragging');
        });

        slot.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if (isEditMode) slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            if (!isEditMode || draggedItemIndex === null) return;

            const targetIndex = index;

            if (draggedItemIndex !== targetIndex) {
                // Swap the array positions
                const temp = userData.grid[targetIndex];
                userData.grid[targetIndex] = userData.grid[draggedItemIndex];
                userData.grid[draggedItemIndex] = temp;
                
                renderDashboard();
                
                // Re-enable edit properties on redrawn grid
                linkGrid.classList.add('edit-mode');
                document.querySelectorAll('.link-widget').forEach(w => {
                    w.setAttribute('draggable', 'true');
                    w.addEventListener('click', preventClick);
                });
            }
        });

        slot.addEventListener('dragend', () => {
            slot.classList.remove('dragging');
            draggedItemIndex = null;
        });
    });
}
