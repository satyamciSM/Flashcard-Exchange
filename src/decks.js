
import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

import { showDeckPage } from "./ui.js";

import {
  loadCards,
  openAddCardModal
} from "./cards.js";


// CREATE DECK POPUP
document.addEventListener("create-deck", () => {
  const modal = document.getElementById("create-deck-modal");
  const titleInput = document.getElementById("create-deck-title");
  const descInput = document.getElementById("create-deck-description");
  const confirmBtn = document.getElementById("create-deck-confirm");
  const cancelBtn = document.getElementById("create-deck-cancel");

  titleInput.value = "";
  descInput.value = "";
  document.getElementById("create-deck-tags").value = "";

  modal.classList.remove("hidden");

  confirmBtn.onclick = async () => {
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const tagsStr = document.getElementById("create-deck-tags").value.trim();
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(t => t) : [];

    if (!title) {
      alert("Deck title is required");
      return;
    }

    try {
      await addDoc(collection(db, "decks"), {
        title,
        description,
        tags,
        ownerId: auth.currentUser.uid,
        isPublic: false,
        likes: {},
        createdAt: serverTimestamp()
      });

      modal.classList.add("hidden");
    } catch (err) {
      alert("Failed to create deck");
      console.error(err);
    }
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
});

export function initDecks() {
  const publicDecks = document.getElementById("public-decks");
  const userDecks = document.getElementById("user-decks");

  // USER OWNED DECKS  
  if (userDecks) {
    onAuthStateChanged(auth, user => {
      if (!user) return;

      const userQuery = query(
        collection(db, "decks"),
        where("ownerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      onSnapshot(userQuery, snapshot => {
        const existingDecks = userDecks.querySelectorAll(
          ".deck-card:not(#create-deck-btn)"
        );
        existingDecks.forEach(deck => deck.remove());

        snapshot.forEach(docSnap => {
          // Cache for search (check duplicates)
          const exists = __publicDecksSearchCache.find(d => d.id === docSnap.id);
          if (!exists) {
            __publicDecksSearchCache.push({ id: docSnap.id, ...docSnap.data() });
          }

          renderDeck(docSnap, userDecks);
        });
      });
    });
  }

  // PUBLIC DECKS
  const loadPublicDecks = () => {
    const sortValue = document.getElementById("sort-select").value;

    // Use client-side sorting for simplicity since we want to toggle quickly
    const q = query(
      collection(db, "decks"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc") // Fetch mostly recent first
    );

    onSnapshot(q, snapshot => {
      __publicDecksSearchCache = []; // reset cache

      snapshot.forEach(docSnap => {
        __publicDecksSearchCache.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      renderPublicDecks(__publicDecksSearchCache, sortValue);
    });
  };

  loadPublicDecks();

  // Sort Change Listener
  document.getElementById("sort-select").addEventListener("change", (e) => {
    renderPublicDecks(__publicDecksSearchCache, e.target.value);
  });
}

function renderPublicDecks(decksData, sortMode) {
  const publicDecks = document.getElementById("public-decks");
  publicDecks.innerHTML = "";

  let sortedDecks = [...decksData];

  if (sortMode === "popular") {
    // Sort by number of likes
    sortedDecks.sort((a, b) => {
      const likesA = a.likes ? Object.keys(a.likes).length : 0;
      const likesB = b.likes ? Object.keys(b.likes).length : 0;
      return likesB - likesA;
    });
  } else {
    // Default: Sort by date (already fetched in desc order, but ensure consistent)
    sortedDecks.sort((a, b) => b.createdAt - a.createdAt);
  }

  sortedDecks.forEach(deckData => {
    // Construct dummy docSnap to reuse renderDeck
    const docSnap = {
      id: deckData.id,
      data: () => deckData
    };
    renderDeck(docSnap, publicDecks);
  });



  // CREATE DECK  
  const createBtn = document.getElementById("create-deck-btn");
  if (!createBtn) return;

  createBtn.addEventListener("click", () => {
    document.dispatchEvent(new Event("create-deck"));
  });

  // //SEARCH SYSTEM
  // const searchInput = document.getElementById("search-input");
  // const overlay = document.getElementById("search-overlay");
  // const results = document.getElementById("search-results");
  // const dashboard = document.getElementById("app-section");

  // searchInput.addEventListener("input", () => {
  //   const query = searchInput.value.trim().toLowerCase();

  //   if (!query) {
  //     overlay.classList.add("hidden");
  //     dashboard.classList.remove("dimmed");
  //     results.innerHTML = "";
  //     return;
  //   }

  //   results.innerHTML = "";

  //   matches.forEach(deck => {
  //     renderDeckFromSearch(deck, results);
  //   });

  //   overlay.classList.remove("hidden");
  //   dashboard.classList.add("dimmed");
  // });

}

function renderDeck(docSnap, container) {
  const deck = docSnap.data();
  const user = auth.currentUser;

  const likeCount = deck.likes ? Object.keys(deck.likes).length : 0;
  const userLiked = user && deck.likes?.[user.uid];

  const isOwner = user && deck.ownerId === user.uid;


  const el = document.createElement("div");
  el.className = "deck-card";

  el.innerHTML = `
    ${isOwner ? `
      <div class="deck-menu">
        <button class="menu-btn">⋮</button>
        <div class="menu-dropdown">
          <button class="edit-deck">Edit deck</button>
          <button class="delete-deck danger">Delete deck</button>
        </div>
      </div>
    ` : ""}

    <button class="bookmark">🔖</button>
    <h4>${deck.title}</h4>
    <p>${deck.description}</p>
    ${deck.tags && deck.tags.length ? `
    <div class="deck-tags" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px;">
      ${deck.tags.map(tag => `<span style="background: #eef2ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">#${tag}</span>`).join("")}
    </div>` : ""}

    <div class="deck-actions">
      <span class="like-btn">${userLiked ? "❤️" : "♡"}</span>
      <span class="like-count">${likeCount}</span>
    </div>
  `;

  // OWNER MENU LOGIC  
  if (isOwner) {
    const menuBtn = el.querySelector(".menu-btn");
    const dropdown = el.querySelector(".menu-dropdown");

    // Toggle dropdown
    menuBtn.onclick = e => {
      e.stopPropagation();
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    };

    // Close dropdown on outside click
    document.addEventListener(
      "click",
      () => {
        dropdown.style.display = "none";
      },
      { once: true }
    );

    // EDIT DECK — POPUP
    el.querySelector(".edit-deck").onclick = e => {
      e.stopPropagation();

      const modal = document.getElementById("edit-deck-modal");
      const titleInput = document.getElementById("edit-deck-title");
      const descInput = document.getElementById("edit-deck-description");
      const tagsInput = document.getElementById("edit-deck-tags");
      const saveBtn = document.getElementById("save-deck-changes");
      const cancelBtn = document.getElementById("cancel-deck-edit");

      // Prefill values
      titleInput.value = deck.title;
      descInput.value = deck.description || "";
      tagsInput.value = deck.tags ? deck.tags.join(", ") : "";

      modal.classList.remove("hidden");

      // SAVE
      saveBtn.onclick = async () => {
        const newTitle = titleInput.value.trim();
        const newDesc = descInput.value.trim();
        const newTagsStr = tagsInput.value.trim();
        const newTags = newTagsStr ? newTagsStr.split(",").map(t => t.trim()).filter(t => t) : [];

        if (!newTitle) {
          alert("Deck title cannot be empty");
          return;
        }

        try {
          await updateDoc(doc(db, "decks", docSnap.id), {
            title: newTitle,
            description: newDesc,
            tags: newTags
          });
          modal.classList.add("hidden");
        } catch (err) {
          alert("Failed to update deck");
          console.error(err);
        }
      };

      // CANCEL
      cancelBtn.onclick = () => {
        modal.classList.add("hidden");
      };
    };



    // DELETE DECK 
    el.querySelector(".delete-deck").onclick = async e => {
      e.stopPropagation();

      const ok = confirm(
        "Are you sure?\nThis will permanently delete the deck."
      );
      if (!ok) return;

      try {
        await deleteDoc(doc(db, "decks", docSnap.id));
      } catch (err) {
        alert("Failed to delete deck");
        console.error(err);
      }
    };
  }



  // LIKE TOGGLE  
  const likeBtn = el.querySelector(".like-btn");
  likeBtn.onclick = async e => {
    e.stopPropagation();
    if (!user) return;

    const deckRef = doc(db, "decks", docSnap.id);

    if (deck.likes?.[user.uid]) {
      // UNLIKE
      await updateDoc(deckRef, {
        [`likes.${user.uid}`]: deleteField()
      });
    } else {
      // LIKE
      await updateDoc(deckRef, {
        [`likes.${user.uid}`]: true
      });
    }
  };

  // BOOKMARK  
  el.querySelector(".bookmark").onclick = e => {
    e.stopPropagation();
    if (!user) return;

    setDoc(
      doc(db, "users", user.uid, "savedDecks", docSnap.id),
      { savedAt: serverTimestamp() }
    );
  };

  el.onclick = e => {
    if (
      e.target.closest(".like-btn") ||
      e.target.closest(".bookmark") ||
      e.target.closest(".menu-btn") ||
      e.target.closest(".menu-dropdown")
    ) return;

    showDeckPage();

    setTimeout(async () => {
      await loadCards(docSnap.id, isOwner);
      initComments(docSnap.id);
      addToHistory(docSnap.id, deck); // Track history

      if (isOwner) {
        document.getElementById("add-card-btn").onclick = () => {
          openAddCardModal(docSnap.id);
        };
      }
    }, 50);
  };



  container.appendChild(el);
}

/* ======================================================
   SEARCH ADDON — ADD ONLY (DO NOT MODIFY EXISTING CODE)
====================================================== */

let __publicDecksSearchCache = [];

/* Hook into existing public decks snapshot
   You MUST add ONE LINE where public decks are rendered:
   __publicDecksSearchCache.push({ id: docSnap.id, ...docSnap.data() });
*/

/* ---------- SEARCH INIT ---------- */
export function initSearchAddon() {
  const input = document.getElementById("search-input");
  const overlay = document.getElementById("search-overlay");
  const results = document.getElementById("search-results");
  // Target MAIN for dimming so navbar stays bright
  const dashboard = document.querySelector("main");

  if (!input || !overlay || !results || !dashboard) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      overlay.classList.add("hidden");
      dashboard.classList.remove("dimmed");
      results.innerHTML = "";
      return;
    }

    const matches = __publicDecksSearchCache.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.tags?.some(tag => tag.toLowerCase().includes(q))
    );

    results.innerHTML = "";

    matches.forEach(deck => {
      renderDeckForSearchAddon(deck, results);
    });

    overlay.classList.remove("hidden");
    dashboard.classList.add("dimmed");
  });

  document.addEventListener("click", e => {
    if (!overlay.contains(e.target) && e.target !== input) {
      overlay.classList.add("hidden");
      dashboard.classList.remove("dimmed");
    }
  });
}

