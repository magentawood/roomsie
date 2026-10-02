#!/usr/bin/env python3
"""Generate the decision ledgers from the decision records, and the Learn lists from the learn pages.

The records in decisionsPath are the only source. Record file names:
  NNNN-slug.md        architecture record, cited as ADR-NNNN
  pd-NN[a]-slug.md    product record, cited as PDNa (when parts.productRecords is on)

The script writes the text between the markers in these files (paths from
"docArchitecture" in devkit.config.json):
  indexFile       <!-- decisions:start --> ... <!-- decisions:end -->  (decisions not settled)
  ledgers.product <!-- ledger:start --> ... <!-- ledger:end -->        (product records)
  ledgers.tech    <!-- ledger:start --> ... <!-- ledger:end -->        (architecture records)
  learnIndex      <!-- learn:start --> ... <!-- learn:end -->          (all learn pages, when parts.learn is on)
  learnTeaser     <!-- learn-newest:start --> ... <!-- learn-newest:end -->  (the newest learn pages)
A ledger file that does not exist gets a heading and the markers.
The Learn index lists each page in learnPath with its "**In one line:**" line.
learnIndex defaults to "{learnPath}/README.md". The teaser links the Learn index and
the learnTeaser.count newest pages, by title only. "Newest" is the latest YYYY-MM-DD
date in the "## Tickets" section of a page. Pages with the same date, and pages with
no date after the dated pages, sort by title. learnTeaser.file defaults to
"{ledgers.tech}", the tech ledger that this run writes. A count of 0, a file of null,
a learnTeaser of null, or no tech ledger for "{ledgers.tech}" turns the teaser off.
The two Learn blocks run only when the learnPath folder exists. The script always
fills markers that are in the file. If the markers or the file are missing, it adds
them at the end of the file, but only when learnPath has at least one learn page.
In the teaser file, it replaces an old Learn index block (0.2.0) with the teaser markers.

Usage:
  build-decision-ledger          write the ledgers
  build-decision-ledger --check  exit 1 if a ledger is out of date
"""
import json, os, posixpath, re, subprocess, sys

TOOL_VERSION = "0.3.0"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/

INDEX_MARKERS = ("<!-- decisions:start -->", "<!-- decisions:end -->")
LEDGER_MARKERS = ("<!-- ledger:start -->", "<!-- ledger:end -->")
LEARN_MARKERS = ("<!-- learn:start -->", "<!-- learn:end -->")
TEASER_MARKERS = ("<!-- learn-newest:start -->", "<!-- learn-newest:end -->")
LEDGER_TITLES = {"product": "Product decisions", "tech": "Architecture decisions"}


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
    arch, top = {}, {}
    for level in (load(defaults), load(os.path.join(root, "devkit.config.json"))):
        top.update(level)
        for key, value in level.get("docArchitecture", {}).items():
            arch[key] = {**arch.get(key, {}), **value} if isinstance(value, dict) else value
    arch["decisionsPath"] = top.get("decisionsPath", "docs/decisions")
    return arch


def records(root, dec, product):
    out = []
    folder = os.path.join(root, dec)
    if not os.path.isdir(folder):
        sys.exit(f"build-decision-ledger: the decisions folder {dec} does not exist")
    for name in os.listdir(folder):
        m = re.match(r"^(?:(\d{4})|pd-(\d{2})([a-z]?))-.*\.md$", name)
        if not m or (m.group(2) and not product):
            continue
        text = open(os.path.join(folder, name), encoding="utf-8").read()
        heading = re.search(r"^# (.+)$", text, re.M)
        title = heading.group(1) if heading else name[:-3]
        title = re.sub(r"^(ADR \d{4}|\d{4}|PD\d+[a-z]?)\s*[—-]\s*", "", title).strip()
        status = re.search(r"\*\*Status:\*\*\s*([^·\n]+)", text)
        oneline = re.search(r"^\*\*In one line:\*\*\s*(.+)$", text, re.M)
        if oneline:
            summary = oneline.group(1).strip()
        else:  # the first sentence of the Decision section
            decision = re.search(r"^## Decisions?\s*\n+(.+?)(?:\n\n|\n## )", text, re.M | re.S)
            first = decision.group(1).strip().split("\n")[0] if decision else ""
            first = re.sub(r"^(?:[-*]\s+|#+\s+(?:\d+\.\s+)?)", "", first)  # a bullet or a numbered heading
            summary = re.sub(r"\*\*|`", "", re.sub(r"^\*\*Decision:\*\*\s*", "", first)).strip()
            summary = re.split(r"(?<=\.)\s", summary)[0]
        if m.group(1):
            key, rid, kind = (0, int(m.group(1)), ""), f"ADR-{m.group(1)}", "tech"
        else:
            key, rid, kind = (1, int(m.group(2)), m.group(3)), f"PD{int(m.group(2))}{m.group(3)}", "product"
        out.append({"key": key, "id": rid, "kind": kind, "path": posixpath.join(dec, name), "title": title,
                    "status": status.group(1).strip() if status else "", "summary": summary})
    return sorted(out, key=lambda r: r["key"])


