// Word Filter Content Script
let filterRules = [];
let isEnabled = true;

async function loadFilterRules() {
  try {
    const result = await browser.storage.local.get('filterRules');
    filterRules = result.filterRules || [];
  } catch (error) {
    console.error('Error loading filter rules:', error);
    filterRules = [];
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

function filterContent(element) {
  if (!isEnabled || !element || !element.childNodes) return;
  
  for (let child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      let originalText = child.textContent;
      let newText = originalText;
      
      for (let rule of filterRules) {
        if (rule.enabled !== false && rule.find && rule.find.trim()) {
          const replacement = rule.replace || '';
          const isRemoval = replacement === '';
          const pattern = createWordPattern(rule.find, isRemoval);
          newText = newText.replace(pattern, replacement);
        }
      }
      
      newText = newText.replace(/\s{2,}/g, ' ');
      
      if (newText !== originalText) {
        child.textContent = newText;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'];
      if (!skipTags.includes(child.tagName)) {
        filterContent(child);
      }
    }
  }
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            filterContent(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            filterContent(node.parentNode);
          }
        }
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function init() {
  await loadFilterRules();
  await loadEnabledState();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      filterContent(document.body);
      setupMutationObserver();
    });
  } else {
    filterContent(document.body);
    setupMutationObserver();
  }
  
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (changes.filterRules) {
      filterRules = changes.filterRules.newValue || [];
      filterContent(document.body);
    }
    if (changes.isEnabled) {
      isEnabled = changes.isEnabled.newValue !== false;
      filterContent(document.body);
    }
  });
}

// Listen for messages from popup to toggle
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleFilter') {
    isEnabled = message.enabled;
    filterContent(document.body);
    sendResponse({ success: true });
  }
  return true;
});

init();