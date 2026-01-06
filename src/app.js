
import './firebase.js';

// Core modules
import { initAuth } from './auth.js';
import { initDecks } from './decks.js';
import './ui.js';
import "./cards.js";



function initApp() {
  console.log('Flashcard Exchange Web App Starting...');
  initAuth();     
  initDecks();    
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
