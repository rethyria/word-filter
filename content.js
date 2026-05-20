// Word Filter Content Script
let compiledRules = [];
let isEnabled = true;
let isFiltering = false;

// --- Rule loading & compilation ---

async function loadFilterRules() {
  try {
    const result = await browser.storage.local.get('filterRules');
    let rules = result.filterRules;
    if (!rules || rules.length === 0) {
      rules = DEFAULT_RULES;
      await browser.storage.local.set({ filterRules: rules });
    }
    compiledRules = compileRules(rules);
  } catch (error) {
    console.error('Error loading filter rules:', error);
    compiledRules = [];
  }
}

async function loadEnabledState() {
  try {
    const result = await browser.storage.local.get('isEnabled');
    isEnabled = result.isEnabled !== false;
  } catch (error) {
    isEnabled = true;
  }
}

function createWordPattern(findWord, isRemoval) {
  const escapedWord = findWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (isRemoval) {
    return new RegExp('\\s?\\b' + escapedWord + '\\b', 'gi');
  }
  return new RegExp('\\b' + escapedWord + '\\b', 'gi');
}

function compileRules(rules) {
  return rules
    .filter(rule => rule.enabled !== false && rule.find && rule.find.trim())
    .map(rule => {
      const replacement = rule.replace || '';
      return {
        pattern: createWordPattern(rule.find, replacement === ''),
        replacement,
      };
    });
}

// --- DOM traversal ---

const SKIP_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'KBD', 'SAMP'];

const SKIP_CLASSES = [
  'blob-code', 'highlight', 'CodeMirror', 'ace_editor',
  'monaco-editor', 'hljs', 'prism', 'roslyn-highlight',
  'code-block', 'code-block-wrapper',
];

function shouldSkip(element) {
  if (SKIP_TAGS.includes(element.tagName)) return true;
  if (element.classList) {
    for (const cls of SKIP_CLASSES) {
      if (element.classList.contains(cls)) return true;
    }
  }
  return false;
}

function hasSkippedAncestor(element) {
  let current = element;
  while (current && current !== document.body) {
    if (shouldSkip(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function collectTextNodes(root) {
  const nodes = [];
  function walk(element) {
    if (!element || !element.childNodes) return;
    if (shouldSkip(element)) return;
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        nodes.push(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  }
  walk(root);
  return nodes;
}

// --- Text replacement ---

function applyRules(textNode, rules) {
  let text = textNode.textContent;
  const original = text;
  for (const { pattern, replacement } of rules) {
    text = text.replace(pattern, replacement);
  }
  if (text !== original) {
    textNode.textContent = text.replace(/\s{2,}/g, ' ');
  }
}

// --- Orchestration ---

function filterContent(element) {
  if (!isEnabled || compiledRules.length === 0) return;
  // Ancestor check handles the MutationObserver case where element
  // itself may be inside a code block we haven't descended through.
  if (hasSkippedAncestor(element)) return;

  isFiltering = true;
  const textNodes = collectTextNodes(element);
  for (const node of textNodes) {
    applyRules(node, compiledRules);
  }
  isFiltering = false;
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled || isFiltering) return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            filterContent(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            filterContent(node.parentNode);
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function init() {
  await Promise.all([loadFilterRules(), loadEnabledState()]);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      filterContent(document.body);
      setupMutationObserver();
    });
  } else {
    filterContent(document.body);
    setupMutationObserver();
  }

  browser.storage.onChanged.addListener((changes) => {
    let needsRefilter = false;
    if (changes.filterRules) {
      compiledRules = compileRules(changes.filterRules.newValue || []);
      needsRefilter = true;
    }
    if (changes.isEnabled) {
      isEnabled = changes.isEnabled.newValue !== false;
      needsRefilter = true;
    }
    if (needsRefilter) filterContent(document.body);
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleFilter') {
    isEnabled = message.enabled;
    filterContent(document.body);
    sendResponse({ success: true });
  }
  return true;
});

init();
