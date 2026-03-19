#!/usr/bin/env python3
from __future__ import annotations

import html
import shutil
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPO_ROOT / "docs" / "config.yaml"
DIST_DIR = REPO_ROOT / ".site-dist"
DIST_ASSETS = DIST_DIR / "assets"


def read_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def ensure_clean_dist() -> None:
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_ASSETS.mkdir(parents=True, exist_ok=True)


def copy_asset(source: Path, relative_target: str) -> str:
    target = DIST_DIR / relative_target
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return relative_target.replace("\\", "/")


def render_nav(items: list[dict]) -> str:
    links = [
        f'<a href="#{html.escape(item["anchor"])}">{html.escape(item["label"])}</a>'
        for item in items
    ]
    return "\n".join(links)


def render_cards(items: list[dict]) -> str:
    return "\n".join(
        f"""
        <article class="card">
          <h3>{html.escape(item["title"])}</h3>
          <p>{html.escape(item["body"])}</p>
        </article>
        """.strip()
        for item in items
    )


def render_pills(items: list[str]) -> str:
    return "\n".join(f'<div class="pill">{html.escape(item)}</div>' for item in items)


def render_screenshots(screenshots: list[dict]) -> str:
    rendered = []
    for screenshot in screenshots:
        path = copy_asset(REPO_ROOT / screenshot["path"], screenshot["path"])
        rendered.append(
            f"""
            <article class="screenshot-card">
              <img src="{html.escape(path)}" alt="{html.escape(screenshot['title'])}" />
              <h3>{html.escape(screenshot["title"])}</h3>
              <p>{html.escape(screenshot["caption"])}</p>
            </article>
            """.strip()
        )
    return "\n".join(rendered)


def render_topics(items: list[str]) -> str:
    return "\n".join(f'<div class="pill">#{html.escape(item)}</div>' for item in items)


def compact_text(raw_text: str) -> str:
    return " ".join(raw_text.split())


def absolute_asset_url(base_url: str, relative_path: str) -> str:
    return base_url.rstrip("/") + "/" + relative_path.lstrip("/")


