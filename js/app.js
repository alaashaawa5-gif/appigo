
const grid = document.querySelector("#game-grid");
const newGrid = document.querySelector("#new-grid");
const searchInput = document.querySelector("#game-search");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#result-count");

let games = [];
let activeCategory = "All";

const PAGE_SIZE = 48;
let visibleCount = PAGE_SIZE;
let filteredGames = [];

const palettes = [
  "linear-gradient(135deg,#24432c,#18251d)",
  "linear-gradient(135deg,#27364b,#171f2b)",
  "linear-gradient(135deg,#4a3024,#211915)",
  "linear-gradient(135deg,#3a2b4b,#1e1928)",
  "linear-gradient(135deg,#244344,#142526)"
];

// Emoji collections by category
const categoryIcons = {
  Puzzle: ["🧩", "🔷", "🧠", "🔢", "🎯", "💎", "🧊", "🧱"],
  Arcade: ["🎮", "👾", "🕹️", "⭐", "🚀", "🎯", "⚡", "💥"],
  Action: ["⚔️", "🥷", "🛡️", "💣", "🔥", "🏹", "🤖", "💥"],
  Racing: ["🏎️", "🏁", "🚗", "🏍️", "🚙", "🏎️", "🛞", "🚦"],
  Sports: ["🏀", "⚽", "🏈", "🎾", "🏆", "🥊", "🏐", "🎳"],
  Adventure: ["🗺️", "🌍", "🧭", "🏝️", "🐉", "⛺", "🚀", "💎"],
  Simulation: ["🏗️", "🏡", "🚜", "✈️", "🏭", "🚂", "🌆", "🔧"],
  Strategy: ["♟️", "🏰", "👑", "🛡️", "⚔️", "🎖️", "🧠", "🏹"]
};

const keywordIcons = [
  [/car|racing|drift|drive|truck|motor|bike/i, ["🏎️", "🚗", "🏍️", "🚙"]],
  [/football|soccer/i, ["⚽", "🥅"]],
  [/basket|hoop/i, ["🏀"]],
  [/tennis/i, ["🎾"]],
  [/golf/i, ["⛳"]],
  [/chess/i, ["♟️"]],
  [/pool|billiard/i, ["🎱"]],
  [/fishing|fish/i, ["🎣", "🐟"]],
  [/cooking|chef|restaurant|pizza/i, ["🍕", "👨‍🍳", "🍔"]],
  [/farm|garden|grow/i, ["🌱", "🌻", "🚜"]],
  [/zombie|monster|horror/i, ["🧟", "👹", "💀"]],
  [/ninja|samurai/i, ["🥷", "⚔️"]],
  [/space|planet|galaxy/i, ["🚀", "🪐", "👽"]],
  [/airplane|flight|pilot/i, ["✈️", "🛩️"]],
  [/snake/i, ["🐍"]],
  [/bird/i, ["🐦", "🦅"]],
  [/dog/i, ["🐶"]],
  [/cat/i, ["🐱"]],
  [/block|brick/i, ["🧱", "🟦"]],
  [/bubble/i, ["🫧", "🔵"]],
  [/fruit|slice/i, ["🍉", "🍎", "🍊"]],
  [/word|letter|crossword/i, ["🔤", "📚"]],
  [/number|math|2048/i, ["🔢", "➗"]],
  [/war|battle|combat/i, ["⚔️", "🛡️", "💥"]],
  [/run|runner|jump/i, ["🏃", "👟", "🦘"]]
];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// Stable hash: same game always gets the same icon
function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function gameIcon(game) {
  const title = String(game.title || "");

  for (const [pattern, icons] of keywordIcons) {
    if (pattern.test(title)) {
      return icons[hashString(title) % icons.length];
    }
  }

  const icons = categoryIcons[game.category] || ["🎮", "⭐", "🎯"];
  return icons[hashString(title) % icons.length];
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeUrl(value = "") {
  try {
    const url = new URL(value);
    return (url.hostname + url.pathname)
      .toLowerCase()
      .replace(/\/+$/, "");
  } catch {
    return "";
  }
}

// Prefer playable versions when duplicate games exist
function deduplicateGames(list) {
  const sorted = list
    .map((game, index) => ({ game, index }))
    .sort((a, b) => {
      const aReady = a.game.status === "ready" && a.game.embedUrl ? 1 : 0;
      const bReady = b.game.status === "ready" && b.game.embedUrl ? 1 : 0;
      return bReady - aReady || a.index - b.index;
    });

  const seenTitles = new Set();
  const seenUrls = new Set();
  const result = [];

  for (const item of sorted) {
    const game = item.game;
    const titleKey = normalizeText(game.title);
    const urlKey = normalizeUrl(game.embedUrl);

    if (!titleKey || seenTitles.has(titleKey)) continue;
    if (urlKey && seenUrls.has(urlKey)) continue;

    seenTitles.add(titleKey);
    if (urlKey) seenUrls.add(urlKey);

    result.push(item);
  }

  // Restore original catalog order
  return result
    .sort((a, b) => a.index - b.index)
    .map(item => item.game);
}

function gameCard(game, index = 0) {
  const link = `/game/?id=${encodeURIComponent(game.id)}`;
  const isReady = game.status === "ready" && Boolean(game.embedUrl);

  return `
    <a class="game-card" href="${link}">
      <div class="game-thumb" style="background:${palettes[index % palettes.length]}">
        <span class="game-badge">${isReady ? "PLAY NOW" : "GUIDE READY"}</span>
        <span class="game-emoji" aria-hidden="true">${gameIcon(game)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(game.title)}</h3>
        <div class="card-meta">
          <span>${escapeHtml(game.category)}</span>
          <span>${escapeHtml(game.players || "Browser")}</span>
        </div>
        <span class="card-cta">${isReady ? "PLAY GAME →" : "VIEW GAME →"}</span>
      </div>
    </a>
  `;
}

// Create a lightweight Load More button
let loadMoreButton = null;

if (grid) {
  loadMoreButton = document.createElement("button");
  loadMoreButton.type = "button";
  loadMoreButton.textContent = "LOAD MORE GAMES";
  loadMoreButton.style.cssText = `
    display:none;
    margin:24px auto;
    padding:14px 28px;
    background:#24432c;
    color:#fff;
    border:0;
    border-radius:8px;
    font-weight:700;
    cursor:pointer;
    max-width:90%;
  `;

  grid.insertAdjacentElement("afterend", loadMoreButton);

  loadMoreButton.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderCards();
  });
}