def rel(target, from_file):
    return posixpath.relpath(target, posixpath.dirname(from_file) or ".")


def table(rows, ledger):
    lines = ["| ID | Decision | Status | In one line |", "|---|---|---|---|"]
    for r in rows:
        summary = r["summary"].replace("|", "/")
        lines.append(f"| [{r['id']}]({rel(r['path'], ledger)}) | {r['title']} | {r['status']} | {summary} |")
    return "\n".join(lines)


def index_block(rows, index, ledgers, settled, dec):
    """Only the decisions that are not settled: the full lists are in the ledgers."""
    items = []
    for r in rows:
        state = r["status"].split(" ")[0].rstrip(".,")
        if state not in settled:
            items.append(f"[{r['id']}]({rel(r['path'], index)}) {r['title']} ({state.lower() or 'no status'})")
    names = {"product": "product", "tech": "architecture"}
    where = [f"{names[k]} in [{posixpath.basename(p)}]({rel(p, index)})" for k, p in ledgers]
    every = (", ".join(where) + ". Each links its record.") if where else f"the records in [{dec}]({rel(dec, index)})."
    return "**Not settled yet:** " + ("; ".join(items) if items else "none") + ".\n\n**All decisions:** " + every


def learn_pages(root, folder, skip):
    """Each learn page: its path, title, "In one line" summary, and latest ticket date. skip: generated files."""
    pages = []
    for name in sorted(os.listdir(os.path.join(root, folder))):
        path = posixpath.normpath(posixpath.join(folder, name))
        if not name.endswith(".md") or name == "README.md" or path in skip or not os.path.isfile(os.path.join(root, path)):
            continue
        text = open(os.path.join(root, path), encoding="utf-8").read()
        heading = re.search(r"^# (.+)$", text, re.M)
        oneline = re.search(r"^\*\*In one line:\*\*[ \t]*(.+)$", text, re.M)
        tickets = re.search(r"^## Tickets[ \t]*$(.*?)(?=^## |\Z)", text, re.M | re.S)
        dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", tickets.group(1)) if tickets else []
        pages.append({"path": path, "date": max(dates, default=""),
                      "title": heading.group(1).strip() if heading else name[:-3],
                      "oneline": oneline.group(1).strip() if oneline else ""})
    return pages


def learn_block(pages, index):
    """One line for each learn page: its title, a link, and its "In one line" summary."""
    lines = [f"- [{p['title']}]({rel(p['path'], index)})" + (f": {p['oneline']}" if p["oneline"] else "") for p in pages]
    return "\n".join(lines) or "No learn pages yet."


def teaser_block(pages, path, index, count):
    """A link to the Learn index, and the newest pages by title only."""
    if not pages:
        return "No learn pages yet."
    by_title = sorted(pages, key=lambda p: (p["title"].casefold(), p["path"]))
    newest = sorted(by_title, key=lambda p: p["date"], reverse=True)[:count]  # stable: same date stays by title
    lines = [f"- [{p['title']}]({rel(p['path'], path)})" for p in newest]
    return f"These are the newest learn pages. The full list is in [the Learn index]({rel(index, path)}).\n\n" + "\n".join(lines)


def fill(path, markers, body, title, text, add=None, replaces=None):
    """text (the file, or None if it does not exist) with body between the markers.

    add is None for markers that must exist. For an optional block, add is (text of a new
    file, text at the end of a file), each with {block}, or () to leave the file as it is.
    replaces is a pair of markers whose block the new markers replace when they are missing.
    """
    start, end = markers
    if text is None and title:
        text = f"# {title}\n\nGenerated from the decision records. Edit the records, not this list.\n\n{start}\n{end}\n"
    elif text is None and add is None:
        sys.exit(f"build-decision-ledger: {path} does not exist")
    block = f"{start}\n{body}\n{end}"
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if pat.search(text or ""):
        return pat.sub(lambda _: block, text)
    if add is None or start in (text or "") or end in (text or ""):
        sys.exit(f"build-decision-ledger: markers {start} {end} missing in {path}")
    if not add:
        return text
    old = re.compile(re.escape(replaces[0]) + r".*?" + re.escape(replaces[1]), re.S) if replaces else None
    if old and old.search(text or ""):
        return old.sub(lambda _: block, text, count=1)
    if text is None:
        return add[0].format(block=block)
    return text.rstrip("\n") + "\n\n" + add[1].format(block=block)


