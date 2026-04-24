const GOOGLE_CLIENT_ID = '406479175733-btl7kb8r4sv7ufk7v19e01gq869vugme.apps.googleusercontent.com';

const googleButtonContainer = document.getElementById('google-signin');
const signOutButton = document.getElementById('signout-btn');
const statusMessage = document.getElementById('status-message');
const introView = document.getElementById('intro-view');
const homeView = document.getElementById('home-view');
const variantA = document.getElementById('variant-a');
const variantB = document.getElementById('variant-b');
const variantPill = document.getElementById('variant-pill');
const homeTitle = document.getElementById('home-title');
const homeDescription = document.getElementById('home-description');
const metricsBody = document.getElementById('metrics-body');

let currentUser = null;
let currentVariant = null;

function setStatus(message, type = '') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}

function decodeJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join('')
  );

  return JSON.parse(jsonPayload);
}

function updateProfile(user, variant) {
  const avatar = document.getElementById('profile-picture');
  document.getElementById('user-name').textContent = user?.name || 'Not signed in';
  document.getElementById('user-email').textContent = user?.email || '--';
  document.getElementById('user-sub').textContent = user?.sub || '--';
  document.getElementById('assigned-variant').textContent = variant || '--';
  document.getElementById('session-state').textContent = user ? 'Authenticated and sticky assignment active' : 'Waiting for sign-in';

  if (user?.picture) {
    avatar.src = user.picture;
    avatar.alt = `${user.name || 'User'} profile picture`;
    avatar.classList.remove('hidden');
  } else {
    avatar.classList.add('hidden');
  }
}

function showVariant(variant) {
  currentVariant = variant;
  introView.classList.remove('full-width');
  homeView.classList.remove('hidden');
  signOutButton.classList.remove('hidden');
  variantPill.textContent = `Variant ${variant}`;

  if (variant === 'A') {
    variantA.classList.remove('hidden');
    variantB.classList.add('hidden');
    homeTitle.textContent = 'Welcome to Home Page A';
    homeDescription.textContent = 'You were randomly assigned to Version A and will keep seeing this version during later visits.';
  } else {
    variantB.classList.remove('hidden');
    variantA.classList.add('hidden');
    homeTitle.textContent = 'Welcome to Home Page B';
    homeDescription.textContent = 'You were randomly assigned to Version B and will keep seeing this version during later visits.';
  }
}

async function assignVariant(profile) {
  const response = await fetch('/api/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to assign A/B test variant.');
  }

  const data = await response.json();
  currentUser = data.user;
  updateProfile(currentUser, data.variant);
  showVariant(data.variant);
  setStatus(`Authentication successful. Sticky assignment: Variant ${data.variant}.`, 'success');
  await loadMetrics();
}

async function handleCredentialResponse(response) {
  try {
    const profile = decodeJwt(response.credential);
    await assignVariant(profile);
  } catch (error) {
    console.error(error);
    setStatus('Login worked, but the app could not finish A/B assignment.', 'error');
  }
}

function initializeGoogleSignIn() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    setStatus('Google Identity Services failed to load. Refresh and try again.', 'error');
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  google.accounts.id.renderButton(googleButtonContainer, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 260,
  });
}

function renderMetricsTable(events) {
  if (!events.length) {
    metricsBody.innerHTML = '<tr><td colspan="5">No interactions recorded yet.</td></tr>';
    return;
  }

  metricsBody.innerHTML = events
    .map(
      (event) => `
        <tr>
          <td>${event.userName || event.userEmail}</td>
          <td>${event.buttonLabel}</td>
          <td>${event.pageVersion}</td>
          <td>${event.ipAddress}</td>
          <td>${new Date(event.timestamp).toLocaleString()}</td>
        </tr>
      `
    )
    .join('');
}

function renderMetricSummary(summary) {
  document.getElementById('metric-total').textContent = summary.totalClicks || 0;
  document.getElementById('metric-a').textContent = summary.byVersion?.A || 0;
  document.getElementById('metric-b').textContent = summary.byVersion?.B || 0;
}

async function loadMetrics() {
  const response = await fetch('/api/metrics');
  const data = await response.json();
  renderMetricSummary(data.summary);
  renderMetricsTable(data.recentEvents || []);
}

async function trackInteraction(button) {
  if (!currentUser || !currentVariant) {
    setStatus('Sign in before recording interactions.', 'error');
    return;
  }

  const payload = {
    buttonId: button.dataset.button,
    buttonLabel: button.textContent.trim(),
    pageVersion: button.dataset.version,
    userName: currentUser.name,
    userEmail: currentUser.email,
  };

  const response = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    setStatus('The click could not be recorded on the server.', 'error');
    return;
  }

  const data = await response.json();
  renderMetricSummary(data.summary);
  await loadMetrics();
  setStatus(`Recorded click for ${payload.buttonLabel} on Version ${payload.pageVersion}.`, 'success');
}

async function restoreSession() {
  const response = await fetch('/api/session');
  const data = await response.json();

  if (data.authenticated && data.user && data.variant) {
    currentUser = data.user;
    updateProfile(data.user, data.variant);
    showVariant(data.variant);
    setStatus(`Restored sticky session for Variant ${data.variant}.`, 'success');
    await loadMetrics();
  } else {
    updateProfile(null, null);
    setStatus('Ready for sign-in.');
  }
}

signOutButton.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  currentVariant = null;
  variantA.classList.add('hidden');
  variantB.classList.add('hidden');
  homeView.classList.add('hidden');
  signOutButton.classList.add('hidden');
  updateProfile(null, null);
  renderMetricSummary({ totalClicks: 0, byVersion: { A: 0, B: 0 } });
  renderMetricsTable([]);
  setStatus('You have been signed out and the server session was cleared.');
});

document.querySelectorAll('.track-btn').forEach((button) => {
  button.addEventListener('click', () => trackInteraction(button));
});

window.addEventListener('load', async () => {
  initializeGoogleSignIn();
  await restoreSession();
});
