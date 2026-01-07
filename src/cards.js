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

  // Query to get cards for this deck, ordered by creation time
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


/* ---------------- RENDER CARD (STUDY MODE) ---------------- */
function renderCurrentStudyCard() {
  const termEl = document.getElementById("study-card-front");
  const defEl = document.getElementById("study-card-back");
  const counter = document.getElementById("study-counter");
  const inner = document.getElementById("study-card-inner");

  // Ensure all elements exist before proceeding
  // This prevents errors if we are on a different page (e.g. dashboard)
  if (!termEl || !defEl || !counter || !inner) {
    return;
  }

  // Handle empty deck case
  if (cards.length === 0) {
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

  if (window.currentDeckIsOwner) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "secondary";
    editBtn.style.fontSize = "1rem";
    editBtn.style.padding = "8px 16px";
    editBtn.style.marginRight = "10px";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditCardModal(cards[currentIndex]);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.style.fontSize = "1rem";
    deleteBtn.style.padding = "8px 16px";
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete current card?")) return;
      await deleteDoc(doc(db, "decks", currentDeckId, "cards", cards[currentIndex].id));
      await loadCards(currentDeckId, window.currentDeckIsOwner);
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

  if (!flashcard || !nextBtn || !prevBtn) return;

  // Flip card
  // Function to flip the flashcard
  const toggleFlip = () => {
    // Toggles the 'flipped' CSS class which handles the 3D rotation
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
// export function editCurrentCard() {
//   if (!cards.length) return;

//   const card = cards[currentIndex];

//   const modal = document.getElementById("edit-card-modal");
//   const termInput = document.getElementById("edit-card-term");
//   const defInput = document.getElementById("edit-card-definition");
//   const saveBtn = document.getElementById("save-card-changes");
//   const cancelBtn = document.getElementById("cancel-card-edit");

//   termInput.value = card.term;
//   defInput.value = card.definition;

//   modal.classList.remove("hidden");

//   saveBtn.onclick = async () => {
//     const newTerm = termInput.value.trim();
//     const newDef = defInput.value.trim();

//     if (!newTerm || !newDef) {
//       alert("Both term and definition are required");
//       return;
//     }

//     try {
//       await updateDoc(
//         doc(db, "decks", currentDeckId, "cards", card.id),
//         { term: newTerm, definition: newDef }
//       );

//       modal.classList.add("hidden");
//       loadCards(currentDeckId);
//     } catch (err) {
//       alert("Failed to update card");
//       console.error(err);
//     }
//   };

//   cancelBtn.onclick = () => {
//     modal.classList.add("hidden");
//   };
// }

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
      // Add new card to Firestore
      await addDoc(
        collection(db, "decks", currentDeckId, "cards"),
        {
          term: term,
          definition: definition,
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
// export async function deleteCurrentCard() {
//   if (!cards.length) return;

//   const confirmDelete = confirm("Delete this card?");
//   if (!confirmDelete) return;

//   await deleteDoc(
//     doc(db, "decks", currentDeckId, "cards", cards[currentIndex].id)
//   );

//   loadCards(currentDeckId);
// }
