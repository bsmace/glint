/**
 * Glint - Background Service Worker
 * Handles extension lifecycle and optional Chrome AI API bridging
 */

console.log('[Glint] Background service worker started');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Glint] Extension installed');
    chrome.tabs.create({ url: 'https://chat.openai.com' });
  } else if (details.reason === 'update') {
    console.log('[Glint] Extension updated:', details.previousVersion);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VERSION') {
    sendResponse({ version: chrome.runtime.getManifest().version });
  }
  return true;
});

// Keep service worker alive during development
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener(() => {
    // Just keeping the worker alive
  });
}