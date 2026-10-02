#!/usr/bin/env python3
"""Generate the decision ledgers from the decision records.

The records in decisionsPath are the only source. Record file names:
  NNNN-slug.md        architecture record, cited as ADR-NNNN
  pd-NN[a]-slug.md    product record, cited as PDNa (when parts.productRecords is on)

The script writes the text between the markers in these files (paths from
"docArchitecture" in devkit.config.json):
  indexFile       <!-- decisions:start --> ... <!-- decisions:end -->  (decisions not settled)
  ledgers.product <!-- ledger:start --> ... <!-- ledger:end -->        (product records)
  ledgers.tech    <!-- ledger:start --> ... <!-- ledger:end -->        (architecture records)
A ledger file that does not exist gets a heading and the markers.

Usage:
  build-decision-ledger          write the ledgers
  build-decision-ledger --check  exit 1 if a ledger is out of date
"""
import json, os, posixpath, re, subprocess, sys

TOOL_VERSION = "0.1.1"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/

INDEX_MARKERS = ("<!-- decisions:start -->", "<!-- decisions:end -->")
LEDGER_MARKERS = ("<!-- ledger:start -->", "<!-- ledger:end -->")
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


def fill(root, path, markers, body, title):
    start, end = markers
    full = os.path.join(root, path)
    if os.path.exists(full):
        text = open(full, encoding="utf-8").read()
    elif title:
        text = f"# {title}\n\nGenerated from the decision records. Edit the records, not this list.\n\n{start}\n{end}\n"
    else:
        sys.exit(f"build-decision-ledger: {path} does not exist")
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pat.search(text):
        sys.exit(f"build-decision-ledger: markers {start} {end} missing in {path}")
    new = pat.sub(lambda _: f"{start}\n{body}\n{end}", text)
    return (None if not os.path.exists(full) else text), new


def main(argv):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
    cfg = config(root)
    parts = cfg.get("parts", {})
    if not parts.get("records", True) or not (parts.get("ledgers", True) or parts.get("index", True)):
        print("build-decision-ledger: the records, or both the ledgers and the index, are off in devkit.config.json")
        return 0
    product = parts.get("productRecords", True)
    rows = records(root, cfg["decisionsPath"], product)
    ledgers = [(k, p) for k, p in sorted(cfg.get("ledgers", {}).items(), key=lambda kv: kv[0] != "product")
               if p and k in LEDGER_TITLES and (k == "tech" or product) and parts.get("ledgers", True)]
    jobs = [(p, LEDGER_MARKERS, table([r for r in rows if r["kind"] == k], p), LEDGER_TITLES.get(k))
            for k, p in ledgers]
    if parts.get("index", True):
        index = cfg.get("indexFile", "CONTEXT.md")
        settled = cfg.get("settledStatuses", ["Settled", "Accepted", "Superseded"])
        jobs.insert(0, (index, INDEX_MARKERS, index_block(rows, index, ledgers, settled, cfg["decisionsPath"]), None))
    check = "--check" in argv
    stale = []
    results = [(path,) + fill(root, path, markers, body, title) for path, markers, body, title in jobs]
    for path, old, new in results:  # all ledgers are computed before the first write
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
    print(f"build-decision-ledger: {len(rows)} records, {len(stale)} ledger(s) {'stale' if check else 'written'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