def write_index(config: dict) -> None:
    qr_path = copy_asset(REPO_ROOT / "docs" / "assets" / "qr-code.png", "assets/qr-code.png")
    css_path = copy_asset(REPO_ROOT / "docs" / "assets" / "site.css", "assets/site.css")
    icon_path = copy_asset(REPO_ROOT / "assets" / "icon.png", "assets/icon.png")

    site = config["site"]
    repository = config["repository"]
    owner = config["owner"]
    hero = config["hero"]
    product = config["product"]
    distribution = config["distribution"]
    support = config["support"]
    social_image_path = copy_asset(REPO_ROOT / site["social_image"], site["social_image"])
    description_text = compact_text(site["description"])
    keywords = ", ".join(repository["topics"])
    social_image_url = absolute_asset_url(site["homepage_url"], social_image_path)

    html_output = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html.escape(site['title'])}</title>
    <meta name="description" content="{html.escape(description_text)}" />
    <meta name="keywords" content="{html.escape(keywords)}" />
    <meta name="theme-color" content="{html.escape(site['theme_color'])}" />
    <link rel="canonical" href="{html.escape(site['canonical_url'])}" />
    <link rel="icon" href="{html.escape(icon_path)}" />
    <meta property="og:site_name" content="{html.escape(site['name'])}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{html.escape(site['title'])}" />
    <meta property="og:description" content="{html.escape(description_text)}" />
    <meta property="og:url" content="{html.escape(site['canonical_url'])}" />
    <meta property="og:image" content="{html.escape(social_image_url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{html.escape(site['title'])}" />
    <meta name="twitter:description" content="{html.escape(description_text)}" />
    <meta name="twitter:image" content="{html.escape(social_image_url)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="{html.escape(css_path)}" />
  </head>
  <body>
    <header class="topbar">
      <div class="page-shell topbar-inner">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true"></div>
          <div class="brand-copy">
            <strong>{html.escape(site['name'])}</strong>
            <span>{html.escape(site['tagline'])}</span>
          </div>
        </div>
        <nav class="nav">
          {render_nav(config['navigation'])}
        </nav>
      </div>
    </header>

    <main class="page-shell">
      <section class="hero" id="overview">
        <div class="panel hero-copy">
          <span class="eyebrow">{html.escape(hero['eyebrow'])}</span>
          <h1>{html.escape(site['tagline'])}</h1>
          <p>{html.escape(site['description'])}</p>
          <p>{html.escape(site['release_badge'])}</p>
          <div class="cta-row">
            <a class="button button-primary" href="{html.escape(hero['primary_cta']['url'])}">{html.escape(hero['primary_cta']['label'])}</a>
            <a class="button button-secondary" href="{html.escape(hero['secondary_cta']['url'])}">{html.escape(hero['secondary_cta']['label'])}</a>
          </div>
        </div>
        <aside class="panel hero-card">
          <div>
            <p class="eyebrow">Built by {html.escape(owner['name'])}</p>
            <p>{html.escape(owner['role'])}</p>
          </div>
          <div class="stat-list">
            <div class="stat">
              <strong>3</strong>
              <span>physical knobs centered on the Nano workflow</span>
            </div>
            <div class="stat">
              <strong>Linux</strong>
              <span>PipeWire and PulseAudio-first product positioning</span>
            </div>
            <div class="stat">
              <strong>Pages</strong>
              <span>public product surface generated from YAML metadata</span>
            </div>
            <div class="stat">
              <strong>Releases</strong>
              <span>automated tags, changelog flow, and binary bundles</span>
            </div>
          </div>
        </aside>
      </section>

      <section class="section" id="runtime">
        <div class="section-header">
          <div>
            <h2>Runtime direction</h2>
            <p>Ioruba is moving toward a cleaner Haskell-first runtime that can be shipped, tested, and reasoned about without depending on the historical legacy UI path.</p>
          </div>
        </div>
        <div class="card-grid">
          {render_cards(config['highlights'])}
        </div>
      </section>

      <section class="section" id="hardware">
        <div class="section-header">
          <div>
            <h2>Hardware fit</h2>
            <p>The public-facing messaging now matches the actual Arduino Nano 3-knob workflow, making the project easier to understand, distribute, and support.</p>
          </div>
        </div>
        <div class="pill-list">
          {render_pills(product['audience'])}
        </div>
        <div class="pill-list" style="margin-top: 16px;">
          {render_pills(product['pillars'])}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Screenshots</h2>
            <p>Current UI direction and release-facing visuals pulled directly from the repository.</p>
          </div>
        </div>
        <div class="screenshot-grid">
          {render_screenshots(config['screenshots'])}
        </div>
      </section>

      <section class="section" id="distribution">
        <div class="section-header">
          <div>
            <h2>Distribution and release path</h2>
            <p>Release Please handles version PRs and tagging, release workflows build binary bundles, and GitHub Pages becomes the public landing surface for the project.</p>
          </div>
        </div>
        <div class="pill-list">
          {render_pills(distribution['items'])}
        </div>
        <div class="pill-list" style="margin-top: 16px;">
          {render_topics(repository['topics'])}
        </div>
      </section>

      <section class="section" id="support">
        <div class="section-header">
          <div>
            <h2>Support the project</h2>
            <p>{html.escape(support['sponsors_blurb'])}</p>
          </div>
        </div>
        <div class="support-grid">
          <div class="support-card">
            <strong>Back the product direction</strong>
            <p>{html.escape(support['sponsors_blurb'])}</p>
            <div class="funding-stack">
              <a class="button button-primary" href="{html.escape(owner['sponsors'])}">GitHub Sponsors</a>
              <a class="button button-secondary" href="{html.escape(owner['buy_me_a_coffee'])}">Buy Me a Coffee</a>
            </div>
            <div class="link-list">
              <a href="{html.escape(owner['website'])}">Website</a>
              <a href="{html.escape(owner['github'])}">GitHub</a>
              <a href="{html.escape(owner['linkedin'])}">LinkedIn</a>
              <a href="{html.escape(owner['x'])}">X / Twitter</a>
              <a href="{html.escape(owner['instagram'])}">Instagram</a>
              <a href="{html.escape(owner['email'])}">Email</a>
            </div>
          </div>
          <div class="support-card">
            <h3>Scan to support</h3>
            <p>{html.escape(support['qr_caption'])}</p>
            <div class="funding-stack">
              <img class="qr" src="{html.escape(qr_path)}" alt="Support QR code" />
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="page-shell footer">
      <p><strong>{html.escape(site['name'])}</strong> is maintained by <a href="{html.escape(owner['github'])}">{html.escape(owner['name'])}</a> at {html.escape(owner['company'])}. Portfolio: <a href="{html.escape(owner['website'])}">{html.escape(owner['website'])}</a>.</p>
    </footer>
  </body>
</html>
"""

    (DIST_DIR / "index.html").write_text(html_output, encoding="utf-8")
    write_404_page(site, css_path, icon_path)


def write_404_page(site: dict, css_path: str, icon_path: str) -> None:
    html_output = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html.escape(site['title'])} | Not Found</title>
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="{html.escape(site['theme_color'])}" />
    <link rel="icon" href="{html.escape(icon_path)}" />
    <link rel="stylesheet" href="{html.escape(css_path)}" />
  </head>
  <body>
    <main class="page-shell" style="min-height: 100vh; display: grid; place-items: center;">
      <section class="panel hero-copy" style="max-width: 680px; text-align: center;">
        <span class="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The page you requested does not exist on the Ioruba site. Return to the main project surface to see the runtime, hardware, release, and support information.</p>
        <div class="cta-row" style="justify-content: center;">
          <a class="button button-primary" href="./">Go to the homepage</a>
          <a class="button button-secondary" href="{html.escape(site['repo_url'])}">Open the repository</a>
        </div>
      </section>
    </main>
  </body>
</html>
"""

    (DIST_DIR / "404.html").write_text(html_output, encoding="utf-8")


def main() -> None:
    ensure_clean_dist()
    config = read_config()
    write_index(config)


if __name__ == "__main__":
    main()
