
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

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
    return data.get("games", [])


def main():
    games = load_games()

    # Prefer playable games when duplicates exist.
    games.sort(
        key=lambda game: (
            game.get("status") == "ready",
            bool(game.get("embedUrl"))
        ),
        reverse=True
    )

    root = ET.Element(f"{{{NS}}}urlset")

    static_pages = [
        "/",
        "/about.html",
        "/privacy.html",
        "/contact.html"
    ]

    added_ids = set()
    added_titles = set()
    added_embeds = set()

    def add_url(url):
        node = ET.SubElement(root, f"{{{NS}}}url")
        ET.SubElement(node, f"{{{NS}}}loc").text = url

    for page in static_pages:
        add_url(BASE_URL + page)

    for game in games:
        game_id = str(game.get("id", "")).strip()
        title = game.get("title", "")
        embed = normalize_embed(game.get("embedUrl", ""))

        if not game_id or game.get("status") != "ready" or not embed:
            continue

        title_key = normalize_title(title)

        if game_id in added_ids:
            continue

        if title_key and title_key in added_titles:
            continue

        if embed in added_embeds:
            continue

        from urllib.parse import quote
        game_url = f"{BASE_URL}/game/?id={quote(game_id, safe='-_.~')}"

        add_url(game_url)

        added_ids.add(game_id)
        if title_key:
            added_titles.add(title_key)
        added_embeds.add(embed)

    tree = ET.ElementTree(root)
    tree.write(
        SITEMAP_FILE,
        encoding="UTF-8",
        xml_declaration=True
    )

    print(f"Sitemap generated successfully!")
    print(f"Games included: {len(added_ids)}")
    print(f"Total URLs: {len(added_ids) + len(static_pages)}")


if __name__ == "__main__":
    main()

