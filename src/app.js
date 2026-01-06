
import './firebase.js';

// Core modules
import { initAuth } from './auth.js';
import { initDecks } from './decks.js';
import { initProfileDropdown } from './ui.js';
import { initStudyControls } from "./cards.js";
import "./cards.js";



function initApp() {
  console.log('Flashcard Exchange Web App Starting...');
  initAuth();
  initDecks();
  initStudyControls();
  initProfileDropdown();

  // Dynamic import or attached to decks.js? decks.js exports it.
  import('./decks.js').then(m => {
    if (m.initHistoryDropdown) m.initHistoryDropdown();
    if (m.initSearchAddon) m.initSearchAddon();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
