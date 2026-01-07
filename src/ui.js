
// Helper to show the Authentication Screen
export function showAuth() {
  const auth = document.getElementById("auth-section");
  const app = document.getElementById("app-section");
  const deck = document.getElementById("deck-page");
  const username = document.getElementById("username-section");

  // Only show the auth section, hide everything else
  if (auth) auth.hidden = false;
  if (app) app.hidden = true;
  if (deck) deck.hidden = true;
  if (username) username.hidden = true;
}

export function createDeckButton() {
  const userDecks = document.getElementById("user-decks");
  if (!userDecks) return;

  // Prevent duplicates
  if (document.getElementById("create-deck-btn")) return;

  const btn = document.createElement("div");
  btn.id = "create-deck-btn";
  btn.className = "deck-card create-deck";

  btn.innerHTML = `
    <span>+</span>
    <p>Create New Deck</p>
  `;

  // When clicked, trigger the 'create-deck' event
  // This event is listened to in src/decks.js
  btn.onclick = () => {
    document.dispatchEvent(new Event("create-deck"));
  };

  userDecks.prepend(btn);
}

export function showApp() {
  const auth = document.getElementById("auth-section");
  const app = document.getElementById("app-section");
  const deck = document.getElementById("deck-page");
  const username = document.getElementById("username-section");

  if (auth) auth.hidden = true;
  if (app) app.hidden = false;
  if (deck) deck.hidden = true;
  if (username) username.hidden = true;
}

// Helper to show the detailed Deck Page (Study Mode)
export function showDeckPage() {
  const auth = document.getElementById("auth-section");
  const app = document.getElementById("app-section");
  const deck = document.getElementById("deck-page");
  const username = document.getElementById("username-section");

  // Show deck page, hide others
  if (auth) auth.hidden = true;
  if (app) app.hidden = true;
  if (deck) deck.hidden = false;
  if (username) username.hidden = true;

  // Setup 'Back' button to return to dashboard
  document.getElementById("back-to-dashboard").onclick = () => {
    document.getElementById("deck-page").hidden = true;
    document.getElementById("app-section").hidden = false;
  };
}

export function showUsernameSetup() {
  const auth = document.getElementById("auth-section");
  const app = document.getElementById("app-section");
  const deck = document.getElementById("deck-page");
  const username = document.getElementById("username-section");

  if (auth) auth.hidden = true;
  if (app) app.hidden = true;
  if (deck) deck.hidden = true;
  if (username) username.hidden = false;
}

export function hideUsernameSetup() {
  const username = document.getElementById("username-section");
  if (username) username.hidden = true;
}

export function initProfileDropdown() {
  const profileImg = document.querySelector(".profile img");
  const profileMenu = document.querySelector(".profile-menu");

  if (!profileImg || !profileMenu) return;

  profileImg.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = profileMenu.style.display === "block";
    profileMenu.style.display = isVisible ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!profileMenu.contains(e.target) && e.target !== profileImg) {
      profileMenu.style.display = "none";
    }
  });
}
