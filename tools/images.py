#!/usr/bin/env python3
"""Картинки для книги: скачивание с Викисклада вместе с лицензией.

Правило: ни одна иллюстрация не попадает в книгу без автора, лицензии и ссылки
на страницу файла — иначе книгу нельзя публиковать. Скрипт кладёт файл в
temy/<глава>/img/<имя> и дописывает строку в temy/<глава>/img/credits.json,
из которого потом собираются подписи.
"""
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
AGENT = "spravochnik-git-makarov/1.0 (bytecampmm@gmail.com)"
ROOT = pathlib.Path(__file__).resolve().parent.parent


def api(**params):
    params.setdefault("format", "json")
    url = API + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=60) as answer:
        return json.load(answer)


def clean(html):
    """Из поля extmetadata приходит HTML — оставляем текст."""
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", "", html)
    return re.sub(r"\s+", " ", text).replace("&amp;", "&").strip()


def info(title, width=0):
    """Ссылка на файл и его лицензия. width>0 — уменьшенная копия."""
    props = "url|extmetadata|size"
    data = api(action="query", titles=title, prop="imageinfo",
               iiprop=props, iiurlwidth=width or 800)
    page = next(iter(data["query"]["pages"].values()))
    if "imageinfo" not in page:
        return None
    item = page["imageinfo"][0]
    meta = item.get("extmetadata", {})
    return {
        "url": item["url"].split("?")[0],
        "thumb": item.get("thumburl", "").split("?")[0],
        "page": item["descriptionurl"],
        "author": clean(meta.get("Artist", {}).get("value")),
        "license": clean(meta.get("LicenseShortName", {}).get("value")),
        "credit": clean(meta.get("Credit", {}).get("value")),
    }


def download(url, target):
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=120) as answer:
        target.write_bytes(answer.read())


def fetch(chapter, items):
    """items: список (имя файла в книге, титул на Викискладе, ширина, подпись)."""
    folder = ROOT / "temy" / chapter / "img"
    folder.mkdir(parents=True, exist_ok=True)
    credits_file = folder / "credits.json"
    credits = json.loads(credits_file.read_text()) if credits_file.exists() else {}

    for name, title, width, caption in items:
        found = info(title, width)
        if not found:
            print(f"НЕТ    {title}")
            continue
        source = found["thumb"] if (width and not name.endswith(".svg")) else found["url"]
        try:
            download(source, folder / name)
        except Exception as error:                      # noqa: BLE001
            print(f"СБОЙ   {title}: {error}")
            continue
        credits[name] = {"title": title, "caption": caption, **found}
        size = (folder / name).stat().st_size
        print(f"ОК     {name:28} {size // 1024:5} КБ  {found['license']}")

    credits_file.write_text(json.dumps(credits, ensure_ascii=False, indent=2))


def search(query, limit=12):
    """Подобрать титул файла, когда точное имя неизвестно."""
    data = api(action="query", generator="search", gsrnamespace=6,
               gsrsearch=query, gsrlimit=limit)
    for page in data.get("query", {}).get("pages", {}).values():
        print(page["title"])


if __name__ == "__main__":
    if sys.argv[1:2] == ["search"]:
        search(" ".join(sys.argv[2:]))
