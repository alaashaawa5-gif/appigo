// ==========================================
// Appigo Game Page
// Supports clean URLs + old query URLs
// ==========================================

const params = new URLSearchParams(location.search);

// 1) Old URL: /game/?id=game-id
const queryId = params.get("id");

// 2) Clean URL: /game/game-id/
const pathParts = location.pathname.split("/").filter(Boolean);
const pathId = pathParts.length >= 2 && pathParts[0] === "game"
  ? pathParts[1]
  : null;

// 3) Generated static page: body data-game-id
const bodyId = document.body.dataset.gameId;

// Prefer generated page ID, then clean URL, then old query URL
const id = bodyId || pathId || queryId;

const frame = document.querySelector("#game-frame");
const placeholder = document.querySelector("#player-placeholder");
const shell = document.querySelector("#player-shell");
const fullscreen = document.querySelector("#fullscreen-button");
const sourceLink = document.querySelector("#open-source");

const palettes = [
  "linear-gradient(135deg,#24432c,#18251d)",
  "linear-gradient(135deg,#27364b,#171f2b)",
  "linear-gradient(135deg,#4a3024,#211915)",
  "linear-gradient(135deg,#3a2b4b,#1e1928)",
  "linear-gradient(135deg,#244344,#142526)"
];

// Escape HTML
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// Clean URL for a game
function gameUrl(gameId) {
  return `/game/${encodeURIComponent(gameId)}/`;
}

// Set canonical URL
function setCanonical(url) {
  let canonical = document.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}

// Inject Schema
function injectSchema(game, canonicalUrl) {
  const oldSchema = document.querySelector("#game-schema");
  if (oldSchema) oldSchema.remove();

  const faqEntities = (game.faq || []).map((item) => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a
    }
  }));

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        "name": game.title,
        "genre": game.category,
        "gamePlatform": "Web Browser",
        "applicationCategory": "Game",
        "operatingSystem": "Any",
        "description": game.shortDescription || game.overview || "",
        "url": canonicalUrl
      },
      ...(faqEntities.length ? [{
        "@type": "FAQPage",
        "mainEntity": faqEntities
      }] : [])
    ]
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "game-schema";
  script.textContent = JSON.stringify(schemaData);
  document.head.appendChild(script);
}

// Render game information sections
function renderSections(game) {
  const container = document.querySelector("#game-sections");
  if (!container) return;

  const blocks = [];

  if (game.overview) {
    blocks.push(`<h3>Overview</h3><p>${esc(game.overview)}</p>`);
  }

  if (game.howToPlay) {
    blocks.push(`<h3>How to Play</h3><p>${esc(game.howToPlay)}</p>`);
  }

  if (game.tips) {
    blocks.push(`<h3>Tips & Strategy</h3><p>${esc(game.tips)}</p>`);
  }

  if (Array.isArray(game.faq) && game.faq.length) {
    const faqHtml = game.faq.map((f) => `
      <div class="faq-item">
        <h4>${esc(f.q)}</h4>
        <p>${esc(f.a)}</p>
      </div>
    `).join("");

    blocks.push(
      `<h3>Frequently Asked Questions</h3>
       <div class="faq-list">${faqHtml}</div>`
    );
  }

  container.innerHTML = blocks.join("");
}

