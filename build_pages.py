#!/usr/bin/env python3
"""
Build script for GitHub Pages deployment.
Converts Flask templates into a static dist/ bundle.
"""
import pathlib
import re
import shutil

ROOT_DIR = pathlib.Path(__file__).resolve().parent
DIST_DIR = ROOT_DIR / "dist"
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"


def build():
    print(f"Building static site into: {DIST_DIR}")
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Copy static assets (css, js, images)
    target_static = DIST_DIR / "static"
    if STATIC_DIR.exists():
        shutil.copytree(STATIC_DIR, target_static, dirs_exist_ok=True)
        print("[OK] Copied static assets")

    # 2. Process templates/index.html to remove Flask Jinja url_for syntax
    index_src = TEMPLATES_DIR / "index.html"
    if not index_src.exists():
        raise FileNotFoundError(f"Missing {index_src}")

    content = index_src.read_text(encoding="utf-8")

    # Replace {{ url_for('static', filename='XYZ') }} with static/XYZ
    pattern = r"\{\{\s*url_for\(['\"]static['\"],\s*filename=['\"]([^'\"]+)['\"]\)\s*\}\}"
    cleaned_content = re.sub(pattern, r"static/\1", content)

    out_file = DIST_DIR / "index.html"
    out_file.write_text(cleaned_content, encoding="utf-8")
    print(f"[OK] Generated {out_file}")

    print("Build complete! Ready for GitHub Pages deployment.")


if __name__ == "__main__":
    build()