/* ---------- SEARCH RESULT CARD ---------- */
function renderDeckForSearchAddon(deck, container) {
  const el = document.createElement("div");
  el.className = "deck-card";

  el.innerHTML = `
    <h4>${deck.title}</h4>
    <p>${deck.description || ""}</p>
    <div class="deck-actions">
      <span>❤️ ${Object.keys(deck.likes || {}).length}</span>
    </div>
  `;

  el.onclick = () => {
    document.getElementById("search-overlay").classList.add("hidden");
    document.getElementById("app-section").classList.remove("dimmed");

    // IMPORTANT: reuse existing flow
    // IMPORTANT: reuse existing flow
    showDeckPage();
    loadCards(deck.id, false); // search result viewed as non-owner initially or check owner? 
    // actually search results might be own decks. 
    // Ideally we check if auth.currentUser.uid == deck.ownerId
    // But for now safe to pass false or strict check:
    const isOwner = auth.currentUser && auth.currentUser.uid === deck.ownerId;
    loadCards(deck.id, isOwner);

    initComments(deck.id);
    addToHistory(deck.id, deck);

    // hide Add Card button (read-only)
    const addBtn = document.getElementById("add-card-btn");
    if (addBtn) addBtn.style.display = "none";
  };

  container.appendChild(el);
}

