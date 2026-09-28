#!/usr/bin/env python3
"""Make the GitHub issues match the plan.

Reads the plan from docs/team-plan.json and tick state from the Obsidian vault,
then updates every task's issue in place: title, body, labels and milestone.
Tasks with no issue yet get one filed, and the new number is written back into
team-plan.json so the vault links to it on the next build.

Issues are updated, never deleted. Their numbers are cited by pull requests,
the vault and docs/how-to-work.md, and deleting an issue on GitHub is permanent.

Usage:
  python3 tools/sync-issues.py            dry run: print what would change
  python3 tools/sync-issues.py --apply    make the changes

Run the vault builder first, so the tick state it reads is current. Rerunning
is safe: an issue that already matches is left alone.
"""
import json, os, re, subprocess, sys, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "magentawood/roomsie"
PLAN_JSON = os.path.join(ROOT, "docs", "team-plan.json")
TASKS_DIR = os.path.join(ROOT, "docs", "plan", "tasks")
APPLY = "--apply" in sys.argv

P = json.load(open(PLAN_JSON))
T = P["tasks"]
by = {t["id"]: t for t in T}

# The engineering lanes get new labels; the non-engineering roles keep theirs.
LABELS = {
    "P1": ("lane:P1 platform", "8B949E"),
    "P2": ("lane:P2 chat", "8B6CFF"),
    "P3": ("lane:P3 data and trust", "2EA44F"),
    "P4": ("lane:P4 content and moderation", "3B82F6"),
    "P5": ("lane:P5 accounts and people", "14B8A6"),
    "D": ("role:D design", None),
    "M1": ("role:M1 content", None),
    "M2": ("role:M2 community", None),
    "F": ("role:F founder", None),
    "ALL": ("role:everyone", None),
}
CRITICAL = "critical path"
RETIRED_PREFIX = "vertical:"


def gh(*args, input=None):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, input=input)
    if r.returncode != 0:
        raise SystemExit(f"gh {' '.join(args[:3])}… failed:\n{r.stderr}")
    return r.stdout


def gh_json(*args, input=None):
    out = gh(*args, input=input)
    return json.loads(out) if out.strip() else None


# ── tick state, read from the vault ────────────────────────────────────────
CHECK_RE = re.compile(r"^- \[([ xX])\]\s+(.*?)\s*$")
PR_RE = re.compile(r"\s*·\s*\[#(\d+)\]\([^)]*\)\s*$")


def vault_checklists():
    """{task_id: [(text, ticked, pr_or_None)]} from each note's Done when."""
    state = {}
    for fn in os.listdir(TASKS_DIR):
        if not fn.endswith(".md"):
            continue
        tid, inside, items = fn.split(" ")[0], False, []
        for line in open(os.path.join(TASKS_DIR, fn)):
            line = line.rstrip("\n")
            if line.strip() == "## Done when":
                inside = True
                continue
            if inside and line.startswith("## "):
                break
            m = CHECK_RE.match(line) if inside else None
            if not m:
                continue
            text, pr = m.group(2), PR_RE.search(m.group(2))
            if pr:
                text = PR_RE.sub("", text)
            items.append((text.strip(), m.group(1).lower() == "x", pr.group(1) if pr else None))
        state[tid] = items
    return state


VAULT = vault_checklists()

# ── rendering ──────────────────────────────────────────────────────────────
D = dt.date.fromisoformat
day = lambda s: D(s).strftime("%a %-d %b")
MS = {m[0]: (m[1], m[2]) for m in P["milestones"]}
ms_title = lambda cp: f"{cp} · {MS[cp][0]}"


def sequence(t):
    rows = sorted([x for x in T if x["role"] == t["role"]], key=lambda x: (x["start"], x["end"], x["id"]))
    return [x["id"] for x in rows].index(t["id"]) + 1, len(rows)


def ref(tid):
    x = by[tid]
    return f"{tid} {x['title']}" + (f" (#{x['issue']})" if x.get("issue") else "")


