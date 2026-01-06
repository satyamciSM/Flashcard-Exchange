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
// let currentIndex = 0;
let currentDeckId = null;

export async function loadCards(deckId) {
  currentDeckId = deckId;
  cards = [];

  const grid = document.getElementById("cards-grid");
  grid.innerHTML = "";

  const q = query(
    collection(db, "decks", deckId, "cards"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    grid.innerHTML = "<p>No cards yet.</p>";
    return;
  }

  snapshot.forEach(docSnap => {
    const card = { id: docSnap.id, ...docSnap.data() };
    cards.push(card);

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div class="card-menu">
        <button class="card-menu-btn">⋮</button>
        <div class="card-menu-dropdown">
          <button class="edit-card">Edit card</button>
          <button class="delete-card danger">Delete card</button>
        </div>
      </div>

      <div class="card-inner">
        <div class="card-face card-front">${card.term}</div>
        <div class="card-face card-back">${card.definition}</div>
      </div>
    `;

    // FLIP
    el.onclick = e => {
      if (e.target.closest(".card-menu")) return;
      el.classList.toggle("flipped");
    };

    // MENU TOGGLE
    const menuBtn = el.querySelector(".card-menu-btn");
    const dropdown = el.querySelector(".card-menu-dropdown");

    menuBtn.onclick = e => {
      e.stopPropagation();
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    };

    document.addEventListener("click", () => {
      dropdown.style.display = "none";
    });

    // EDIT
    el.querySelector(".edit-card").onclick = e => {
      e.stopPropagation();
      openEditCardModal(card);
    };

    // DELETE
    el.querySelector(".delete-card").onclick = async e => {
      e.stopPropagation();
      const ok = confirm("Delete this card?");
      if (!ok) return;

      await deleteDoc(
        doc(db, "decks", currentDeckId, "cards", card.id)
      );

      loadCards(currentDeckId);
    };

    grid.appendChild(el);
  });

}




/* ---------------- RENDER CARD ---------------- */
// function renderCard() {
//   const termEl = document.getElementById("card-front");
//   const defEl = document.getElementById("card-back");
//   const counter = document.getElementById("card-counter");
//   const inner = document.getElementById("flashcard-inner");

//   // 🚨 DOM not ready yet
//   if (!termEl || !defEl || !counter || !inner) {
//     return;
//   }

//   if (!cards.length) {
//     termEl.innerText = "No cards yet";
//     defEl.innerText = "Add cards to start studying";
//     counter.innerText = "0 / 0";
//     return;
//   }

//   inner.classList.remove("flipped");

//   termEl.innerText = cards[currentIndex].term;
//   defEl.innerText = cards[currentIndex].definition;
//   counter.innerText = `${currentIndex + 1} / ${cards.length}`;
// }


/* ---------------- STUDY CONTROLS ---------------- */
// export function initStudyControls() {
//   const flashcard = document.getElementById("flashcard");
//   const nextBtn = document.getElementById("next-card");
//   const prevBtn = document.getElementById("prev-card");
//   const inner = document.getElementById("flashcard-inner");

//   // 🚨 Deck page not mounted yet
//   if (!flashcard || !nextBtn || !prevBtn || !inner) {
//     return;
//   }

//   flashcard.onclick = () => {
//     inner.classList.toggle("flipped");
//   };

//   nextBtn.onclick = () => {
//     if (currentIndex < cards.length - 1) {
//       currentIndex++;
//       renderCard();
//     }
//   };

//   prevBtn.onclick = () => {
//     if (currentIndex > 0) {
//       currentIndex--;
//       renderCard();
//     }
//   };
// }

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
      await addDoc(
        collection(db, "decks", currentDeckId, "cards"),
        {
          term,
          definition,
          createdAt: serverTimestamp()
        }
      );

      modal.classList.add("hidden");
      await loadCards(currentDeckId);
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
    loadCards(currentDeckId);
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