/* ---------- BOOTSTRAP SEARCH ADDON ---------- */
document.addEventListener("DOMContentLoaded", initSearchAddon);


/* ---------- COMMENTS ---------- */
let commentsUnsub = null;


export function initComments(deckId) {
  const list = document.getElementById("comments-list");
  const input = document.getElementById("comment-text");
  const postBtn = document.getElementById("post-comment-btn");

  if (!list || !input || !postBtn) return;

  const user = auth.currentUser;
  if (!user) return;

  const commentsRef = collection(db, "decks", deckId, "comments");

  if (commentsUnsub) commentsUnsub();

  // 🔁 LIVE LISTENER
  commentsUnsub = onSnapshot(commentsRef, snap => {
    list.innerHTML = "";

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const isOwner = docSnap.id === user.uid;

      const el = document.createElement("div");
      el.className = "comment-card";

      el.innerHTML = `
        <div class="comment-header">
          <strong>${data.username}</strong>
          ${isOwner ? `
            <div class="comment-menu">
              <button class="menu-btn">⋮</button>
              <div class="menu-dropdown">
                <button class="edit-comment">Edit</button>
                <button class="delete-comment danger">Delete</button>
              </div>
            </div>
          ` : ""}
        </div>
        <p class="comment-text">${data.text}</p>
      `;



      // MENU TOGGLE
      if (isOwner) {
        const menuBtn = el.querySelector(".menu-btn");
        const dropdown = el.querySelector(".menu-dropdown");

        menuBtn.onclick = e => {
          e.stopPropagation();
          // specific toggle
          dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
        };

        // Hide when clicking outside is already handled generally in many apps, but let's add a specific one or rely on global?
        // Let's add a global click listener to close all dropdowns, or just this one.
        document.addEventListener("click", () => {
          dropdown.style.display = "none";
        });
      }

      // EDIT
      if (isOwner) {
        el.querySelector(".edit-comment").onclick = () => {
          input.value = data.text;
        };

        el.querySelector(".delete-comment").onclick = async () => {
          if (!confirm("Delete your comment?")) return;
          await deleteDoc(doc(db, "decks", deckId, "comments", user.uid));
        };
      }

      list.appendChild(el);
    });
  });

  // 🟢 POST / UPDATE COMMENT
  postBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;

    try {
      await setDoc(
        doc(db, "decks", deckId, "comments", user.uid),
        {
          text,
          username: user.displayName || "User",
          createdAt: serverTimestamp()
        }
      );

      input.value = "";
    } catch (err) {
      alert("Failed to post comment");
      console.error(err);
    }
  };
}