def main(argv):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
    cfg = config(root)
    parts = cfg.get("parts", {})
    index = cfg.get("indexFile", "CONTEXT.md")
    jobs, rows, ledgers = [], [], []
    if parts.get("records", True) and (parts.get("ledgers", True) or parts.get("index", True)):
        product = parts.get("productRecords", True)
        rows = records(root, cfg["decisionsPath"], product)
        ledgers = [(k, p) for k, p in sorted(cfg.get("ledgers", {}).items(), key=lambda kv: kv[0] != "product")
                   if p and k in LEDGER_TITLES and (k == "tech" or product) and parts.get("ledgers", True)]
        jobs = [(posixpath.normpath(p), LEDGER_MARKERS, table([r for r in rows if r["kind"] == k], p), LEDGER_TITLES.get(k), None, None)
                for k, p in ledgers]
        if parts.get("index", True):
            settled = cfg.get("settledStatuses", ["Settled", "Accepted", "Superseded"])
            jobs.insert(0, (posixpath.normpath(index), INDEX_MARKERS, index_block(rows, index, ledgers, settled, cfg["decisionsPath"]), None, None, None))
    learn = cfg.get("learnPath", "docs/learn")
    if parts.get("learn", True) and os.path.isdir(os.path.join(root, learn)):
        target = posixpath.normpath((cfg.get("learnIndex") or "{learnPath}/README.md").replace("{learnPath}", learn))
        teaser = cfg.get("learnTeaser", {})  # null turns the teaser off
        if teaser is not None and not isinstance(teaser, dict):
            sys.exit(f"build-decision-ledger: learnTeaser must be an object or null, not {teaser!r}")
        file, count = (teaser or {}).get("file", "{ledgers.tech}"), (teaser or {}).get("count", 5)
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            sys.exit(f"build-decision-ledger: learnTeaser.count must be an integer of 0 or more, not {count!r}")
        tech = dict(ledgers).get("tech")  # only a ledger that this run writes
        if teaser is None or not file or not count or ("{ledgers.tech}" in file and not tech):
            file = None
        else:
            file = posixpath.normpath(file.replace("{ledgers.tech}", tech or "").replace("{learnPath}", learn))
        pages = learn_pages(root, learn, {target, file})
        add = ("# Learn\n\nGenerated from the learn pages. Edit the pages, not this list.\n\n{block}\n",
               "## Learn\n\n{block}\n") if pages else ()
        jobs.append((target, LEARN_MARKERS, learn_block(pages, target), None, add, None))
        if file:
            add = ("## Newest learn pages\n\n{block}\n",) * 2 if pages else ()
            jobs.append((file, TEASER_MARKERS, teaser_block(pages, file, target, count), None, add,
                         LEARN_MARKERS if file != target else None))
    if not jobs:
        print("build-decision-ledger: the records, the ledgers, the index, and the learn pages are off or missing")
        return 0
    check = "--check" in argv
    stale = []
    results = {}  # path -> [text on disk or None, new text]; jobs on one file apply in order
    for path, markers, body, title, add, replaces in jobs:
        if path not in results:
            full = os.path.join(root, path)
            old = open(full, encoding="utf-8").read() if os.path.exists(full) else None
            results[path] = [old, old]
        results[path][1] = fill(path, markers, body, title, results[path][1], add, replaces)
    for path, (old, new) in results.items():  # all files are computed before the first write
        if old != new:
            stale.append(path)
            if not check:
                full = os.path.join(root, path)
                os.makedirs(os.path.dirname(full), exist_ok=True)
                with open(full, "w", encoding="utf-8") as f:
                    f.write(new)
    if check and stale:
        print(f"out of date, run python3 {os.path.relpath(os.path.abspath(__file__), root)}:", *stale, sep="\n  ")
        return 1
    print(f"build-decision-ledger: {len(rows)} records, {len(stale)} file(s) {'stale' if check else 'written'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
