// Popup Script
const rulesBody = document.getElementById('rulesBody');
const emptyState = document.getElementById('emptyState');
const addRuleBtn = document.getElementById('addRuleBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const refreshBtn = document.getElementById('refreshBtn');
const enableToggle = document.getElementById('enableToggle');
const status = document.getElementById('status');

const DEFAULT_RULES = [
  { find: 'bro', replace: '', enabled: true },
  { find: 'bruh', replace: '', enabled: true }
];

async function loadRules() {
  try {
    const result = await browser.storage.local.get('filterRules');
    let rules = result.filterRules;

    if (!rules || rules.length === 0) {
      console.log('No rules found in popup. Initializing defaults.');
      rules = DEFAULT_RULES;
      
      // CRITICAL: Save defaults immediately
      await browser.storage.local.set({ filterRules: rules });
    }

    renderRules(rules);
    updateStatus(rules.length);
  } catch (error) {
    console.error('Error loading rules:', error);
    showStatus('Error loading settings', 'error');
    renderRules(DEFAULT_RULES);
    updateStatus(DEFAULT_RULES.length);
    browser.storage.local.set({ filterRules: DEFAULT_RULES }).catch(() => {});
  }
}

async function loadEnabledState() {
  try {
    const result = await browser.storage.local.get('isEnabled');
    enableToggle.checked = result.isEnabled !== false;
  } catch (error) {
    enableToggle.checked = true;
  }
}

function renderRules(rules) {
  rulesBody.innerHTML = '';
  
  if (rules.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  rules.forEach((rule, index) => {
    const row = document.createElement('tr');
    
    const tdCheck = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'enabled';
    checkbox.checked = rule.enabled !== false;
    tdCheck.appendChild(checkbox);
    row.appendChild(tdCheck);
    
    const tdFind = document.createElement('td');
    const inputFind = document.createElement('input');
    inputFind.type = 'text';
    inputFind.className = 'find';
    inputFind.value = rule.find || '';
    inputFind.placeholder = 'Word';
    tdFind.appendChild(inputFind);
    row.appendChild(tdFind);
    
    const tdReplace = document.createElement('td');
    const inputReplace = document.createElement('input');
    inputReplace.type = 'text';
    inputReplace.className = 'replace';
    inputReplace.value = rule.replace || '';
    inputReplace.placeholder = 'Replace';
    tdReplace.appendChild(inputReplace);
    row.appendChild(tdReplace);
    
    const tdActions = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger delete';
    deleteBtn.textContent = '×';
    deleteBtn.dataset.index = index;
    tdActions.appendChild(deleteBtn);
    row.appendChild(tdActions);
    
    rulesBody.appendChild(row);
  });
  
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteRule(index);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRulesFromTable() {
  const rows = rulesBody.querySelectorAll('tr');
  const rules = [];
  
  rows.forEach(row => {
    const enabled = row.querySelector('.enabled').checked;
    const find = row.querySelector('.find').value.trim();
    const replace = row.querySelector('.replace').value.trim();
    
    if (find) {
      rules.push({ find, replace, enabled });
    }
  });
  
  return rules;
}

function deleteRule(index) {
  const rows = rulesBody.querySelectorAll('tr');
  if (rows[index]) {
    rows[index].remove();
    renderRules(getRulesFromTable());
  }
}

function addRule() {
  const rules = getRulesFromTable();
  rules.push({ find: '', replace: '', enabled: true });
  renderRules(rules);
}

async function saveRules() {
  const rules = getRulesFromTable();
  
  if (rules.length === 0) {
    showStatus('No rules to save.', 'error');
    return;
  }
  
  try {
    await browser.storage.local.set({ filterRules: rules });
    showStatus('✓ Saved ' + rules.length + ' rule(s)', 'success');
    
    browser.runtime.sendMessage({ action: 'reloadRules' }).catch(() => {});
  } catch (error) {
    console.error('Error saving rules:', error);
    showStatus('✗ Error saving', 'error');
  }
}

function resetToDefaults() {
  if (confirm('Reset to default rules?')) {
    renderRules(DEFAULT_RULES);
    saveRules();
  }
}

async function toggleFilter(enabled) {
  try {
    await browser.storage.local.set({ isEnabled: enabled });
    
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { action: 'toggleFilter', enabled: enabled });
    }
    
    showStatus(enabled ? 'Filter enabled' : 'Filter disabled', 'success');
  } catch (error) {
    console.error('Error toggling filter:', error);
  }
}

function updateStatus(count) {
  status.textContent = count + ' rule(s) configured';
  status.className = 'status';
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = 'status ' + type;
  
  if (type === 'success') {
    setTimeout(() => {
      status.className = 'status';
    }, 2000);
  }
}

async function refreshPage() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      browser.tabs.reload(tabs[0].id);
    }
  } catch (error) {
    console.error('Error refreshing tab:', error);
  }
}

// Event listeners
loadRules();
loadEnabledState();

addRuleBtn.addEventListener('click', addRule);
saveBtn.addEventListener('click', saveRules);
resetBtn.addEventListener('click', resetToDefaults);
refreshBtn.addEventListener('click', refreshPage);

enableToggle.addEventListener('change', (e) => {
  toggleFilter(e.target.checked);
});