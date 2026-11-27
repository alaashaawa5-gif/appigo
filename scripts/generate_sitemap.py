import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

BASE_URL = "https://appigo.site"
GAMES_FILE = Path("data/games.json")
SITEMAP_FILE = Path("sitemap.xml")

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)


def normalize_title(title):
    return re.sub(r"[^a-z0-9]", "", str(title).lower())


def normalize_embed(url):
    if not url:
        return ""
    parts = urlsplit(str(url).strip())
    return urlunsplit((
        parts.scheme.lower(),
        parts.netloc.lower(),
        parts.path.rstrip("/"),
        "",
        ""
    ))


def load_games():
    raw = GAMES_FILE.read_bytes()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw.decode("cp1252")
    data = json.loads(content)
    return data.get("games", []) if isinstance(data, dict) else data


def is_indexable(game):
    overview = str(game.get("overview") or game.get("shortDescription") or "").strip()
    how_to_play = str(game.get("howToPlay") or "").strip()
    return len(overview) >= 80 and len(how_to_play) >= 40


def main():
    games = load_games()

    # Prefer playable versions if duplicate titles or embeds ever appear.
    games.sort(
        key=lambda game: (
            game.get("status") == "ready" and bool(game.get("embedUrl")),
            bool(game.get("overview")),
            bool(game.get("howToPlay"))
        ),
        reverse=True
    )

    root = ET.Element(f"{{{NS}}}urlset")
    static_pages = ["/", "/about.html", "/privacy.html", "/contact.html"]

    added_ids = set()
    added_titles = set()
    added_embeds = set()
    added_game_count = 0

    def add_url(url):
        node = ET.SubElement(root, f"{{{NS}}}url")
        ET.SubElement(node, f"{{{NS}}}loc").text = url

    for page in static_pages:
        add_url(BASE_URL + page)

    for game in games:
        game_id = str(game.get("id", "")).strip()
        title = str(game.get("title", "")).strip()
        embed = normalize_embed(game.get("embedUrl", ""))

        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", game_id):
            continue
        if game_id in added_ids or not is_indexable(game):
            continue

        title_key = normalize_title(title)
        if title_key and title_key in added_titles:
            continue
        if embed and embed in added_embeds:
            continue

        # Use the same clean URL as each generated page's canonical tag.
        add_url(f"{BASE_URL}/game/{quote(game_id, safe='-_.~')}/")
        added_ids.add(game_id)
        if title_key:
            added_titles.add(title_key)
        if embed:
            added_embeds.add(embed)
        added_game_count += 1

    ET.ElementTree(root).write(
        SITEMAP_FILE,
        encoding="UTF-8",
        xml_declaration=True
    )

    print("Sitemap generated successfully!")
    print(f"Indexable game pages included: {added_game_count}")
    print(f"Total URLs: {added_game_count + len(static_pages)}")


if __name__ == "__main__":
    main()
