// src/cards.js
import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

let cards = [];
let currentIndex = 0;
let currentDeckId = null;

export async function loadCards(deckId, isOwner = false) {
  currentDeckId = deckId;
  window.currentDeckIsOwner = isOwner;
  cards = [];

  const q = query(
    collection(db, "decks", deckId, "cards"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    cards.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Start Study Mode immediately
  currentIndex = 0;
  renderCurrentStudyCard();
}




/* ---------------- RENDER CARD ---------------- */



/* ---------------- STUDY CONTROLS ---------------- */
/* ---------------- RENDER CARD (STUDY MODE) ---------------- */
function renderCurrentStudyCard() {
  const termEl = document.getElementById("study-card-front");
  const defEl = document.getElementById("study-card-back");
  const counter = document.getElementById("study-counter");
  const inner = document.getElementById("study-card-inner");

  if (!termEl || !defEl || !counter || !inner) return;

  if (!cards.length) {
    termEl.innerText = "No cards yet";
    defEl.innerText = "Add cards to start studying";
    counter.innerText = "0 / 0";
    return;
  }

  // Reset flip
  inner.parentElement.classList.remove("flipped");

  termEl.innerText = cards[currentIndex].term;
  defEl.innerText = cards[currentIndex].definition;
  counter.innerText = `${currentIndex + 1} / ${cards.length}`;

  // INJECT OWNER ACTIONS IF ANY
  const actionsContainer = document.getElementById("study-owner-actions");
  if (!actionsContainer) return;

  // Clear previous
  actionsContainer.innerHTML = "";

  // Check ownership
  // We need to know if current user is owner. But cards.js doesn't have easy access to deck's ownerID directly unless we fetch it or store it. 
  // However, decks.js passes deckId. We can check generic ownership if we had deck info.
  // SIMPLIFICATION: pass owner status or fetch it? 
  // Better: check auth.currentUser vs currentDeckId logic or trust UI?
  // Actually, we can just check if user is logged in and deck owner.
  // Retrying check:
  // We don't have deck object here. But we can import auth.

  // Wait, loadCards doesn't know if user is owner. decks.js checks that.
  // Let's rely on a global or check it again.
  // Or, since we want to be fast, let's fetch deck info in loadCards? No, repetitive.
  // Alternative: Have decks.js set a global "isOwner" flag on window or pass it to loadCards.
  // Let's pass it to loadCards.

  // Updating loadCards signature in next step or now? 
  // Let's assume passed in loadCards(deckId, isOwner).

  if (window.currentDeckIsOwner) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "secondary";
    editBtn.style.fontSize = "1rem"; // Increased size
    editBtn.style.padding = "8px 16px"; // Increased padding
    editBtn.style.marginRight = "10px"; // Add spacing
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditCardModal(cards[currentIndex]);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.style.fontSize = "1rem"; // Increased size
    deleteBtn.style.padding = "8px 16px"; // Increased padding
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete current card?")) return;
      await deleteDoc(doc(db, "decks", currentDeckId, "cards", cards[currentIndex].id));
      await deleteDoc(doc(db, "decks", currentDeckId, "cards", cards[currentIndex].id));
      await loadCards(currentDeckId, window.currentDeckIsOwner); // persist ownership
    };

    actionsContainer.appendChild(editBtn);
    actionsContainer.appendChild(deleteBtn);
  }
}


/* ---------------- STUDY CONTROLS ---------------- */
export function initStudyControls() {
  const flashcard = document.getElementById("study-flashcard");
  const nextBtn = document.getElementById("next-card-btn");
  const prevBtn = document.getElementById("prev-card-btn");
  const flipBtn = document.getElementById("flip-card-btn");

  if (!flashcard || !nextBtn || !prevBtn) return;

  // Flip card
  const toggleFlip = () => {
    flashcard.classList.toggle("flipped");
  };



  flashcard.onclick = toggleFlip;


  // Next
  nextBtn.onclick = () => {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      renderCurrentStudyCard();
    }
  };

  // Prev
  prevBtn.onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentStudyCard();
    }
  };
}

/* ---------------- EDIT CARD ---------------- */


export function openAddCardModal(deckId) {
  currentDeckId = deckId;

  const modal = document.getElementById("add-card-modal");
  const termInput = document.getElementById("add-card-term");
  const defInput = document.getElementById("add-card-definition");
  const confirmBtn = document.getElementById("add-card-confirm");
  const cancelBtn = document.getElementById("add-card-cancel");

  termInput.value = "";
  defInput.value = "";

  modal.classList.remove("hidden");

  confirmBtn.onclick = async () => {
    const term = termInput.value.trim();
    const definition = defInput.value.trim();

    if (!term || !definition) {
      alert("Both term and definition are required");
      return;
    }

    try {
      await addDoc(
        collection(db, "decks", currentDeckId, "cards"),
        {
          term,
          definition,
          createdAt: serverTimestamp()
        }
      );

      modal.classList.add("hidden");

      await loadCards(currentDeckId, window.currentDeckIsOwner);
    } catch (err) {
      alert("Failed to add card");
      console.error(err);
    }
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}

function openEditCardModal(card) {
  const modal = document.getElementById("edit-card-modal");
  const termInput = document.getElementById("edit-card-term");
  const defInput = document.getElementById("edit-card-definition");
  const saveBtn = document.getElementById("save-card-changes");
  const cancelBtn = document.getElementById("cancel-card-edit");

  termInput.value = card.term;
  defInput.value = card.definition;

  modal.classList.remove("hidden");

  saveBtn.onclick = async () => {
    const newTerm = termInput.value.trim();
    const newDef = defInput.value.trim();

    if (!newTerm || !newDef) return;

    await updateDoc(
      doc(db, "decks", currentDeckId, "cards", card.id),
      { term: newTerm, definition: newDef }
    );

    modal.classList.add("hidden");

    loadCards(currentDeckId, window.currentDeckIsOwner);
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}



/* ---------------- DELETE CARD ---------------- */