def body(t):
    i, n = sequence(t)
    when = day(t["start"]) if t["start"] == t["end"] else f"{day(t['start'])} → {day(t['end'])}"
    cp_name, cp_due = MS[t["cp"]]
    lines = [
        f"**Lane:** {P['roles'][t['role']]}",
        f"**Sequence:** task {i} of {n} in this lane",
    ]
    if t.get("hours"):
        lines.append(f"**Hours:** {t['hours']}")
    lines += [
        f"**When:** {when}",
        f"**Checkpoint:** {t['cp']} · {cp_name}, {day(cp_due)}",
        f"**Needs first:** {', '.join(ref(d) for d in t['deps']) or 'nothing'}",
    ]
    if t["critical"]:
        lines.append("**Critical path:** yes. If this slips, the launch slips.")

    lines.append("\n### Done when")
    items = VAULT.get(t["id"]) or [(d, False, None) for d in t["done"]]
    for text, ok, pr in items:
        lines.append(f"- [{'x' if ok else ' '}] {text}" + (f" — #{pr}" if pr else ""))

    if t["read"]:
        lines.append("\n### Read first")
        lines += [f"- `{r}`" for r in t["read"]]

    lines += [
        "\n---",
        "_Generated from `docs/team-plan.json` by `tools/sync-issues.py`. Progress is "
        "tracked in the Obsidian vault — tick the box in the task note, not here._",
    ]
    return "\n".join(lines)


def labels_for(t):
    out = [LABELS[t["role"]][0]]
    if t["critical"]:
        out.append(CRITICAL)
    return sorted(out)


# ── milestones ─────────────────────────────────────────────────────────────
existing_ms = gh_json("api", f"repos/{REPO}/milestones?state=all&per_page=100")
ms_number = {}
for cp, (name, due) in MS.items():
    want_title, want_due = ms_title(cp), f"{due}T00:00:00Z"
    hit = next((m for m in existing_ms if m["title"].split(" ")[0] == cp), None)
    if hit is None:
        print(f"  milestone  + {want_title}  due {due}")
        if APPLY:
            hit = gh_json("api", "-X", "POST", f"repos/{REPO}/milestones",
                          "-f", f"title={want_title}", "-f", f"due_on={want_due}")
    elif hit["title"] != want_title or (hit["due_on"] or "")[:10] != due:
        print(f"  milestone  ~ {hit['title']} → {want_title}, due {(hit['due_on'] or '-')[:10]} → {due}")
        if APPLY:
            gh_json("api", "-X", "PATCH", f"repos/{REPO}/milestones/{hit['number']}",
                    "-f", f"title={want_title}", "-f", f"due_on={want_due}")
    if hit:
        ms_number[cp] = hit["number"]

# ── labels ─────────────────────────────────────────────────────────────────
have_labels = {l["name"] for l in gh_json("label", "list", "--limit", "200", "--json", "name")}
for name, colour in LABELS.values():
    if name not in have_labels and colour:
        print(f"  label      + {name}")
        if APPLY:
            gh("label", "create", name, "--color", colour)

# ── issues ─────────────────────────────────────────────────────────────────
current = {i["number"]: i for i in gh_json(
    "issue", "list", "--state", "all", "--limit", "500",
    "--json", "number,title,body,labels,milestone")}
edited = created = unchanged = 0

for t in T:
    title = f"{t['id']} · {t['title']}"
    want = {"title": title, "body": body(t), "labels": labels_for(t),
            "milestone": ms_number.get(t["cp"])}
    num = t.get("issue")

    if not num:
        print(f"  issue      + {title}")
        created += 1
        if APPLY:
            res = gh_json("api", "-X", "POST", f"repos/{REPO}/issues", "--input", "-",
                          input=json.dumps(want))
            t["issue"] = res["number"]
            print(f"               filed as #{res['number']}")
        continue

    cur = current.get(num)
    if cur is None:
        raise SystemExit(f"{t['id']} points at #{num}, which does not exist")
    have = {
        "title": cur["title"],
        "body": cur["body"],
        "labels": sorted(l["name"] for l in cur["labels"]),
        "milestone": cur["milestone"]["number"] if cur["milestone"] else None,
    }
    if have == want:
        unchanged += 1
        continue
    changed = [k for k in want if want[k] != have[k]]
    print(f"  issue      ~ #{num} {title}  [{', '.join(changed)}]")
    edited += 1
    if APPLY:
        # Setting labels here replaces the whole set, which is what retires
        # the old vertical:* labels from every issue.
        gh_json("api", "-X", "PATCH", f"repos/{REPO}/issues/{num}", "--input", "-",
                input=json.dumps(want))

# ── retire the old vertical labels once nothing carries them ──────────────
for name in sorted(n for n in have_labels if n.startswith(RETIRED_PREFIX)):
    print(f"  label      - {name}")
    if APPLY:
        gh("label", "delete", name, "--yes")

if APPLY and created:
    json.dump(P, open(PLAN_JSON, "w"), indent=1, ensure_ascii=False)
    print("\nNew issue numbers written to docs/team-plan.json. Rebuild the vault next.")

print(f"\n{len(T)} tasks · {edited} to edit · {created} to file · {unchanged} already match"
      + ("" if APPLY else "   (dry run — pass --apply to make these changes)"))
