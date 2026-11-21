const params = new URLSearchParams(location.search);
const id = params.get("id");

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

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function injectSchema(game) {
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
        "url": `${location.origin}/game/?id=${encodeURIComponent(game.id)}`
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
    blocks.push(`<h3>Frequently Asked Questions</h3><div class="faq-list">${faqHtml}</div>`);
  }

  container.innerHTML = blocks.join("");
}

fetch("/data/games.json")
  .then((r) => {
    if (!r.ok) throw new Error("Failed to load games");
    return r.json();
  })
  .then((data) => {
    const games = data.games || [];
    const game = games.find((g) => g.id === id) || games[0];
    if (!game) {
      document.querySelector("#game-title").textContent = "Game not found";
      return;
    }

    const pageTitle = `${game.title} — Play Free Online on Appigo`;
    const metaDesc = game.shortDescription || `Play ${game.title} online for free on Appigo. Learn controls, gameplay tips, and strategies.`;

    document.title = pageTitle;
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.content = metaDesc;

    document.querySelector("#crumb-title").textContent = game.title;
    document.querySelector("#crumb-category").textContent = game.category || "Games";
    document.querySelector("#game-title").textContent = game.title;
    document.querySelector("#game-category").textContent = game.category || "—";
    document.querySelector("#game-players").textContent = game.players || "Single Player";
    document.querySelector("#game-controls").textContent = game.controls || "Keyboard / Mouse";

    const iconEl = document.querySelector("#placeholder-icon");
    if (iconEl) iconEl.textContent = game.emoji || "🎮";

    renderSections(game);
    injectSchema(game);

    document.querySelector("#game-tags").innerHTML = (game.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");

    let embedLoaded = false;
    if (game.status === "ready" && game.embedUrl) {
      try {
        const u = new URL(game.embedUrl);
        if (["https:", "http:"].includes(u.protocol)) {
          frame.src = u.href;
          frame.classList.remove("hidden");
          placeholder.classList.add("hidden");
          document.querySelector("#player-label").textContent = "Playing now";
          embedLoaded = true;
        }
      } catch (_) {
        embedLoaded = false;
      }
    }

    if (!embedLoaded) {
      document.querySelector("#player-label").textContent = "Guide & preview mode";
      const headingEl = document.querySelector("#placeholder-heading");
      const textEl = document.querySelector("#placeholder-text");
      if (headingEl) headingEl.textContent = `${game.title} — Embed Slot Ready`;
      if (textEl) {
        textEl.innerHTML = `Add a verified embed URL for <strong>${esc(game.title)}</strong> in <code>/data/games.json</code> and set <code>"status": "ready"</code> to enable direct play here.`;
      }
    }

    if (game.sourceUrl) {
      sourceLink.href = game.sourceUrl;
      sourceLink.classList.remove("hidden");
    }

    const sameCat = games.filter((g) => g.id !== game.id && g.category === game.category);
    const others = games.filter((g) => g.id !== game.id && g.category !== game.category);
    const related = [...sameCat, ...others].slice(0, 4);

    document.querySelector("#related-grid").innerHTML = related
      .map((g, i) => `
        <a class="game-card" href="/game/?id=${encodeURIComponent(g.id)}">
          <div class="game-thumb" style="background:${palettes[i % palettes.length]}">
            <span class="game-badge">${g.status === "ready" && g.embedUrl ? "PLAY NOW" : "GUIDE READY"}</span>
            <span class="game-emoji" aria-hidden="true">${esc(g.emoji || "🎮")}</span>
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(g.title)}</h3>
            <div class="card-meta">
              <span>${esc(g.category)}</span>
              <span>${esc(g.players || "Browser")}</span>
            </div>
            <span class="card-cta">VIEW GAME →</span>
          </div>
        </a>
      `)
      .join("");
  })
  .catch(() => {
    document.querySelector("#game-title").textContent = "Unable to load game";
  });

fullscreen?.addEventListener("click", async () => {
  const target = frame.classList.contains("hidden") ? shell : frame;
  try {
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (_) {
    document.querySelector("#player-label").textContent = "Fullscreen is not available in this browser.";
  }
});

const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