// Load games database
fetch("/data/games.json")
  .then((r) => {
    if (!r.ok) throw new Error("Failed to load games");
    return r.json();
  })
  .then((data) => {
    const games = Array.isArray(data) ? data : (data.games || []);

    // FIX: Do not fall back to games[0] if the ID is incorrect
    const game = games.find((g) => g.id === id);

    if (!game) {
      document.title = "Game Not Found — Appigo";

      const titleEl = document.querySelector("#game-title");
      if (titleEl) titleEl.textContent = "Game not found";

      const label = document.querySelector("#player-label");
      if (label) label.textContent = "Game not found";

      if (placeholder) placeholder.classList.remove("hidden");
      if (frame) frame.classList.add("hidden");

      const headingEl = document.querySelector("#placeholder-heading");
      const textEl = document.querySelector("#placeholder-text");

      if (headingEl) headingEl.textContent = "Game Not Found";
      if (textEl) {
        textEl.textContent = "We couldn't find this game. Please browse our game collection.";
      }

      setCanonical(`${location.origin}/game/`);
      return;
    }

    // Generated clean-URL pages already contain complete SEO metadata in static HTML.
    // Keep the runtime fallback only for the legacy /game/?id= URL.
    const canonicalUrl = `${location.origin}${gameUrl(game.id)}`;
    if (!bodyId) {
      setCanonical(canonicalUrl);

      const pageTitle = `${game.title} — Play Free Online on Appigo`;
      const metaDesc = game.shortDescription ||
        `Play ${game.title} online for free on Appigo. Learn controls, gameplay tips, and strategies.`;

      document.title = pageTitle;
      const descTag = document.querySelector('meta[name="description"]');
      if (descTag) descTag.content = metaDesc;
    }

    // Breadcrumbs and game details
    const crumbTitle = document.querySelector("#crumb-title");
    const crumbCategory = document.querySelector("#crumb-category");
    const titleEl = document.querySelector("#game-title");
    const categoryEl = document.querySelector("#game-category");
    const playersEl = document.querySelector("#game-players");
    const controlsEl = document.querySelector("#game-controls");

    if (crumbTitle) crumbTitle.textContent = game.title;
    if (crumbCategory) crumbCategory.textContent = game.category || "Games";
    if (titleEl) titleEl.textContent = game.title;
    if (categoryEl) categoryEl.textContent = game.category || "—";
    if (playersEl) playersEl.textContent = game.players || "Single Player";
    if (controlsEl) controlsEl.textContent = game.controls || "Keyboard / Mouse";

    const iconEl = document.querySelector("#placeholder-icon");
    if (iconEl) iconEl.textContent = game.emoji || "🎮";

    // Static generated pages already contain guide content and JSON-LD.
    // Only legacy query-string pages need these runtime fallbacks.
    if (!bodyId) {
      renderSections(game);
      injectSchema(game, canonicalUrl);
    }

    // Tags
    const tagsEl = document.querySelector("#game-tags");
    if (tagsEl) {
      tagsEl.innerHTML = (game.tags || [])
        .map((t) => `<span class="tag">${esc(t)}</span>`)
        .join("");
    }

    // Game player
    let embedLoaded = false;

    if (game.status === "ready" && game.embedUrl && frame && placeholder) {
      try {
        const u = new URL(game.embedUrl);

        if (["https:", "http:"].includes(u.protocol)) {
          frame.src = u.href;
          frame.classList.remove("hidden");
          placeholder.classList.add("hidden");

          const playerLabel = document.querySelector("#player-label");
          if (playerLabel) playerLabel.textContent = "Playing now";

          embedLoaded = true;
        }
      } catch (_) {
        embedLoaded = false;
      }
    }

    // Guide / preview mode if game is not playable
    if (!embedLoaded) {
      const playerLabel = document.querySelector("#player-label");
      const headingEl = document.querySelector("#placeholder-heading");
      const textEl = document.querySelector("#placeholder-text");

      if (playerLabel) playerLabel.textContent = "Guide & preview mode";

      if (headingEl) {
        headingEl.textContent = `${game.title} — Guide`;
      }

      if (textEl) {
        textEl.innerHTML =
          `This game guide is available on Appigo. ` +
          `We are working to make the game playable directly here.`;
      }

      if (frame) frame.classList.add("hidden");
      if (placeholder) placeholder.classList.remove("hidden");
    }

    // Source link
    if (sourceLink) {
      if (game.sourceUrl) {
        sourceLink.href = game.sourceUrl;
        sourceLink.classList.remove("hidden");
      } else {
        sourceLink.classList.add("hidden");
      }
    }

    // Legacy pages build related links at runtime. Generated pages keep
    // their pre-rendered, category-matched related links from the HTML.
    if (!bodyId) {
      const sameCat = games.filter(
        (g) => g.id !== game.id && g.category === game.category
      );
      const others = games.filter(
        (g) => g.id !== game.id && g.category !== game.category
      );
      const related = [...sameCat, ...others].slice(0, 4);
      const relatedGrid = document.querySelector("#related-grid");

      if (relatedGrid) {
        relatedGrid.innerHTML = related
          .map((g, i) => `
            <a class="game-card" href="${gameUrl(g.id)}">
              <div class="game-thumb" style="background:${palettes[i % palettes.length]}">
                <span class="game-badge">
                  ${g.status === "ready" && g.embedUrl ? "PLAY NOW" : "GUIDE READY"}
                </span>
                <span class="game-emoji" aria-hidden="true">
                  ${esc(g.emoji || "🎮")}
                </span>
              </div>
              <div class="card-body">
                <h3 class="card-title">${esc(g.title)}</h3>
                <div class="card-meta">
                  <span>${esc(g.category || "Games")}</span>
                  <span>${esc(g.players || "Browser")}</span>
                </div>
                <span class="card-cta">VIEW GAME →</span>
              </div>
            </a>
          `)
          .join("");
      }
    }
  })
  .catch(() => {
    const titleEl = document.querySelector("#game-title");
    if (titleEl) titleEl.textContent = "Unable to load game";
  });

// Fullscreen
fullscreen?.addEventListener("click", async () => {
  const target = frame?.classList.contains("hidden") ? shell : frame;

  try {
    if (!document.fullscreenElement) {
      await target?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (_) {
    const label = document.querySelector("#player-label");
    if (label) {
      label.textContent = "Fullscreen is not available in this browser.";
    }
  }
});

// Footer year
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
