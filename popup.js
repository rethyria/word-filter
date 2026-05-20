// Popup Script — thin adapter over shared RuleManager
const manager = createRuleManager({
  rulesBody: document.getElementById('rulesBody'),
  emptyState: document.getElementById('emptyState'),
  statusEl: document.getElementById('status'),
  statusBaseClass: 'status',
});

const enableToggle = document.getElementById('enableToggle');

async function loadEnabledState() {
  try {
    const result = await browser.storage.local.get('isEnabled');
    enableToggle.checked = result.isEnabled !== false;
  } catch (error) {
    enableToggle.checked = true;
  }
}

async function toggleFilter(enabled) {
  try {
    await browser.storage.local.set({ isEnabled: enabled });
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { action: 'toggleFilter', enabled });
    }
    manager.showStatus(enabled ? 'Filter enabled' : 'Filter disabled', 'success');
  } catch (error) {
    console.error('Error toggling filter:', error);
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

manager.load().then(rules => {
  document.getElementById('status').textContent = rules.length + ' rule(s) configured';
});
loadEnabledState();

document.getElementById('addRuleBtn').addEventListener('click', () => manager.addRule());
document.getElementById('saveBtn').addEventListener('click', () => manager.save());
document.getElementById('resetBtn').addEventListener('click', () => manager.resetToDefaults());
document.getElementById('refreshBtn').addEventListener('click', refreshPage);
enableToggle.addEventListener('change', (e) => toggleFilter(e.target.checked));
