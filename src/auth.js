import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  updateProfile
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";
import {
  showAuth, showApp, showUsernameSetup,
  hideUsernameSetup,
  createDeckButton
} from "./ui.js";


// INIT AUTH 
export function initAuth() {

  // Inputs and buttons
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const deleteBtn = document.getElementById("delete-account-btn");

  // SIGN UP LOGIC
  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
      clearAuthError(); // Hide previous errors
      try {
        // create user in Firebase Auth
        const credentials = await createUserWithEmailAndPassword(
          auth,
          emailInput.value,
          passwordInput.value
        );

        // Immediately show username setup screen
        showUsernameSetup();
        initUsernameForm(credentials.user);

      } catch (err) {
        showAuthError(err.message);
      }
    });
  }


  // LOGIN
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      clearAuthError();
      try {
        await signInWithEmailAndPassword(
          auth,
          emailInput.value,
          passwordInput.value
        );
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }

  // LOGOUT 
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => signOut(auth));
  }

  // DELETE ACCOUNT
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return;

      const ok = confirm(
        "This will permanently delete your account and all data. Continue?"
      );

      if (!ok) return;

      try {
        await updateProfile(auth.currentUser, {
          displayName: username
        });
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        alert("Account deleted successfully");
      }
      catch (err) {
        alert("Please login again to delete your account.");
      }
    });
  }

  // AUTH STATE
  onAuthStateChanged(auth, async user => {
    if (!user) {
      showAuth();
      return;
    }

    // Check for user profile in database
    // Check for user profile in database
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // If user profile exists, then go to app
    if (snap.exists()) {
      const { username } = snap.data();
      setUsernameUI(username);
      hideUsernameSetup();
      createDeckButton();
      showApp();

    }

    // If profile does not exist,then do nothing here
  });

}

// USERNAME SETUP 
function initUsernameForm(user) {
  const form = document.getElementById("username-form");
  const input = document.getElementById("username-input");
  const error = document.getElementById("username-error");

  if (!form || !input) return;

  form.onsubmit = async e => {
    e.preventDefault(); // Stop page reload

    const username = input.value.trim();

    if (username.length < 3) {
      if (error) error.innerText = "Username must be at least 3 characters";
      return;
    }

    await setDoc(doc(db, "users", user.uid), {
      username,
      email: user.email,
      createdAt: serverTimestamp()
    });

    await updateProfile(auth.currentUser, {
      displayName: username
    });

    setUsernameUI(username);
    hideUsernameSetup();
    createDeckButton();
    showApp();


  };
}

// UI 
function setUsernameUI(username) {
  const displayUsername = document.getElementById("display-username");
  const welcomeUsername = document.getElementById("welcome-username");

  if (displayUsername) displayUsername.innerText = username;
  if (welcomeUsername) welcomeUsername.innerText = username;
}

function showAuthError(message) {
  const el = document.getElementById("auth-error");
  if (el) el.innerText = message;
}

function clearAuthError() {
  const el = document.getElementById("auth-error");
  if (el) el.innerText = "";
}