function renderCards() {
  if (!grid) return;

  const visibleGames = filteredGames.slice(0, visibleCount);

  grid.innerHTML = visibleGames
    .map((game, index) => gameCard(game, index))
    .join("");

  if (loadMoreButton) {
    const hasMore = visibleCount < filteredGames.length;
    loadMoreButton.style.display = hasMore ? "block" : "none";

    if (hasMore) {
      loadMoreButton.textContent =
        `LOAD MORE GAMES (${filteredGames.length - visibleCount} LEFT)`;
    }
  }
}

function render() {
  const q = normalizeText(searchInput?.value || "");

  filteredGames = games.filter((game) => {
    const matchesCat =
      activeCategory === "All" || game.category === activeCategory;

    const haystack = normalizeText(
      `${game.title} ${game.category} ${game.shortDescription || ""} ${(game.tags || []).join(" ")}`
    );

    return matchesCat && haystack.includes(q);
  });

  visibleCount = PAGE_SIZE;
  renderCards();

  if (count) {
    count.textContent =
      `${filteredGames.length} ${filteredGames.length === 1 ? "game" : "games"}`;
  }

  if (emptyState) {
    emptyState.classList.toggle("hidden", filteredGames.length > 0);
  }
}

const initialQuery = new URLSearchParams(location.search).get("q");

if (initialQuery && searchInput) {
  searchInput.value = initialQuery;
}

fetch("/data/games.json")
  .then((response) => {
    if (!response.ok) throw new Error("Could not load game catalog");
    return response.json();
  })
  .then((data) => {
    const originalGames = Array.isArray(data.games) ? data.games : [];

    games = deduplicateGames(originalGames);

    // Latest games are also deduplicated
    const latest = [...games]
      .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""))
      .slice(0, 4);

    if (newGrid) {
      newGrid.innerHTML = latest
        .map((game, index) => gameCard(game, index))
        .join("");
    }

    render();

    console.log("Original games:", originalGames.length);
    console.log("Unique games:", games.length);
    console.log("Duplicates skipped:", originalGames.length - games.length);
  })
  .catch(() => {
    if (grid) {
      grid.innerHTML =
        '<p class="muted">Game catalog could not be loaded. Check /data/games.json.</p>';
    }
  });

searchInput?.addEventListener("input", render);

document.querySelectorAll(".category-chip").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category-chip").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    activeCategory = button.dataset.category || "All";
    render();
  });
});

document.querySelector("#menu-toggle")?.addEventListener("click", () => {
  document.querySelector(".main-nav")?.classList.toggle("open");
});

const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
