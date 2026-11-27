// Trigger a fresh Cloudflare build
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GAMES_FILE = path.join(ROOT, "data", "games.json");
const TEMPLATE_FILE = path.join(ROOT, "game", "index.html");

// اختبار أول 3 صفحات فقط
const TEST_IDS = [
  "hill-climb-racing-lite",
  "chess-master-online",
  "8-ball-billiards-club"
];

const gamesData = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8"));
const games = Array.isArray(gamesData) ? gamesData : gamesData.games;

const template = fs.readFileSync(TEMPLATE_FILE, "utf8");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanDescription(game) {
  const text =
    game.shortDescription ||
    game.overview ||
    `Play ${game.title} online for free on Appigo.`;

  return String(text).replace(/\s+/g, " ").trim().slice(0, 160);
}

function generatePage(game) {
  const id = encodeURIComponent(game.id);
  const canonical = `https://appigo.site/game/${id}/`;
  const title = `${game.title} - Play Online Free | Appigo`;
  const description = cleanDescription(game);

  let html = template;

  // عنوان الصفحة
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  // وصف الصفحة
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}">`
  );

  // Canonical URL
  html = html.replace(
    /<\/head>/i,
    `\n<link rel="canonical" href="${canonical}">\n</head>`
  );

  // إضافة معرف اللعبة للصفحة ليسهل على game.js قراءته
  html = html.replace(
    /<body([^>]*)>/i,
    `<body$1 data-game-id="${escapeHtml(game.id)}">`
  );

  const outputDir = path.join(ROOT, "game", game.id);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "index.html"),
    html,
    "utf8"
  );

  console.log(`Generated: ${canonical}`);
}

let generated = 0;

for (const id of TEST_IDS) {
  const game = games.find((item) => item.id === id);

  if (!game) {
    console.log(`Skipped: game not found -> ${id}`);
    continue;
  }

  generatePage(game);
  generated++;
}

console.log(`\nFinished. Generated ${generated} test pages.`);
