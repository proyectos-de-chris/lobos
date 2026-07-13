const MAX_PLAYERS = 20;
const MIN_PLAYERS = 6;

const roles = {
  lobo: { page: "roles/lobo.html", label: "Hombre-lobo" },
  vidente: { page: "roles/vidente.html", label: "Vidente" },
  bruja: { page: "roles/bruja.html", label: "Brujo/Bruja" },
  nino: { page: "roles/nino.html", label: "Niño/Niña" },
  aldeano: { page: "roles/aldeano.html", label: "Aldeano" }
};

function normalizeAliases(text) {
  return text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function secureShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


function computeRoleCounts(n) {
  const lobos = (n <= 11) ? 2 : 3; // 6-11 => 2, 12+ => 3
  const vidente = 1;
  const bruja = 1;
  const nino = 1;
  const aldeanos = n - lobos - vidente - bruja - nino;
  return { lobos, vidente, bruja, nino, aldeanos };
}

function roleListForN(n) {
  const { lobos, vidente, bruja, nino, aldeanos } = computeRoleCounts(n);
  const list = [
    ...Array(lobos).fill("lobo"),
    ...Array(vidente).fill("vidente"),
    ...Array(bruja).fill("bruja"),
    ...Array(nino).fill("nino"),
    ...Array(aldeanos).fill("aldeano"),
  ];
  return list;
}

function revealKey(playerIndex) {
  return `revealed:${playerIndex}`;
}

function isRevealed(playerIndex) {
  return localStorage.getItem(revealKey(playerIndex)) === "1";
}

function setRevealed(playerIndex) {
  localStorage.setItem(revealKey(playerIndex), "1");
}

function setUpModal() {
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeModalBtn");

  function closeModal() {
    modal.classList.add("hidden");
  }

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  return modal;
}

function showRevealModal({ playerName, playerIndex, roleType }) {
  const modal = document.getElementById("modal");
  const modalPlayerName = document.getElementById("modalPlayerName");
  const modalPlayerIndex = document.getElementById("modalPlayerIndex");
  const revealLink = document.getElementById("revealLink");
  const openRoleLink = document.getElementById("openRoleLink");
  const qrEl = document.getElementById("qr");
  const copyBtn = document.getElementById("copyBtn");
  const copyMsg = document.getElementById("copyMsg");

  qrEl.innerHTML = "";

  const url = new URL(roles[roleType].page, window.location.href).href;

  modalPlayerName.textContent = playerName;
  modalPlayerIndex.textContent = `Jugador #${playerIndex + 1}`;

  revealLink.value = url;
  openRoleLink.href = url;

  new QRCode(qrEl, {
    text: url,
    width: 256,
    height: 256,
    colorDark: "#e8eefc",
    colorLight: "transparent",
    correctLevel: QRCode.CorrectLevel.M
  });

  copyMsg.textContent = "";
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      copyMsg.textContent = "Enlace copiado ✅";
      setTimeout(() => (copyMsg.textContent = ""), 1500);
    } catch {
      copyMsg.textContent = "No se pudo copiar automáticamente. Copia manualmente.";
    }
  };

  modal.classList.remove("hidden");
}


function renderBoard(players, assignedRoles) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  players.forEach((name, i) => {
    const card = document.createElement("div");
    card.className = "playerCard";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const idx = document.createElement("div");
    idx.className = "playerIndex";
    idx.textContent = `Jugador #${i + 1}`;

    const nm = document.createElement("div");
    nm.className = "playerName";
    nm.textContent = name;

    card.appendChild(nm);
    card.appendChild(idx);

    const revealed = isRevealed(i);
    if (revealed) card.classList.add("revealed");

    const open = () => {
      if (isRevealed(i)) return;

      setRevealed(i);
      card.classList.add("revealed");

      showRevealModal({
        playerName: name,
        playerIndex: i,
        roleType: assignedRoles[i]
      });
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open();
    });

    board.appendChild(card);
  });
}

function resetReveals() {
  // intentamos limpiar un rango amplio (para evitar claves fantasma)
  for (let i = 0; i < 200; i++) {
    const k = revealKey(i);
    if (localStorage.getItem(k) !== null) localStorage.removeItem(k);
  }
}

async function init() {
  setUpModal();

  const setupForm = document.getElementById("setupForm");
  const resetBtn = document.getElementById("resetBtn");

  resetBtn.addEventListener("click", () => {
     resetReveals();

     const players = JSON.parse(localStorage.getItem("players") || "null");
     const assignedRoles = JSON.parse(localStorage.getItem("assignedRoles") || "null");

     if (!players || !assignedRoles) {
       location.reload();
       return;
     }

     const boardWrap = document.getElementById("boardWrap");
     boardWrap.classList.remove("hidden");
     renderBoard(players, assignedRoles);
   });


  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    resetReveals();


    const aliasesText = document.getElementById("aliases").value;
    const players = normalizeAliases(aliasesText);
    const n = players.length;

    if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
      alert(`El número de jugadores debe estar entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.`);
      return;
    }


    const roleList = roleListForN(n);
    const shuffledRoles = secureShuffle(roleList);

    localStorage.setItem("players", JSON.stringify(players));
    localStorage.setItem("assignedRoles", JSON.stringify(shuffledRoles));

    const boardWrap = document.getElementById("boardWrap");
    boardWrap.classList.remove("hidden");
    renderBoard(players, shuffledRoles);

  });
}

init();
