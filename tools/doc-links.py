#!/usr/bin/env python3
"""Check every link in the Markdown and HTML files of a repo.

Usage:
  doc-links [ROOT]     Check the links under ROOT (default: the current folder).

Fails on a relative link to a missing file, a missing #heading, or a missing
^block, and on a wikilink that matches no note. A #heading matches the heading
text or its GitHub-style slug. A link that starts with "/" starts at ROOT. In a
git repo, only the files that git tracks or does not ignore are checked. Exit
code 0 means no broken link.
"""
import html, os, re, subprocess, sys
from urllib.parse import unquote

TOOL_VERSION = "0.1.0"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/

MD_LINK = re.compile(r"!?\[(?:[^\]\\]|\\.)*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
WIKI = re.compile(r"!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]")
HREF = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']""", re.I)
BLOCK = re.compile(r"(?:^|\s)\^([A-Za-z0-9-]+)\s*$", re.M)
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$", re.M)
FENCE = re.compile(r"^(```+|~~~+)[^\n]*\n.*?^\1\s*$", re.M | re.S)
INLINE = re.compile(r"`[^`\n]+`")


def slug(heading):
    """GitHub-style anchor, the same as render-docs: keep word characters, "-" and "_"."""
    return re.sub(r" ", "-", re.sub(r"[^\w\- ]", "", heading.strip().lower()))


def targets(path, cache={}):
    """Headings (as text and slug) and block IDs a file defines."""
    if path not in cache:
        try:
            text = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            text = ""
        heads = [h[1] for h in HEADING.findall(FENCE.sub("", text))]
        cache[path] = ({h.lower() for h in heads} | {slug(h) for h in heads}
                       | set(re.findall(r'\bid="([^"]+)"', text)), set(BLOCK.findall(text)))
    return cache[path]


def repo_files(root):
    """The files git knows (tracked, or new and not ignored). Outside git: a walk that skips dot folders."""
    out = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                         capture_output=True, text=True, cwd=root)
    if out.returncode == 0:
        return sorted({os.path.join(root, f) for f in out.stdout.split("\0") if f and os.path.isfile(os.path.join(root, f))})
    files = []
    for d, dirs, names in os.walk(root):
        dirs[:] = [x for x in dirs if not x.startswith(".") and x != "node_modules"]
        files += [os.path.join(d, n) for n in names]
    return files


def check(root):
    root = os.path.abspath(root)
    files, notes = [], {}
    for p in repo_files(root):
        n = os.path.basename(p)
        if n.endswith((".md", ".html")):
            files.append(p)
        notes.setdefault(os.path.splitext(n)[0].lower(), []).append(p)
        notes.setdefault(n.lower(), []).append(p)
        rel = os.path.relpath(p, root)
        notes.setdefault(os.path.splitext(rel)[0].lower(), []).append(p)
    bad = 0

    def check_anchor(target_file, anchor, where, raw):
        nonlocal bad
        if not anchor or not target_file.endswith(".md"):
            return
        heads, blocks = targets(target_file)
        ok = anchor[1:] in blocks if anchor.startswith("^") else (anchor.lower() in heads or slug(anchor) in heads)
        if not ok:
            bad += 1
            print(f"{where}: missing anchor in {os.path.relpath(target_file, root)}: {raw}")

    for f in files:
        text = open(f, encoding="utf-8", errors="replace").read()
        body = INLINE.sub(" ", FENCE.sub("", text))
        found = HREF.findall(body) if f.endswith(".html") else MD_LINK.findall(body) + HREF.findall(body)
        for raw in found:
            if re.match(r"^[a-z][a-z0-9+.-]*:", raw, re.I) or raw.startswith("//"):
                continue
            path, _, frag = unquote(html.unescape(raw)).partition("#")
            base = root if path.startswith("/") else os.path.dirname(f)  # "/x.md" starts at the repo root, as on GitHub
            tgt = f if not path else os.path.normpath(os.path.join(base, path.lstrip("/")))
            where = os.path.relpath(f, root)
            if not os.path.exists(tgt):
                bad += 1
                print(f"{where}: missing file: {raw}")
                continue
            check_anchor(tgt, frag, where, raw)
        if f.endswith(".md"):
            for raw in WIKI.findall(body):
                name, _, frag = raw.partition("#")
                where = os.path.relpath(f, root)
                hits = notes.get(name.strip().lower(), []) if name.strip() else [f]
                if not hits:
                    bad += 1
                    print(f"{where}: wikilink matches no note: [[{raw}]]")
                    continue
                if frag:
                    check_anchor(hits[0], frag, where, f"[[{raw}]]")
    print(f"doc-links: {bad} broken link(s) in {len(files)} file(s)")
    return 1 if bad else 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if len(args) > 1 or len(args) != len(sys.argv[1:]):
        sys.exit(__doc__)
    sys.exit(check(args[0] if args else "."))
