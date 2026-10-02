#!/usr/bin/env python3
"""Render the browser versions of the docs from their Markdown.

The Markdown is the source. Each .html next to it is generated: edit the .md,
then run this script. The pages come from "docArchitecture.renderPages" in
devkit.config.json. Obsidian callouts (> [!note] Title) become styled boxes,
a folded callout (> [!note]- Why) becomes a box that opens on a click, headings
get GitHub-style anchors, and links between rendered docs point at the .html
versions.

Usage:
  render-docs          write every .html
  render-docs --check  exit 1 if any .html is out of date

Needs Python-Markdown: pip3 install markdown==3.9
"""
import html, json, os, re, subprocess, sys

TOOL_VERSION = "0.1.1"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/

try:
    import markdown
except ImportError:
    markdown = None
CALLOUT = re.compile(r"^> \[!(\w+)\]([+-]?) ?(.*)$")

CSS = """
:root{--bg:#0d1117;--panel:#161b22;--line:#30363d;--fg:#e6edf3;--dim:#9198a1;--accent:#a371f7;--ok:#3fb950;--warn:#d29922}
*{box-sizing:border-box}
body{margin:0;padding:48px 24px 96px;background:var(--bg);color:var(--fg);
font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:960px;margin:0 auto}
h1{font-size:1.9rem;margin:0 0 .5em;padding-bottom:.3em;border-bottom:2px solid var(--accent)}
h2{font-size:1.35rem;margin:2.2em 0 .6em;padding-bottom:.3em;border-bottom:1px solid var(--line);color:var(--accent)}
h3{font-size:1.08rem;margin:1.8em 0 .5em}
p{margin:.85em 0}
hr{border:0;border-top:1px solid var(--line);margin:2.4em 0}
table{width:100%;border-collapse:collapse;margin:1.2em 0;font-size:.9rem}
th,td{border:1px solid var(--line);padding:8px 12px;text-align:left;vertical-align:top}
th{background:var(--panel);font-weight:600}
tr:nth-child(even) td{background:rgba(255,255,255,.02)}
ol,ul{padding-left:1.4em}li{margin:.4em 0}
strong{color:#fff;font-weight:600}
code{background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:.12em .4em;
font:.88em ui-monospace,SFMono-Regular,Menlo,monospace}
pre{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow-x:auto}
pre code{background:none;border:0;padding:0}
blockquote{margin:1em 0;padding:.2em 1em;border-left:3px solid var(--line);color:var(--dim)}
a{color:#58a6ff}
.callout{margin:1.2em 0;padding:.6em 1em;border:1px solid var(--line);border-left:3px solid var(--accent);
border-radius:6px;background:var(--panel)}
.callout .ct{font-weight:600;margin:.2em 0}
details.callout summary{cursor:pointer;color:var(--dim)}
details.callout[open] summary{color:var(--fg)}
.callout.warning,.callout.caution{border-left-color:var(--warn)}
.callout.success,.callout.done{border-left-color:var(--ok)}
"""


def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def config(root):
    """The defaults (the plugin defaults file, or devkit-defaults.json next to a project copy), then the project file."""
    here = os.path.dirname(os.path.abspath(__file__))
    defaults = os.path.join(here, "devkit-defaults.json")
    if os.path.basename(here) == "scripts":  # the master copy in the plugin
        defaults = os.path.join(here, "..", "..", "..", "defaults", "devkit.defaults.json")
    arch = {}
    for level in (load(defaults), load(os.path.join(root, "devkit.config.json"))):
        for key, value in level.get("docArchitecture", {}).items():
            arch[key] = {**arch.get(key, {}), **value} if isinstance(value, dict) else value
    return arch


def callouts(md):
    """Turn Obsidian callouts into HTML blocks, rendering their inside as Markdown."""
    out, lines, i = [], md.split("\n"), 0
    while i < len(lines):
        m = CALLOUT.match(lines[i])
        if not m:
            out.append(lines[i])
            i += 1
            continue
        kind, fold, title = m.group(1).lower(), m.group(2), m.group(3)
        body = []
        i += 1
        while i < len(lines) and lines[i].startswith(">"):
            body.append(lines[i][2:] if lines[i].startswith("> ") else lines[i][1:])
            i += 1
        inner = render("\n".join(body))
        if fold:  # "-" starts folded and "+" starts open, as in Obsidian
            label = render_inline(title) if title else kind.title()
            opened = " open" if fold == "+" else ""
            out += ["", f'<details class="callout {kind}"{opened}><summary class="ct">{label}</summary>{inner}</details>', ""]
            continue
        head = f'<div class="ct">{render_inline(title)}</div>' if title else ""
        out += ["", f'<div class="callout {kind}">{head}{inner}</div>', ""]
    return "\n".join(out)


def render_inline(text):
    return re.sub(r"^<p>|</p>$", "", render(text))


def slug(text, sep="-"):
    """GitHub's heading anchors, so one link works on GitHub, in Obsidian and here."""
    return re.sub(r" ", sep, re.sub(r"[^\w\- ]", "", text.strip().lower()))


def render(md):
    return markdown.markdown(md, extensions=["tables", "fenced_code", "sane_lists", "toc"],
                             extension_configs={"toc": {"permalink": False, "slugify": slug}})


def page(root, src, docs):
    md = open(os.path.join(root, src), encoding="utf-8").read()
    if md.startswith("---\n"):
        md = md[md.find("\n---", 4) + 4:]
    title = next((l[2:].strip() for l in md.split("\n") if l.startswith("# ")), src)
    body = render(callouts(md))
    rendered = {os.path.basename(d)[:-3] for d in docs}
    body = re.sub(r'href="([^"#:]*?)([\w-]+)\.md(#[^"]*)?"',
                  lambda m: f'href="{m.group(1)}{m.group(2)}.html{m.group(3) or ""}"'
                  if m.group(2) in rendered else m.group(0), body)
    return (f'<!doctype html>\n<!-- Generated by tools/render-docs.py from {src}. Edit the Markdown. -->\n'
            f'<html lang="en"><meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<title>{html.escape(re.sub(r"[*`]", "", title))}</title><style>{CSS}</style>\n'
            f'<main>\n{body}\n</main>\n')


def main(argv):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
    cfg = config(root)
    docs = cfg.get("renderPages", []) if cfg.get("parts", {}).get("html", True) else []
    if docs and markdown is None:
        sys.exit("render-docs: needs Python-Markdown: pip3 install markdown==3.9")
    stale = []
    for src in docs:
        out = os.path.join(root, src[:-3] + ".html")
        new = page(root, src, docs)
        old = open(out, encoding="utf-8").read() if os.path.exists(out) else None
        if new != old:
            stale.append(src[:-3] + ".html")
            if "--check" not in argv:
                with open(out, "w", encoding="utf-8") as f:
                    f.write(new)
    if "--check" in argv and stale:
        print(f"out of date, run python3 {os.path.relpath(os.path.abspath(__file__), root)}:", *stale, sep="\n  ")
        return 1
    print(f"render-docs: {len(stale)} of {len(docs)} page(s) {'stale' if '--check' in argv else 'written'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
