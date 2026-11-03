// =====================================================
// Watchnow - Main Application Logic
// =====================================================

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const devicesScreen = document.getElementById('devices-screen');
const settingsScreen = document.getElementById('settings-screen');
const viewerScreen = document.getElementById('viewer-screen');
const googleLoginBtn = document.getElementById('google-login-btn');
const activationLoginBtn = document.getElementById('activation-login-btn');
const activationInputBox = document.getElementById('activation-input-box');
const activationCodeInput = document.getElementById('activation-code-input');
const activationSubmitBtn = document.getElementById('activation-submit-btn');
const logoutBtn = document.getElementById('logout-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const backBtn = document.getElementById('back-btn');
const devicesList = document.getElementById('devices-list');
const emptyState = document.getElementById('empty-state');
const activationCodeDisplay = document.getElementById('activation-code-display');
const copyCodeBtn = document.getElementById('copy-code-btn');
const remoteVideo = document.getElementById('remote-video');
const noStream = document.getElementById('no-stream');
const viewerTitle = document.getElementById('viewer-title');

// State
let currentUser = null;
let currentUid = null;
let currentDeviceId = null;
let peerConnection = null;

// Status message helper
function showStatus(msg) {
  const existing = document.getElementById('status-msg');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'status-msg';
  div.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;background:#1e293b;color:white;padding:12px;border-radius:8px;z-index:9999;font-size:14px;text-align:center;';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// Generate unique activation code
function generateActivationCode() {
  return 'WN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// =====================================================
// Auth - Google
// =====================================================

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => console.error(err));

googleLoginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = 'Opening Google...';
    showStatus('Opening Google login...');
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error(error);
    showStatus('Login failed: ' + error.message);
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" /> Continue with Google`;
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    currentUid = user.uid;
    await ensureActivationCode(user.uid);
    showScreen('devices');
    loadDevices();
  } else if (!currentUid) {
    showScreen('login');
  }
});

async function ensureActivationCode(uid) {
  const codeRef = database.ref(`users/${uid}/activationCode`);
  const snap = await codeRef.once('value');
  if (!snap.exists()) {
    const code = generateActivationCode();
    await codeRef.set(code);
    await database.ref(`activationCodes/${code}`).set({ uid: uid });
  }
}

// =====================================================
// Activation Code Login
// =====================================================

activationLoginBtn.addEventListener('click', () => {
  activationInputBox.classList.remove('hidden');
  activationLoginBtn.classList.add('hidden');
});

activationSubmitBtn.addEventListener('click', async () => {
  const code = activationCodeInput.value.trim().toUpperCase();
  if (!code) {
    showStatus('Please enter activation code');
    return;
  }

  activationSubmitBtn.disabled = true;
  activationSubmitBtn.textContent = 'Checking...';

  try {
    const snap = await database.ref(`activationCodes/${code}`).once('value');
    if (snap.exists()) {
      const data = snap.val();
      currentUid = data.uid;
      currentUser = { uid: currentUid }; // virtual user
      localStorage.setItem('watchnow_uid', currentUid);
      showStatus('Login successful');
      showScreen('devices');
      loadDevices();
    } else {
      showStatus('Invalid activation code');
    }
  } catch (err) {
    showStatus('Error: ' + err.message);
  }

  activationSubmitBtn.disabled = false;
  activationSubmitBtn.textContent = 'Continue';
});

// Restore activation login on page load
const savedUid = localStorage.getItem('watchnow_uid');
if (savedUid) {
  currentUid = savedUid;
  currentUser = { uid: savedUid };
  showScreen('devices');
  loadDevices();
}

// =====================================================
// Logout
// =====================================================

logoutBtn.addEventListener('click', async () => {
  localStorage.removeItem('watchnow_uid');
  currentUid = null;
  currentUser = null;
  await auth.signOut();
  showScreen('login');
  activationInputBox.classList.add('hidden');
  activationLoginBtn.classList.remove('hidden');
  showStatus('Logged out');
});

