
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GAMES_FILE = path.join(ROOT, "data", "games.json");
const TEMPLATE_FILE = path.join(ROOT, "game", "index.html");
const OUTPUT_DIR = path.join(ROOT, "game");

const SITE_URL = "https://appigo.site";

const CATEGORY_KEYWORDS = {
  Racing: ["racing games", "driving games", "car games"],
  Puzzle: ["puzzle games", "brain games", "logic games"],
  Arcade: ["arcade games", "casual games", "classic arcade games"],
  Action: ["action games", "online action games"],
  Simulation: ["simulation games", "simulator games"],
  Adventure: ["adventure games", "adventure challenges"],
  Strategy: ["strategy games", "thinking games"],
  Sports: ["sports games", "online sports games"]
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function makeDescription(game, playable) {
  const source = cleanText(
    game.shortDescription || game.overview || ""
  );

  const text = playable
    ? `Play ${game.title} online on Appigo. ${source}`
    : `Explore the ${game.title} game guide on Appigo. ${source}`;

  return text.slice(0, 160);
}

function replaceElement(html, id, content) {
  const pattern = new RegExp(
    `(<([a-z][a-z0-9]*)\\b[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`,
    "i"
  );

  return html.replace(pattern, (_, opening, tag, closing) =>
    `${opening}${content}${closing}`
  );
}

function replaceTextElement(html, id, value) {
  return replaceElement(html, id, escapeHtml(value));
}

function makeKeywords(game) {
  const category = game.category || "Games";
  const categoryTerms = CATEGORY_KEYWORDS[category] || [
    `${category.toLowerCase()} games`,
    "online browser games"
  ];

  return [
    game.title,
    `${game.title} game`,
    `play ${game.title} online`,
    ...categoryTerms,
    ...(Array.isArray(game.tags) ? game.tags : [])
  ].filter(Boolean);
}

function makeSections(game, keywords, playable) {
  const title = escapeHtml(game.title);
  const category = escapeHtml(game.category || "Games");
  const description = escapeHtml(
    cleanText(game.overview || game.shortDescription || "")
  );

  const howToPlay = escapeHtml(cleanText(game.howToPlay || ""));
  const controls = escapeHtml(cleanText(game.controls || ""));
  const tips = escapeHtml(cleanText(game.tips || ""));

  const relatedTerms = keywords
    .slice(2, 5)
    .map(escapeHtml)
    .join(", ");

  let html = `
    <section class="seo-intro">
      <h2>${playable ? `Play ${title} Online` : `${title} Game Guide`}</h2>
      ${description ? `<p>${description}</p>` : ""}
      <p>
        ${title} is listed in our ${category} collection.
        Explore its gameplay, instructions and useful tips.
        ${relatedTerms ? `Related topics include ${relatedTerms}.` : ""}
      </p>
    </section>
  `;

  if (howToPlay) {
    html += `
      <section>
        <h2>How to Play ${title}</h2>
        <p>${howToPlay}</p>
      </section>
    `;
  }

  if (controls) {
    html += `
      <section>
        <h2>${title} Controls</h2>
        <p>${controls}</p>
      </section>
    `;
  }

  if (tips) {
    html += `
      <section>
        <h2>${title} Tips and Strategies</h2>
        <p>${tips}</p>
      </section>
    `;
  }

  if (Array.isArray(game.faq) && game.faq.length) {
    const questions = game.faq
      .filter((item) => item && item.q && item.a)
      .map((item) => `
        <div class="faq-item">
          <h3>${escapeHtml(item.q)}</h3>
          <p>${escapeHtml(item.a)}</p>
        </div>
      `)
      .join("");

    if (questions) {
      html += `
        <section class="game-faq">
          <h2>Frequently Asked Questions About ${title}</h2>
          <div class="faq-list">${questions}</div>
        </section>
      `;
    }
  }

  return html;
}

function makeSchema(game, canonical, description) {
  const graph = [
    {
      "@type": "VideoGame",
      "name": game.title,
      "genre": game.category || "Game",
      "gamePlatform": "Web Browser",
      "applicationCategory": "Game",
      "operatingSystem": "Any",
      "description": description,
      "url": canonical
    }
  ];

  if (Array.isArray(game.faq) && game.faq.length) {
    const questions = game.faq
      .filter((item) => item && item.q && item.a)
      .map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }));

    if (questions.length) {
      graph.push({
        "@type": "FAQPage",
        "mainEntity": questions
      });
    }
  }

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph
  }).replace(/</g, "\\u003c");
}

