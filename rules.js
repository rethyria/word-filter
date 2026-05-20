// Shared Rule Management Module — requires defaults.js loaded first
function createRuleManager({
  rulesBody,
  emptyState,
  statusEl,
  deleteLabel = '\u00d7',
  findPlaceholder = 'Word',
  replacePlaceholder = 'Replace',
  statusBaseClass = '',
}) {
  async function load() {
    try {
      const result = await browser.storage.local.get('filterRules');
      let rules = result.filterRules;

      if (!rules || rules.length === 0) {
        rules = DEFAULT_RULES;
        await browser.storage.local.set({ filterRules: rules });
      }

      render(rules);
      return rules;
    } catch (error) {
      console.error('Error loading rules:', error);
      showStatus('Error loading settings', 'error');
      render(DEFAULT_RULES);
      browser.storage.local.set({ filterRules: DEFAULT_RULES }).catch(() => {});
      return DEFAULT_RULES;
    }
  }

  function render(rules) {
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
      inputFind.placeholder = findPlaceholder;
      tdFind.appendChild(inputFind);
      row.appendChild(tdFind);

      const tdReplace = document.createElement('td');
      const inputReplace = document.createElement('input');
      inputReplace.type = 'text';
      inputReplace.className = 'replace';
      inputReplace.value = rule.replace || '';
      inputReplace.placeholder = replacePlaceholder;
      tdReplace.appendChild(inputReplace);
      row.appendChild(tdReplace);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger delete';
      delBtn.textContent = deleteLabel;
      delBtn.dataset.index = index;
      tdActions.appendChild(delBtn);
      row.appendChild(tdActions);

      rulesBody.appendChild(row);
    });

    rulesBody.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteRule(parseInt(e.target.dataset.index));
      });
    });
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
      render(getRulesFromTable());
    }
  }

  function addRule() {
    const rules = getRulesFromTable();
    rules.push({ find: '', replace: '', enabled: true });
    render(rules);
  }

  async function save() {
    const rules = getRulesFromTable();

    if (rules.length === 0) {
      showStatus('No rules to save.', 'error');
      return;
    }

    try {
      await browser.storage.local.set({ filterRules: rules });
      showStatus('\u2713 Saved ' + rules.length + ' rule(s)', 'success');
    } catch (error) {
      console.error('Error saving rules:', error);
      showStatus('\u2717 Error saving', 'error');
    }
  }

  async function resetToDefaults() {
    if (confirm('Reset to default rules?')) {
      render(DEFAULT_RULES);
      await browser.storage.local.set({ filterRules: DEFAULT_RULES });
      showStatus('\u2713 Reset to defaults', 'success');
    }
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = statusBaseClass ? statusBaseClass + ' ' + type : type;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = statusBaseClass;
      }, 2000);
    }
  }

  return { load, addRule, save, resetToDefaults, showStatus };
}
