#!/usr/bin/env python3
"""Rebuild screenshot highlights at the original resolution (requires Pillow).

Sources are immutable Git blobs recorded in screenshot-highlights.json, so a
second run never draws over the first run. Only selected UI text/result regions
are framed; no content is replaced. Run from any working directory.
"""
from __future__ import annotations

import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).with_name('screenshot-highlights.json')


def render(entry: dict) -> None:
    data = subprocess.check_output(
        ['git', 'cat-file', 'blob', entry['original_blob']], cwd=ROOT
    )
    image = Image.open(io.BytesIO(data)).convert('RGB')
    width, height = image.size
    draw = ImageDraw.Draw(image)
    stroke = max(3, round(width / 400))
    padding = max(5, round(width / 250))
    for box in entry['boxes']:
        x, y, w, h = box['rect']
        assert 0 <= x < 1 and 0 <= y < 1 and w > 0 and h > 0
        assert x + w <= 1.001 and y + h <= 1.001
        # Place both strokes outside the recognized text, not over its glyphs.
        rect = (
            max(1, round(x * width) - padding - stroke),
            max(1, round(y * height) - padding - stroke),
            min(width - 2, round((x + w) * width) + padding + stroke),
            min(height - 2, round((y + h) * height) + padding + stroke),
        )
        draw.rectangle(rect, outline='white', width=stroke + 2)
        inner = tuple(value + (1 if i < 2 else -1) for i, value in enumerate(rect))
        draw.rectangle(inner, outline='#d61946', width=stroke)
    destination = ROOT / entry['path']
    assert destination.is_relative_to(ROOT / 'temy')
    image.save(destination, optimize=True)


def main() -> None:
    entries = json.loads(MANIFEST.read_text())
    paths = [entry['path'] for entry in entries]
    assert len(set(paths)) == len(paths), 'Duplicate screenshot'
    for entry in entries:
        render(entry)
    print(f'Highlighted {len(entries)} screenshots without resizing.')


if __name__ == '__main__':
    main()
