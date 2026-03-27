let currentFile = null;
let currentResult = null;
const scannedImages = [];

// ─── AUTH ───────────────────────────────────────────────
function openModal(type) {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('authModal').classList.add('active');
  switchModal(type);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById('authModal').classList.remove('active');
}
function switchModal(type) {
  document.getElementById('loginForm').style.display  = type === 'login'  ? 'block' : 'none';
  document.getElementById('signupForm').style.display = type === 'signup' ? 'block' : 'none';
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('signupError').classList.remove('show');
}

function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  if (!email || !password) { showError(errEl, 'Please fill in all fields.'); return; }
  const accounts = JSON.parse(localStorage.getItem('safra_accounts') || '{}');
  if (!accounts[email]) { showError(errEl, 'No account found. Please sign up first.'); return; }
  const user = { name: accounts[email].name, email };
  localStorage.setItem('safra_user', JSON.stringify(user));
  closeModal();
  updateNavUser(user);
}

function doSignup() {
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errEl    = document.getElementById('signupError');
  if (!name || !email || !password) { showError(errEl, 'Please fill in all fields.'); return; }
  if (password.length < 6) { showError(errEl, 'Password must be at least 6 characters.'); return; }
  const accounts = JSON.parse(localStorage.getItem('safra_accounts') || '{}');
  if (accounts[email]) { showError(errEl, 'Account already exists. Please log in.'); return; }
  accounts[email] = { name, password };
  localStorage.setItem('safra_accounts', JSON.stringify(accounts));
  const user = { name, email };
  localStorage.setItem('safra_user', JSON.stringify(user));
  closeModal();
  updateNavUser(user);
}

function logout() {
  localStorage.removeItem('safra_user');
  document.getElementById('navUser').style.display = 'none';
  document.getElementById('navAuth').style.display = 'flex';
}

function updateNavUser(user) {
  document.getElementById('navAuth').style.display = 'none';
  document.getElementById('navUser').style.display = 'flex';
  document.getElementById('userName').textContent = user.name.split(' ')[0];
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.add('show');
}

// Restore session on load
window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('safra_user');
  if (stored) updateNavUser(JSON.parse(stored));
});

// ─── NAVIGATION ─────────────────────────────────────────
function scrollToScan() {
  document.getElementById('scan').scrollIntoView({ behavior: 'smooth' });
}
function scrollToDashboard() {
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

// ─── FILE HANDLING ───────────────────────────────────────
function handleDrop(event) {
  event.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) loadFile(file);
}

function loadFile(file) {
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('previewImg');
    img.src = e.target.result;
    img.style.display = 'block';
    document.getElementById('uploadContent').style.display = 'none';
    document.getElementById('scanButtons').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

// ─── SCAN ────────────────────────────────────────────────
async function scanImage() {
  if (!currentFile) return alert('Please upload an image first.');

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('resultsContent').style.display = 'none';
  document.getElementById('resultsBox').style.alignItems = 'center';

  const formData = new FormData();
  formData.append('image', currentFile);

  try {
    const res = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    currentResult = data;
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsBox').style.alignItems = 'flex-start';
    showResults(data);
    scannedImages.unshift({ file: currentFile, result: data, src: document.getElementById('previewImg').src });
    updateDashboard();
  } catch (err) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    alert('Error scanning image. Is the backend running?');
  }
}

