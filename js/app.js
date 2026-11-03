// =====================================================
// Watchnow - Main Application Logic
// =====================================================

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const devicesScreen = document.getElementById('devices-screen');
const viewerScreen = document.getElementById('viewer-screen');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const backBtn = document.getElementById('back-btn');
const devicesList = document.getElementById('devices-list');
const emptyState = document.getElementById('empty-state');
const remoteVideo = document.getElementById('remote-video');
const noStream = document.getElementById('no-stream');
const viewerTitle = document.getElementById('viewer-title');

// State
let currentUser = null;
let currentDeviceId = null;
let peerConnection = null;

// =====================================================
// Auth
// =====================================================

// Check for redirect result on page load
async function handleRedirect() {
  try {
    const result = await auth.getRedirectResult();
    if (result && result.user) {
      console.log('Login via redirect successful');
    }
  } catch (error) {
    console.error('Redirect result error:', error);
    alert('Login error: ' + error.message);
  }
}

handleRedirect();

googleLoginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = 'Redirecting...';
    await auth.signInWithRedirect(provider);
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" /> Continue with Google`;
  }
});

logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
});

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user ? user.email : 'signed out');
  if (user) {
    currentUser = user;
    showScreen('devices');
    loadDevices();
  } else {
    currentUser = null;
    showScreen('login');
  }
});

// =====================================================
// Navigation
// =====================================================

function showScreen(name) {
  loginScreen.classList.add('hidden');
  devicesScreen.classList.add('hidden');
  viewerScreen.classList.add('hidden');

  if (name === 'login') loginScreen.classList.remove('hidden');
  if (name === 'devices') devicesScreen.classList.remove('hidden');
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
  if (!currentUser) return;

  const devicesRef = database.ref(`users/${currentUser.uid}/devices`);

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
// Live Viewer (WebRTC - Placeholder for now)
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

// =====================================================
// Control Buttons (Placeholders)
// =====================================================

document.getElementById('switch-camera-btn').addEventListener('click', () => {
  alert('Switch Camera - will work after HomeLook is connected');
});

document.getElementById('flashlight-btn').addEventListener('click', () => {
  alert('Flashlight - will work after HomeLook is connected');
});

document.getElementById('mic-btn').addEventListener('click', () => {
  alert('Mic (Hold to talk) - will work after HomeLook is connected');
});

document.getElementById('location-btn').addEventListener('click', () => {
  alert('Show Location - will work after HomeLook is connected');
});

document.getElementById('camera-off-btn').addEventListener('click', () => {
  alert('Camera Off - will work after HomeLook is connected');
});