function makeRelatedGames(game, games) {
  const related = games
    .filter((item) =>
      item.id !== game.id &&
      item.category === game.category &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)
    )
    .slice(0, 4);

  if (!related.length) return "";

  return `
    <section class="games-section related-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">EXPLORE MORE</p>
          <h2>More ${escapeHtml(game.category || "Games")} Games</h2>
        </div>
      </div>
      <div class="game-grid game-grid-small" id="related-grid">
        ${related.map((item) => `
          <a class="game-card" href="/game/${encodeURIComponent(item.id)}/">
            <div class="game-thumb">
              <span class="game-emoji" aria-hidden="true">
                ${escapeHtml(item.emoji || "🎮")}
              </span>
            </div>
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(item.title)}</h3>
              <div class="card-meta">
                <span>${escapeHtml(item.category || "Games")}</span>
              </div>
              <span class="card-cta">VIEW GAME →</span>
            </div>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function generatePage(game, games, template) {
  if (!game.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id)) {
    console.log(`Skipped invalid ID: ${game.id || "empty"}`);
    return "skipped";
  }

  const canonical = `${SITE_URL}/game/${game.id}/`;
  const playable = game.status === "ready" && Boolean(game.embedUrl);
  const keywords = makeKeywords(game);
  const description = makeDescription(game, playable);

  const overview = cleanText(game.overview || game.shortDescription || "");
  const howToPlay = cleanText(game.howToPlay || "");

  // Thin pages should not be targeted for indexing.
  const indexable =
    overview.length >= 80 &&
    howToPlay.length >= 40;

  const pageTitle = playable
    ? `${game.title} - Play Online Free | Appigo`
    : `${game.title} Game Guide & Tips | Appigo`;

  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(pageTitle)}</title>`
  );

  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}">`
  );

  html = html.replace(
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${indexable ? "index, follow" : "noindex, follow"}">`
  );

  // Add canonical only once.
  html = html.replace(
    /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
    ""
  );

  html = html.replace(
    /<\/head>/i,
    `\n<link rel="canonical" href="${canonical}">\n` +
    `<script type="application/ld+json">${makeSchema(game, canonical, description)}</script>\n</head>`
  );

  html = html.replace(
    /<html([^>]*)>/i,
    '<html$1 lang="en">'
  );

  html = html.replace(
    /<body([^>]*)>/i,
    `<body$1 data-game-id="${escapeHtml(game.id)}">`
  );

  html = replaceTextElement(html, "crumb-category", game.category || "Games");
  html = replaceTextElement(html, "crumb-title", game.title);
  html = replaceTextElement(html, "game-title", game.title);
  html = replaceTextElement(html, "game-category", game.category || "Games");
  html = replaceTextElement(html, "game-players", game.players || "Single Player");
  html = replaceTextElement(html, "game-controls", game.controls || "See game instructions");
  html = replaceTextElement(html, "placeholder-icon", game.emoji || "🎮");

  html = replaceTextElement(
    html,
    "placeholder-heading",
    playable ? `Play ${game.title} Online` : `${game.title} — Coming Soon`
  );

  html = replaceTextElement(
    html,
    "placeholder-text",
    playable
      ? `Start playing ${game.title} online on Appigo.`
      : `This ${game.category || "game"} guide is available on Appigo. The playable version is not available yet.`
  );

  html = replaceElement(
    html,
    "game-sections",
    makeSections(game, keywords, playable)
  );

  const tags = Array.isArray(game.tags)
    ? game.tags.map((tag) =>
        `<span class="tag">${escapeHtml(tag)}</span>`
      ).join("")
    : "";

  html = replaceElement(html, "game-tags", tags);

  // Keep useful related-game links in the original HTML.
  const related = makeRelatedGames(game, games);
  if (related) {
    html = html.replace(
      /<section class="games-section related-section">[\s\S]*?<\/section>/i,
      related
    );
  }

  const outputDir = path.join(OUTPUT_DIR, game.id);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "index.html"),
    html,
    "utf8"
  );

  console.log(`Generated: ${canonical} (${indexable ? "index" : "noindex"})`);

  return indexable ? "indexable" : "noindex";
}

function main() {
  if (!fs.existsSync(GAMES_FILE)) {
    throw new Error("Cannot find data/games.json");
  }

  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error("Cannot find game/index.html");
  }

  const data = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8"));
  const games = Array.isArray(data) ? data : data.games;

  if (!Array.isArray(games)) {
    throw new Error("games.json does not contain a games array");
  }

  const template = fs.readFileSync(TEMPLATE_FILE, "utf8");

  let generated = 0;
  let indexable = 0;
  let noindex = 0;
  let skipped = 0;

  const seen = new Set();

  for (const game of games) {
    if (!game || seen.has(game.id)) {
      skipped++;
      continue;
    }

    seen.add(game.id);

    const result = generatePage(game, games, template);

    if (result === "indexable") {
      generated++;
      indexable++;
    } else if (result === "noindex") {
      generated++;
      noindex++;
    } else {
      skipped++;
    }
  }

  console.log("\n========== APPIGO SEO BUILD ==========");
  console.log(`Total games: ${games.length}`);
  console.log(`Generated pages: ${generated}`);
  console.log(`Indexable pages: ${indexable}`);
  console.log(`Noindex pages: ${noindex}`);
  console.log(`Skipped / duplicate: ${skipped}`);
  console.log("======================================");
}

main();