// =====================================================
// Settings
// =====================================================

settingsBtn.addEventListener('click', async () => {
  showScreen('settings');
  if (currentUid) {
    const snap = await database.ref(`users/${currentUid}/activationCode`).once('value');
    activationCodeDisplay.textContent = snap.val() || 'Not found';
  }
});

settingsBackBtn.addEventListener('click', () => {
  showScreen('devices');
});

copyCodeBtn.addEventListener('click', () => {
  const code = activationCodeDisplay.textContent;
  if (code && code !== 'Loading...' && code !== 'Not found') {
    navigator.clipboard.writeText(code).then(() => {
      showStatus('Activation code copied');
    }).catch(() => {
      showStatus('Copy failed');
    });
  }
});

// =====================================================
// Navigation
// =====================================================

function showScreen(name) {
  loginScreen.classList.add('hidden');
  devicesScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  viewerScreen.classList.add('hidden');

  if (name === 'login') loginScreen.classList.remove('hidden');
  if (name === 'devices') devicesScreen.classList.remove('hidden');
  if (name === 'settings') settingsScreen.classList.remove('hidden');
  if (name === 'viewer') viewerScreen.classList.remove('hidden');
}

backBtn.addEventListener('click', () => {
  stopViewer();
  showScreen('devices');
});

// =====================================================
// Devices
// =====================================================

function loadDevices() {
  if (!currentUid) return;

  const devicesRef = database.ref(`users/${currentUid}/devices`);

  devicesRef.on('value', (snapshot) => {
    const devices = snapshot.val() || {};
    renderDevices(devices);
  });
}

function renderDevices(devices) {
  const deviceIds = Object.keys(devices);

  const cards = devicesList.querySelectorAll('.device-card');
  cards.forEach(card => card.remove());

  if (deviceIds.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  deviceIds.forEach((deviceId) => {
    const device = devices[deviceId];
    const card = document.createElement('div');
    card.className = 'device-card';

    const lastSeen = device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Unknown';
    const status = device.online ? '🟢 Online' : '⚫ Offline';

    card.innerHTML = `
      <div class="device-info">
        <h3>${device.name || 'Unknown Device'}</h3>
        <p>${status} • ${lastSeen}</p>
      </div>
      <div class="device-actions">
        <button class="action-btn" data-action="camera" data-id="${deviceId}" title="Live Camera">📷</button>
        <button class="action-btn" data-action="location" data-id="${deviceId}" title="Location">📍</button>
      </div>
    `;

    card.querySelector('[data-action="camera"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openViewer(deviceId, device.name || 'Device');
    });

    card.querySelector('[data-action="location"]').addEventListener('click', (e) => {
      e.stopPropagation();
      alert('Location feature will be added soon');
    });

    devicesList.appendChild(card);
  });
}

// =====================================================
// Live Viewer (Placeholder)
// =====================================================

function openViewer(deviceId, deviceName) {
  currentDeviceId = deviceId;
  viewerTitle.textContent = deviceName;
  showScreen('viewer');
  noStream.style.display = 'flex';
  noStream.innerHTML = '<p>Connecting to device...</p>';

  setTimeout(() => {
    noStream.innerHTML = '<p>Waiting for HomeLook app...<br><small>WebRTC connection will be added next</small></p>';
  }, 1500);
}

function stopViewer() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  currentDeviceId = null;
}

// Control buttons placeholders
document.getElementById('switch-camera-btn').addEventListener('click', () => alert('Switch Camera - coming soon'));
document.getElementById('flashlight-btn').addEventListener('click', () => alert('Flashlight - coming soon'));
document.getElementById('mic-btn').addEventListener('click', () => alert('Mic - coming soon'));
document.getElementById('location-btn').addEventListener('click', () => alert('Location - coming soon'));
document.getElementById('camera-off-btn').addEventListener('click', () => alert('Camera Off - coming soon'));