/* ---------- HISTORY FEATURE ---------- */
async function addToHistory(deckId, deckData) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const historyRef = doc(db, "users", user.uid, "history", deckId);
    await setDoc(historyRef, {
      title: deckData.title,
      description: deckData.description || "",
      lastVisited: serverTimestamp(),
      deckId: deckId
    }, { merge: true });
  } catch (err) {
    console.error("Error adding to history:", err);
  }
}

export function initHistoryDropdown() {
  const btn = document.getElementById("history-btn");
  const dropdown = document.getElementById("history-dropdown");

  if (!btn || !dropdown) return;

  btn.onclick = async (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
      const user = auth.currentUser;
      if (!user) {
        dropdown.innerHTML = "<p style='padding:12px; font-size:0.9rem'>Login to see history</p>";
        return;
      }

      const q = query(
        collection(db, "users", user.uid, "history"),
        orderBy("lastVisited", "desc")
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        dropdown.innerHTML = "<p style='padding:12px; color:#666; font-size:0.9rem'>No history yet</p>";
        return;
      }

      dropdown.innerHTML = "";
      snap.forEach(docSnap => {
        const item = docSnap.data();
        const row = document.createElement("button");
        row.style.textAlign = "left";
        row.style.padding = "8px 12px";
        row.style.borderBottom = "1px solid #eee";
        row.style.width = "100%";
        row.innerHTML = `<strong>${item.title}</strong>`;

        row.onclick = () => {
          fetchAndOpenDeck(item.deckId);
        };
        dropdown.appendChild(row);
      });
    }
  };

  document.addEventListener("click", () => {
    dropdown.style.display = "none";
  });
}

async function fetchAndOpenDeck(deckId) {
  try {
    const deckRef = await import("./firebase.js").then(m => doc(m.db, "decks", deckId)).then(ref => import("firebase/firestore").then(pkg => pkg.getDoc(ref)));
    if (deckRef.exists()) {
      const data = deckRef.data();
      const isOwner = auth.currentUser && auth.currentUser.uid === data.ownerId;

      document.getElementById("deck-title").innerText = data.title;
      document.getElementById("deck-description").innerText = data.description;

      showDeckPage();
      loadCards(deckId, isOwner);
      initComments(deckId);

      addToHistory(deckId, data);
    }
  } catch (e) {
    console.error(e);
  }
}
