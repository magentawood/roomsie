#!/usr/bin/env python3
"""Generate the decision ledgers from the decision records.

The records in docs/decisions/ are the only source. This script writes the
text between the ledger markers in:
  CONTEXT.md             <!-- decisions:start --> ... <!-- decisions:end -->
  docs/product-base.md   <!-- ledger:start --> ... <!-- ledger:end -->   (PD records)
  docs/tech-base.md      <!-- ledger:start --> ... <!-- ledger:end -->   (ADRs)

Usage:
  python3 tools/build-decision-ledger.py          write the ledgers
  python3 tools/build-decision-ledger.py --check  exit 1 if a ledger is out of date
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEC = os.path.join(ROOT, "docs", "decisions")


def records():
    out = []
    for name in os.listdir(DEC):
        m = re.match(r"^(?:(\d{4})|pd-(\d{2})([a-z]?))-.*\.md$", name)
        if not m:
            continue
        text = open(os.path.join(DEC, name), encoding="utf-8").read()
        title = re.search(r"^# (.+)$", text, re.M).group(1)
        title = re.sub(r"^(ADR \d{4}|\d{4}|PD\d+[a-z]?)\s*[—-]\s*", "", title).strip()
        status = re.search(r"\*\*Status:\*\*\s*([^·\n]+)", text)
        oneline = re.search(r"^\*\*In one line:\*\*\s*(.+)$", text, re.M)
        decision = re.search(r"^## Decisions?\s*\n+(.+?)(?:\n\n|\n## )", text, re.M | re.S)
        first = decision.group(1).strip().split("\n")[0] if decision else ""
        first = re.sub(r"^(?:[-*]\s+|#+\s+(?:\d+\.\s+)?)", "", first)  # a bullet or a numbered heading
        summary = re.sub(r"\*\*|`", "", re.sub(r"^\*\*Decision:\*\*\s*", "", first)).strip()
        summary = re.split(r"(?<=\.)\s", summary)[0]  # first sentence only
        if oneline:
            summary = oneline.group(1).strip()
        if m.group(1):
            key, rid, kind = (0, int(m.group(1)), ""), f"ADR-{m.group(1)}", "adr"
        else:
            key, rid, kind = (1, int(m.group(2)), m.group(3)), f"PD{int(m.group(2))}{m.group(3)}", "pd"
        out.append({"key": key, "id": rid, "kind": kind, "file": name, "title": title,
                    "status": status.group(1).strip() if status else "", "summary": summary})
    return sorted(out, key=lambda r: r["key"])


def table(rows, prefix):
    lines = ["| ID | Decision | Status | In one line |", "|---|---|---|---|"]
    for r in rows:
        lines.append(f"| [{r['id']}]({prefix}{r['file']}) | {r['title']} | {r['status']} | {r['summary'].replace('|', '/')} |")
    return "\n".join(lines)


def context_list(rows):
    """Only the decisions that are not settled: the full lists are in the two ledgers."""
    items = []
    for r in rows:
        state = r["status"].split(" ")[0].rstrip(".,")
        if state not in ("Settled", "Accepted"):
            items.append(f"[{r['id']}](docs/decisions/{r['file']}) {r['title']} ({state.lower()})")
    return ("**Not settled yet:** " + "; ".join(items) + ".\n\n"
            "**All decisions:** product in [product-base.md](docs/product-base.md), "
            "architecture in [tech-base.md](docs/tech-base.md). Each links its record.")


def fill(path, start, end, body):
    text = open(path, encoding="utf-8").read()
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pat.search(text):
        sys.exit(f"build-decision-ledger: markers {start} {end} missing in {path}")
    return text, pat.sub(lambda _: f"{start}\n{body}\n{end}", text)


def main():
    rows = records()
    jobs = [
        (os.path.join(ROOT, "CONTEXT.md"), "<!-- decisions:start -->", "<!-- decisions:end -->", context_list(rows)),
        (os.path.join(ROOT, "docs", "product-base.md"), "<!-- ledger:start -->", "<!-- ledger:end -->",
         table([r for r in rows if r["kind"] == "pd"], "decisions/")),
        (os.path.join(ROOT, "docs", "tech-base.md"), "<!-- ledger:start -->", "<!-- ledger:end -->",
         table([r for r in rows if r["kind"] == "adr"], "decisions/")),
    ]
    stale = []
    for path, start, end, body in jobs:
        old, new = fill(path, start, end, body)
        if old != new:
            stale.append(os.path.relpath(path, ROOT))
            if "--check" not in sys.argv:
                open(path, "w", encoding="utf-8").write(new)
    if "--check" in sys.argv and stale:
        print("out of date, run python3 tools/build-decision-ledger.py:", *stale, sep="\n  ")
        return 1
    print(f"build-decision-ledger: {len(rows)} records, {len(stale)} ledger(s) {'stale' if '--check' in sys.argv else 'written'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
