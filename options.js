// Options Page Script — thin adapter over shared RuleManager
const manager = createRuleManager({
  rulesBody: document.getElementById('rulesBody'),
  emptyState: document.getElementById('emptyState'),
  statusEl: document.getElementById('status'),
  deleteLabel: 'Delete',
  findPlaceholder: 'Word to find',
  replacePlaceholder: 'Replacement (leave empty to remove)',
});

manager.load();

document.getElementById('addRuleBtn').addEventListener('click', () => manager.addRule());
document.getElementById('saveBtn').addEventListener('click', () => manager.save());
document.getElementById('resetBtn').addEventListener('click', () => manager.resetToDefaults());
