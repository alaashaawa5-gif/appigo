const grid = document.querySelector("#game-grid");
const newGrid = document.querySelector("#new-grid");
const searchInput = document.querySelector("#game-search");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#result-count");

let games = [];
let activeCategory = "All";

const palettes = [
  "linear-gradient(135deg,#24432c,#18251d)",
  "linear-gradient(135deg,#27364b,#171f2b)",
  "linear-gradient(135deg,#4a3024,#211915)",
  "linear-gradient(135deg,#3a2b4b,#1e1928)",
  "linear-gradient(135deg,#244344,#142526)"
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

function gameCard(game, index = 0) {
  const link = `/game/?id=${encodeURIComponent(game.id)}`;
  const isReady = game.status === "ready" && Boolean(game.embedUrl);
  return `
    <a class="game-card" href="${link}">
      <div class="game-thumb" style="background:${palettes[index % palettes.length]}">
        <span class="game-badge">${isReady ? "PLAY NOW" : "GUIDE READY"}</span>
        <span class="game-emoji" aria-hidden="true">${escapeHtml(game.emoji || "🎮")}</span>
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

function render() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const filtered = games.filter((g) => {
    const matchesCat = activeCategory === "All" || g.category === activeCategory;
    const haystack = `${g.title} ${g.category} ${g.shortDescription || ""} ${(g.tags || []).join(" ")}`.toLowerCase();
    return matchesCat && haystack.includes(q);
  });

  if (grid) {
    grid.innerHTML = filtered.map((g, i) => gameCard(g, i)).join("");
  }
  if (count) {
    count.textContent = `${filtered.length} ${filtered.length === 1 ? "game" : "games"}`;
  }
  if (emptyState) {
    emptyState.classList.toggle("hidden", filtered.length > 0);
  }
  if (newGrid) {
    const latest = [...games]
      .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""))
      .slice(0, 4);
    newGrid.innerHTML = latest.map((g, i) => gameCard(g, i)).join("");
  }
}

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery && searchInput) {
  searchInput.value = initialQuery;
}

fetch("/data/games.json")
  .then((r) => {
    if (!r.ok) throw new Error("Could not load game catalog");
    return r.json();
  })
  .then((data) => {
    games = data.games || [];
    render();
  })
  .catch(() => {
    if (grid) {
      grid.innerHTML = '<p class="muted">Game catalog could not be loaded. Check /data/games.json.</p>';
    }
  });

searchInput?.addEventListener("input", render);

document.querySelectorAll(".category-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-chip").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    activeCategory = btn.dataset.category;
    render();
  });
});

document.querySelector("#menu-toggle")?.addEventListener("click", () => {
  document.querySelector(".main-nav")?.classList.toggle("open");
});

const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
