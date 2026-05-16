// Options Page Script
const rulesBody = document.getElementById('rulesBody');
const emptyState = document.getElementById('emptyState');
const addRuleBtn = document.getElementById('addRuleBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');

const DEFAULT_RULES = [
 { find: 'bro', replace: '', enabled: true },
 { find: 'bruh', replace: '', enabled: true },
];

// Load filter rules from storage
async function loadRules() {
  try {
    const result = await browser.storage.local.get('filterRules');
    let rules = result.filterRules;

    // If storage is empty, initialize with defaults AND SAVE THEM
    if (!rules || rules.length === 0) {
      console.log('No rules found. Initializing defaults.');
      rules = DEFAULT_RULES;
      
      // CRITICAL: Save defaults immediately so content scripts pick them up
      await browser.storage.local.set({ filterRules: rules });
    }

    renderRules(rules);
  } catch (error) {
    console.error('Error loading rules:', error);
    showStatus('Error loading settings. Using defaults.', 'error');
    renderRules(DEFAULT_RULES);
    // Also save defaults on error to prevent future issues
    browser.storage.local.set({ filterRules: DEFAULT_RULES }).catch(() => {});
  }
}

// Helper to create input safely
function createInput(type, className, value, placeholder) {
 const input = document.createElement('input');
 input.type = type;
  input.className = className;
 input.value = value || '';
 input.placeholder = placeholder || '';
 return input;
}

// Render rules table safely (No innerHTML)
function renderRules(rules) {
 rulesBody.innerHTML = '';
  if (rules.length === 0) {
 emptyState.style.display = 'block';
 return;
 }
  emptyState.style.display = 'none';
  rules.forEach((rule, index) => {
 const row = document.createElement('tr');
  // Checkbox Column
 const tdCheck = document.createElement('td');
 const checkbox = document.createElement('input');
 checkbox.type = 'checkbox';
 checkbox.className = 'enabled';
 checkbox.checked = rule.enabled !== false;
 tdCheck.appendChild(checkbox);
 row.appendChild(tdCheck);
  // Find Column
 const tdFind = document.createElement('td');
 const inputFind = createInput('text', 'find', rule.find, 'Word to find');
 tdFind.appendChild(inputFind);
 row.appendChild(tdFind);
  // Replace Column
 const tdReplace = document.createElement('td');
 const inputReplace = createInput('text', 'replace', rule.replace || '', 'Replacement (leave empty to remove)');
 tdReplace.appendChild(inputReplace);
 row.appendChild(tdReplace);
  // Actions Column
 const tdActions = document.createElement('td');
 tdActions.className = 'actions';
 const deleteBtn = document.createElement('button');
 deleteBtn.className = 'btn-danger delete';
 deleteBtn.textContent = 'Delete';
 deleteBtn.dataset.index = index;
 tdActions.appendChild(deleteBtn);
 row.appendChild(tdActions);
  rulesBody.appendChild(row);
 });
  // Add event listeners to delete buttons
 document.querySelectorAll('.delete').forEach(btn => {
 btn.addEventListener('click', (e) => {
 const index = parseInt(e.target.dataset.index);
 deleteRule(index);
 });
 });
}

// Get current rules from table
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

// Delete a rule
function deleteRule(index) {
 const rows = rulesBody.querySelectorAll('tr');
 if (rows[index]) {
 rows[index].remove();
 renderRules(getRulesFromTable());
 }
}

// Add a new rule
function addRule() {
 const rules = getRulesFromTable();
 rules.push({ find: '', replace: '', enabled: true });
 renderRules(rules);
}

// Save rules
async function saveRules() {
 const rules = getRulesFromTable();
  if (rules.length === 0) {
 showStatus('No rules to save.', 'error');
 return;
 }
  try {
 await browser.storage.local.set({ filterRules: rules });
 showStatus('✓ Saved ' + rules.length + ' rule(s)! Changes apply to new pages.', 'success');
  // Notify content scripts
 browser.runtime.sendMessage({ action: 'reloadRules' }).catch(() => {});
 } catch (error) {
 console.error('Error saving rules:', error);
 showStatus('✗ Error saving. Try again.', 'error');
 }
}

// Reset to defaults
function resetToDefaults() {
 if (confirm('Reset to default rules? This will overwrite your current settings.')) {
 renderRules(DEFAULT_RULES);
 saveRules();
 }
}

// Show status message
function showStatus(message, type) {
 status.textContent = message;
 status.className = type;
  if (type === 'success') {
 setTimeout(() => {
 status.className = '';
 }, 3000);
 }
}

// Event listeners
loadRules();
addRuleBtn.addEventListener('click', addRule);
saveBtn.addEventListener('click', saveRules);
resetBtn.addEventListener('click', resetToDefaults);