function showResults(data) {
  const previewSrc = document.getElementById('previewImg').src;

  const matchesHtml = (data.similar_matches || []).map(m => `
    <div class="match-item">
      <span>📍 ${m.platform}</span>
      <span style="color:#9ca3af">${m.confidence}% match</span>
    </div>`).join('') || '<p style="color:#6b7280;font-size:13px">No similar matches found.</p>';

  const misuseHtml = (data.misuse_types || []).map(m => `
    <div class="misuse-item">
      <strong>${m.type}</strong>
      <p style="color:#9ca3af;font-size:12px;margin-top:4px">${m.description} — ${Math.round(m.probability * 100)}% probability</p>
    </div>`).join('');

  const tipsHtml = (data.safety_tips || []).map(t => `
    <div class="tip-item">
      <strong>${t.title}</strong>
      <p style="color:#9ca3af;font-size:12px;margin-top:4px">${t.description}</p>
    </div>`).join('');

  const factorsHtml = (data.risk_factors || []).map(f => `<span class="factor-tag">⚠ ${f}</span>`).join('');

  document.getElementById('resultsContent').innerHTML = `
    <div class="result-section">
      <span class="risk-badge risk-${data.risk_level}">${data.risk_level} RISK</span>
      <h4>RISK SCORE</h4>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div class="score-bar-bg" style="flex:1">
          <div class="score-bar" id="scoreBar" style="width:0%"></div>
        </div>
        <span style="font-weight:700;color:#fff;min-width:36px">${data.risk_score}%</span>
      </div>
    </div>

    <div class="result-section">
      <h4>RISK FACTORS</h4>
      ${factorsHtml}
    </div>

    <div class="result-section">
      <h4>SIMILAR MATCHES FOUND</h4>
      ${matchesHtml}
    </div>

    <div class="result-section">
      <h4>MISUSE SIMULATION PREVIEW</h4>
      <p style="color:#6b7280;font-size:12px;margin-bottom:8px">This is how your image could be manipulated or misused</p>
      <img src="${previewSrc}" class="blur-preview" alt="misuse preview"/>
    </div>

    <div class="result-section">
      <h4>POTENTIAL MISUSE TYPES</h4>
      ${misuseHtml}
    </div>

    <div class="result-section">
      <h4>AI SAFETY ADVISOR</h4>
      ${tipsHtml}
    </div>

    <div id="protectResult"></div>
  `;

  document.getElementById('resultsContent').style.display = 'block';
  setTimeout(() => {
    const bar = document.getElementById('scoreBar');
    if (bar) bar.style.width = data.risk_score + '%';
  }, 100);
}

// ─── PROTECT ─────────────────────────────────────────────
async function protectImage() {
  if (!currentFile) return alert('Please upload an image first.');

  const formData = new FormData();
  formData.append('image', currentFile);
  if (currentResult) formData.append('image_id', currentResult.image_id || '');

  try {
    const res = await fetch('/protect', { method: 'POST', body: formData });
    const data = await res.json();
    const protectDiv = document.getElementById('protectResult');
    if (protectDiv) {
      protectDiv.innerHTML = `
        <div class="protect-success">
          🛡️ <strong>Image Protected!</strong><br/>
          Fingerprint ID: <code>${data.fingerprint_id}</code><br/>
          <small style="color:#9ca3af">${data.message}</small>
        </div>`;
    }
    updateDashboard();
  } catch (err) {
    alert('Error protecting image. Is the backend running?');
  }
}

// ─── DASHBOARD ───────────────────────────────────────────
function updateDashboard() {
  document.getElementById('statTotal').textContent = scannedImages.length;
  const protected_ = scannedImages.filter(i => i.result && i.result.protected).length;
  const highRisk   = scannedImages.filter(i => i.result && (i.result.risk_level === 'HIGH' || i.result.risk_level === 'CRITICAL')).length;
  const alerts     = scannedImages.filter(i => i.result && i.result.risk_score > 50).length;

  document.getElementById('statProtected').textContent = protected_;
  document.getElementById('statHighRisk').textContent  = highRisk;
  document.getElementById('statAlerts').textContent    = alerts;

  const riskColor = { LOW: '#4ade80', MEDIUM: '#facc15', HIGH: '#fb923c', CRITICAL: '#f87171' };
  const grid = document.getElementById('imagesGrid');
  grid.innerHTML = scannedImages.map(item => `
    <div class="image-card">
      <img src="${item.src}" alt="${item.file.name}"/>
      <div class="image-card-info">
        <div class="name">${item.file.name}</div>
        <div class="meta">Score: ${item.result.risk_score}%</div>
        <span class="badge risk-${item.result.risk_level}" style="color:${riskColor[item.result.risk_level]}">${item.result.risk_level}</span>
      </div>
    </div>`).join('');
}