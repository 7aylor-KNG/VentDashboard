// --- 1. Firebase Setup & Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your specific Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_qxUHoJ0ED1n3do9_gFdTuhkxLZxeVf4",
  authDomain: "ventdashboard.firebaseapp.com",
  projectId: "ventdashboard",
  storageBucket: "ventdashboard.firebasestorage.app",
  messagingSenderId: "329963303488",
  appId: "1:329963303488:web:bfd4132010f7f7047f25a5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. State & Default Data ---
let currentUser = null;
let userData = {
    background: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
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

// Helper to show errors briefly
function showAuthError(message) {
    authError.textContent = message.replace('Firebase: ', '');
    authError.style.display = 'block';
    setTimeout(() => authError.style.display = 'none', 4000);
}

// Handle Login
document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => showAuthError(error.message));
});

// Handle Registration
document.getElementById('btn-register').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return showAuthError("Please enter email and password.");
    
    createUserWithEmailAndPassword(auth, email, password)
        .catch(error => showAuthError(error.message));
});

document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
});

// Listen for login/logout state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        emailInput.value = ''; // clear inputs
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
        userData = docSnap.data(); // Load existing user layout
    } else {
        await setDoc(docRef, userData); // Save default layout for new user
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

// --- 6. UI Rendering ---
function applySettings() {
    document.body.style.background = `url('${userData.background}') no-repeat center center fixed`;
    document.body.style.backgroundSize = "cover";
}

function renderDashboard() {
    // Clear current grid
    dashboardGrid.innerHTML = '';

    // Add static widgets (Search)
    dashboardGrid.innerHTML += `
        <div class="widget search-widget" style="grid-column: span 4; flex-direction: row; padding: 0;">
            <form action="https://www.google.com/search" method="GET" style="display:flex; width:100%; padding: 15px;">
                <i class="fa-brands fa-google" style="margin-right:10px; font-size:1.2rem; color: rgba(255, 255, 255, 0.7);"></i>
                <input type="text" name="q" placeholder="Search Google..." style="width:100%; background:transparent; border:none; outline:none; color:white; font-size:1.2rem;">
            </form>
        </div>
    `;

    // Render Custom Links
    userData.links.forEach(link => {
        dashboardGrid.innerHTML += `
            <a href="${link.url}" class="widget link-widget" target="_blank">
                <i class="fa-solid ${link.icon}"></i>
                <span>${link.title}</span>
            </a>
        `;
    });
}

// --- 7. Settings Modal Logic ---
document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('input-bg').value = userData.background;
    renderSettingsLinks();
    settingsModal.classList.remove('hidden');
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

function renderSettingsLinks() {
    const list = document.getElementById('link-editor-list');
    list.innerHTML = '';
    
    userData.links.forEach((link, index) => {
        list.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" class="glass-input" placeholder="Title" value="${link.title}" onchange="updateLink(${index}, 'title', this.value)" style="margin:0;">
                <input type="text" class="glass-input" placeholder="URL" value="${link.url}" onchange="updateLink(${index}, 'url', this.value)" style="margin:0;">
                <input type="text" class="glass-input" placeholder="Icon (e.g. fa-bolt)" value="${link.icon}" onchange="updateLink(${index}, 'icon', this.value)" style="margin:0; width:120px;">
                <button class="glass-btn" onclick="removeLink(${index})" style="padding:0 15px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

// Global functions for inline HTML event listeners
window.updateLink = (index, field, value) => {
    userData.links[index][field] = value;
};

window.removeLink = (index) => {
    userData.links.splice(index, 1);
    renderSettingsLinks();
};

document.getElementById('btn-add-link').addEventListener('click', () => {
    userData.links.push({ title: "New Link", url: "#", icon: "fa-link" });
    renderSettingsLinks();
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
    userData.background = document.getElementById('input-bg').value;
    saveUserData();
});
