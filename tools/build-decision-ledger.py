#!/usr/bin/env python3
"""Generate the decision ledgers from the decision records, and the Learn index from the learn pages.

The records in decisionsPath are the only source. Record file names:
  NNNN-slug.md        architecture record, cited as ADR-NNNN
  pd-NN[a]-slug.md    product record, cited as PDNa (when parts.productRecords is on)

The script writes the text between the markers in these files (paths from
"docArchitecture" in devkit.config.json):
  indexFile       <!-- decisions:start --> ... <!-- decisions:end -->  (decisions not settled)
  ledgers.product <!-- ledger:start --> ... <!-- ledger:end -->        (product records)
  ledgers.tech    <!-- ledger:start --> ... <!-- ledger:end -->        (architecture records)
  learnIndex      <!-- learn:start --> ... <!-- learn:end -->          (learn pages, when parts.learn is on)
A ledger file that does not exist gets a heading and the markers. The Learn index
lists each page in learnPath with its "**In one line:**" line. It runs only when the
learnPath folder exists. learnIndex defaults to ledgers.tech, then to indexFile.
If its markers or the file are missing, the script adds them at the end of the file.

Usage:
  build-decision-ledger          write the ledgers
  build-decision-ledger --check  exit 1 if a ledger is out of date
"""
import json, os, posixpath, re, subprocess, sys

TOOL_VERSION = "0.2.0"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/

INDEX_MARKERS = ("<!-- decisions:start -->", "<!-- decisions:end -->")
LEDGER_MARKERS = ("<!-- ledger:start -->", "<!-- ledger:end -->")
LEARN_MARKERS = ("<!-- learn:start -->", "<!-- learn:end -->")
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


def learn_block(root, folder, index):
    """One line for each learn page: its title, a link, and its "In one line" summary."""
    lines = []
    for name in sorted(os.listdir(os.path.join(root, folder))):
        if not name.endswith(".md") or name == "README.md" or not os.path.isfile(os.path.join(root, folder, name)):
            continue
        text = open(os.path.join(root, folder, name), encoding="utf-8").read()
        heading = re.search(r"^# (.+)$", text, re.M)
        oneline = re.search(r"^\*\*In one line:\*\*[ \t]*(.+)$", text, re.M)
        link = f"[{heading.group(1).strip() if heading else name[:-3]}]({rel(posixpath.join(folder, name), index)})"
        lines.append(f"- {link}" + (f": {oneline.group(1).strip()}" if oneline else ""))
    return "\n".join(lines) or "No learn pages yet."


def fill(path, markers, body, title, text):
    """text (the file, or None if it does not exist) with body between the markers."""
    start, end = markers
    learn = markers == LEARN_MARKERS
    if text is None and title:
        text = f"# {title}\n\nGenerated from the decision records. Edit the records, not this list.\n\n{start}\n{end}\n"
    elif text is None and not learn:
        sys.exit(f"build-decision-ledger: {path} does not exist")
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pat.search(text or ""):
        if not learn or start in (text or "") or end in (text or ""):
            sys.exit(f"build-decision-ledger: markers {start} {end} missing in {path}")
        text = (text.rstrip("\n") + "\n\n" if text else "") + f"## Learn\n\n{start}\n{end}\n"
    return pat.sub(lambda _: f"{start}\n{body}\n{end}", text)


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
        jobs = [(posixpath.normpath(p), LEDGER_MARKERS, table([r for r in rows if r["kind"] == k], p), LEDGER_TITLES.get(k))
                for k, p in ledgers]
        if parts.get("index", True):
            settled = cfg.get("settledStatuses", ["Settled", "Accepted", "Superseded"])
            jobs.insert(0, (posixpath.normpath(index), INDEX_MARKERS, index_block(rows, index, ledgers, settled, cfg["decisionsPath"]), None))
    learn = cfg.get("learnPath", "docs/learn")
    if parts.get("learn", True) and os.path.isdir(os.path.join(root, learn)):
        tech = dict(ledgers).get("tech")  # only a ledger that this run writes
        target = posixpath.normpath(cfg.get("learnIndex") or tech or index)
        jobs.append((target, LEARN_MARKERS, learn_block(root, learn, target), None))
    if not jobs:
        print("build-decision-ledger: the records, the ledgers, the index, and the learn pages are off or missing")
        return 0
    check = "--check" in argv
    stale = []
    results = {}  # path -> [text on disk or None, new text]; jobs on one file apply in order
    for path, markers, body, title in jobs:
        if path not in results:
            full = os.path.join(root, path)
            old = open(full, encoding="utf-8").read() if os.path.exists(full) else None
            results[path] = [old, old]
        results[path][1] = fill(path, markers, body, title, results[path][1])
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
