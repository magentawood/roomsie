#!/usr/bin/env python3
"""Build the Obsidian view of the launch plan from docs/team-plan.json.

Writes, under docs/plan/:
  tasks/        one note per task, linked to dependencies, owner and checkpoint
  owners/       one hub note per vertical or role
  checkpoints/  one note per checkpoint, chained in order
  roomsie launch.md       the centre of the graph, with a legend
  Launch timeline.canvas  swimlanes by owner, laid out on a calendar
and .obsidian/graph.json with colours by owner.

Generated. Edit docs/team-plan.json, then run: python3 tools/build-obsidian-plan.py
GitHub issues stay the live tracker.
"""
import json, os, re, shutil, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(ROOT, "docs", "plan")
P = json.load(open(os.path.join(ROOT, "docs", "team-plan.json")))
T = P["tasks"]
REPO = "https://github.com/magentawood/roomsie/issues/"

SHORT = {
 "T-02":"Scaffold monorepo","T-05":"Google sign-in","T-04":"Deploy to Mumbai","T-03":"CI checks",
 "T-07":"Error reporting","T-33":"Invite-only gate","T-24":"Event logging","T-23b":"Legal pages",
 "T-25":"Uptime and spend alerts","T-29":"Abuse test","T-08":"Form A contract","T-11":"Model wrapper",
 "T-12":"Extraction","T-13":"Reply writer","T-21":"Turn cap and spend ceiling","T-27":"Eval run",
 "T-10":"Chat screen and split view","T-09":"Chip flow","T-17":"Carry chat into account",
 "T-23a":"Landing page","T-22":"Launch areas and waitlist","T-06":"Database schema","T-14":"Match query",
 "T-19":"Report and block","T-20":"Account deletion","T-18b":"Person and connect screens",
 "T-15":"Results panel","T-16":"Profiles and photos","T-18a":"Connect API",
 "D-01":"Styling decision","D-02":"Chat screen designs","D-03":"Results and profile designs",
 "D-04":"Landing and waitlist designs","D-05":"Design QA","D-06":"Launch visuals",
 "M-04":"Article interviews","M-03":"Eval sentences","M-05":"Article drafts","M-07":"Launch posts",
 "M-01":"Seeding form","M-02":"100 sign-ups","M-06":"Beta invites","M-09":"Broker calls",
 "F-01":"Kickoff","F-02":"Domain","F-03":"Billing and caps","F-04":"Accounts in Mumbai",
 "F-05":"Seeding consent text","F-06":"Launch areas picked","F-07":"Privacy and terms draft",
 "F-09":"ADR exceptions","F-08":"Moderator named","F-10":"Go-no-go meeting",
 "A-01":"Bug fix day","A-02":"Launch day",
 "T-34":"Router","T-35":"Form B contract","T-36":"Observer","T-37":"Articles and search",
 "T-38":"Advisor","T-39":"Analytics database","T-40":"Nightly backups",
}
CAP = 34  # hours each engineer has, Thu 24 Sep to Sat 10 Oct at two hours a day
def issue_md(t):
    return f"[#{t['issue']}]({REPO}{t['issue']})" if t["issue"] else "not filed yet"
OWNERS = [  # key, note name, tag, colour
 ("P1","P1 Platform","p1","#8B949E"),
 ("P2","P2 Assistant","p2","#8B6CFF"),
 ("P3","P3 Data and trust","p3","#2EA44F"),
 ("P4","P4 Content and moderation","p4","#3B82F6"),
 ("P5","P5 Accounts and connections","p5","#14B8A6"),
 ("D","Design","design","#FF87AC"),
 ("M1","M1 Content","content","#E3B341"),
 ("M2","M2 Community","community","#F9A03F"),
 ("F","Founder","founder","#B07B4F"),
 ("ALL","Everyone","everyone","#9CC3E6"),
]
OWN = {k:(n,tag,c) for k,n,tag,c in OWNERS}
QUESTION = {"P1":"The ground everyone builds on, then profiles, the waitlist and backups",
 "P2":"What the assistant understands and says, and the router in front of it",
 "P3":"The data and the matching, then the screens that show them and the advisor",
 "P4":"Public pages and safety, then the observer",
 "P5":"CI, events and connections, then the chat screen and its chips"}
CPNAME = {"CP0":"CP0 Kickoff","CP1":"CP1 Foundation","CP2":"CP2 Core loop live",
 "CP3":"CP3 Freeze and go-no-go","CP4":"CP4 Launch","CP5":"CP5 First-week review"}
CPCOLOUR = "#D73A4A"
SOFT = {"T-18b":("T-18a","It lands Thu 1 Oct, before you start"),
        "T-15":("T-14","It lands Wed 30 Sep, before you start")}

D = dt.date.fromisoformat
f = lambda s: D(s).strftime("%a %-d %b")
by = {t["id"]:t for t in T}
def name(tid):
    t = by[tid]; return f"{tid} {SHORT[tid]}" + (" ⚑" if t["critical"] else "")
def link(tid): return f"[[{name(tid)}]]"
def rel(path):  # repo path -> link from docs/plan/<sub>/
    p = path[5:] if path.startswith("docs/") else "../" + path
    return "../../" + p
unblocks = {t["id"]:[] for t in T}
for t in T:
    for d in t["deps"]: unblocks[d].append(t["id"])
    if t["id"] in SOFT: unblocks[SOFT[t["id"]][0]].append(t["id"])
seq = {}
for k in OWN:
    rows = sorted([t for t in T if t["role"]==k], key=lambda t:(t["start"],t["end"],t["id"]))
    for i,t in enumerate(rows,1): seq[t["id"]] = (i,len(rows))

# ── progress is owned by the vault, not by this script ──────────────────────
# The notes are regenerated every run, so tick state has to survive the wipe.
# Harvest it first, keyed by task id and item text, then replay it below.
# Items ticked by hand in Obsidian, and items added by hand that this script
# does not know about, both survive. The vault is the source of truth for
# progress; team-plan.json is the source of truth for the plan.
CHECK_RE = re.compile(r"^- \[([ xX])\]\s+(.*?)\s*$")
DONE_RE  = re.compile(r"^## Done when\s*$")
PR_RE    = re.compile(r"\s*·\s*\[#(\d+)\]\([^)]*\)\s*$")

def harvest():
    """{task_id: [(text, ticked, pr_or_None), ...]} from the notes on disk."""
    state = {}
    tdir = os.path.join(PLAN, "tasks")
    if not os.path.isdir(tdir): return state
    for fn in os.listdir(tdir):
        if not fn.endswith(".md"): continue
        tid, inside, items = fn.split(" ")[0], False, []
        for line in open(os.path.join(tdir, fn)):
            line = line.rstrip("\n")
            if DONE_RE.match(line): inside = True; continue
            if inside and line.startswith("## "): break
            if not inside: continue
            m = CHECK_RE.match(line)
            if not m: continue
            text = m.group(2)
            pr = PR_RE.search(text)
            if pr: text = PR_RE.sub("", text)
            items.append((text.strip(), m.group(1).lower() == "x", pr.group(1) if pr else None))
        if items: state[tid] = items
    return state

PRIOR = harvest()

def checklist(tid, planned):
    """Render Done when, replaying tick state and keeping hand-added items."""
    prior = {text: (ticked, pr) for text, ticked, pr in PRIOR.get(tid, [])}
    seen, out = set(), []
    for d in planned:
        ticked, pr = prior.get(d, (False, None))
        seen.add(d)
        suffix = f" · [#{pr}]({REPO.replace('/issues/','/pull/')}{pr})" if pr else ""
        out.append(f"- [{'x' if ticked else ' '}] {d}{suffix}")
    # anything in the note but not in team-plan.json was added by hand: keep it
    for text, ticked, pr in PRIOR.get(tid, []):
        if text in seen: continue
        suffix = f" · [#{pr}]({REPO.replace('/issues/','/pull/')}{pr})" if pr else ""
        out.append(f"- [{'x' if ticked else ' '}] {text}{suffix}")
    return out

for sub in ("tasks","owners","checkpoints"):
    shutil.rmtree(os.path.join(PLAN,sub), ignore_errors=True)
    os.makedirs(os.path.join(PLAN,sub))
def write(sub, fname, text):
    with open(os.path.join(PLAN, sub, fname) if sub else os.path.join(PLAN, fname), "w") as fh: fh.write(text)

HEADER = "<!-- Generated by tools/build-obsidian-plan.py. Edit docs/team-plan.json instead. -->\n"

# task notes
for t in T:
    own, tag, _ = OWN[t["role"]]
    i, n = seq[t["id"]]
    when = f(t["start"]) if t["start"]==t["end"] else f"{f(t['start'])} → {f(t['end'])}"
    tags = ["task", tag] + (["critical"] if t["critical"] else [])
    fm = ["---", f"id: {t['id']}", f"title: \"{t['title']}\"", f"owner: \"{own}\"",
          f"sequence: \"{i} of {n}\""]
    if t["hours"]: fm.append(f"hours: {t['hours']}")
    fm += [f"start: {t['start']}", f"end: {t['end']}", f"checkpoint: {t['cp']}",
           f"critical: {'true' if t['critical'] else 'false'}"] + \
          ([f"issue: {REPO}{t['issue']}"] if t["issue"] else []) + [
           "tags:"] + [f"  - {x}" for x in tags] + ["---"]
    b = fm + [HEADER, f"# {t['id']} · {t['title']}\n",
          f"**Owner:** [[{own}]], task {i} of {n}  ",
          f"**When:** {when}" + (f" · {t['hours']} hours" if t["hours"] else "") + "  ",
          f"**Checkpoint:** [[{CPNAME[t['cp']]}]]  ",
          f"**Issue:** {issue_md(t)}"]
    if t["critical"]: b.append("\n> [!warning] Critical path\n> If this slips, the launch slips.")
    b.append("\n## Needs first")
    b += [f"- {link(d)}" for d in t["deps"]] or ["- Nothing. Start any time."]
    if t["id"] in SOFT:
        s, why = SOFT[t["id"]]; b.append(f"- {link(s)}, later. {why}.")
    b.append("\n## Unblocks")
    b += [f"- {link(u)}" for u in unblocks[t["id"]]] or ["- Nothing waits on this."]
    b.append("\n## Done when"); b += checklist(t["id"], t["done"])
    # A block id on its own line after the list lets Progress.md embed this
    # exact list. The embed is the list itself, not a copy, so a box ticked
    # in either place is the same box.
    b += ["", "^done"]
    if t["read"]:
        b.append("\n## Read first"); b += [f"- [{os.path.basename(r)}]({rel(r)})" for r in t["read"]]
    write("tasks", name(t["id"]) + ".md", "\n".join(b) + "\n")

# owner hubs
for k,(own,tag,colour) in OWN.items():
    rows = sorted([t for t in T if t["role"]==k], key=lambda t:(t["start"],t["end"],t["id"]))
    hrs = sum(t["hours"] or 0 for t in rows)
    b = ["---","tags:","  - owner",f"  - {tag}","---",HEADER,f"# {own}\n"]
    if k in QUESTION: b.append(f"_{QUESTION[k]}._\n")
    if hrs: b.append(f"**{hrs} hours** of build work, {CAP-hrs} spare, finishing {f(max(t['end'] for t in rows))}.\n")
    b.append("Part of [[roomsie launch]].\n\n## Sequence\n")
    for i,t in enumerate(rows,1):
        when = f(t["start"]) if t["start"]==t["end"] else f"{f(t['start'])} → {f(t['end'])}"
        b.append(f"{i}. {link(t['id'])} — {when}" + (f", {t['hours']}h" if t["hours"] else ""))
    write("owners", own + ".md", "\n".join(b) + "\n")

# checkpoints, chained
ms = P["milestones"]
for idx,(cp,label,due,what) in enumerate(ms):
    rows = sorted([t for t in T if t["cp"]==cp], key=lambda t:(t["end"],t["id"]))
    b = ["---","tags:","  - checkpoint","---",HEADER,f"# {cp} · {label}\n",f"**Date:** {f(due)}\n",what+"\n"]
    if idx: b.append(f"**After:** [[{CPNAME[ms[idx-1][0]]}]]  ")
    if idx < len(ms)-1: b.append(f"**Next:** [[{CPNAME[ms[idx+1][0]]}]]\n")
    b.append("Part of [[roomsie launch]].\n\n## Due by this checkpoint\n")
    b += [f"- {link(t['id'])} — {OWN[t['role']][0]}" for t in rows]
    write("checkpoints", CPNAME[cp] + ".md", "\n".join(b) + "\n")

# centre note with legend
leg = "\n".join(f"| <span style=\"color:{c}\">●</span> | [[{n}]] |" for _,n,_,c in OWNERS)
write(None, "roomsie launch.md", f"""---
tags:
  - checkpoint
---
{HEADER}
# roomsie launch

Target **{f(next(m[2] for m in ms if m[0] == 'CP4'))} 2026**, fallback Wed 14 Oct. {len(T)} tasks.

## How to look at it

- **Graph view.** Open it with Cmd+G. It shows only this plan, coloured by owner. Every line is a link: a task to what it waits on, to its owner, and to its checkpoint. ⚑ marks the critical path.
- **Timeline.** Open [[Launch timeline.canvas]]. One swimlane per person, laid out on the calendar. Red cards are the critical path, and arrows show what waits on what.
- **One person's view.** Open their owner note and turn on the local graph.

## Owners

| Colour | Owner |
|---|---|
{leg}
| <span style="color:{CPCOLOUR}">●</span> | Checkpoints |

## Checkpoints

""" + "\n".join(f"- [[{CPNAME[cp]}]] — {f(due)}" for cp,_,due,_ in ms) + """

## Documents

- [[how-to-work|How to work]] — each person's list, in order, and a plain-words index of every code
- [[design-review|For the designer]] — the behaviour we are locking in, to confirm, change or defer
- [[team-plan|Team plan]] — every task with its done-when list, by checkpoint
- [[extensibility|How roomsie absorbs change]] — every future change, and the seam that takes it
- [[CONTEXT|Working context]] — the running decision record
- `docs/product-base.html` and `docs/source/tech-base.html` — the product and technical records, open in a browser

---

These notes are generated from `docs/team-plan.json`. To change the plan, edit that file and run `python3 tools/build-obsidian-plan.py`. The [GitHub issues](https://github.com/magentawood/roomsie/issues) stay the live tracker.
""")

# canvas: swimlanes on a calendar
day0 = D("2026-09-24"); days = (D("2026-10-14")-day0).days + 1
W, H, GAP, PAD = 220, 84, 12, 30
nodes, edges = [], []
for i in range(days):
    d = day0 + dt.timedelta(i)
    nodes.append(dict(id=f"day{i}", type="text", text=f"**{d.strftime('%a')}**\n{d.strftime('%-d %b')}",
        x=i*W, y=0, width=W-8, height=60, **({"color":"#6E7781"} if d.weekday()>=5 else {})))
for cp,label,due,_ in ms:
    i = (D(due)-day0).days
    nodes.append(dict(id=f"cp-{cp}", type="text", text=f"**{cp}**\n[[{CPNAME[cp]}|{label}]]",
        x=i*W, y=72, width=W-8, height=80, color=CPCOLOUR))
y = 200
for k,(own,tag,colour) in OWN.items():
    rows = sorted([t for t in T if t["role"]==k], key=lambda t:(t["start"],t["end"],t["id"]))
    lanes = []   # pack overlapping tasks into sub-rows
    place = {}
    for t in rows:
        s, e = (D(t["start"])-day0).days, (D(t["end"])-day0).days
        for li, last in enumerate(lanes):
            if s > last: lanes[li] = e; place[t["id"]] = li; break
        else: lanes.append(e); place[t["id"]] = len(lanes)-1
    height = PAD*2 + len(lanes)*(H+GAP) - GAP
    nodes.append(dict(id=f"lane-{k}", type="group", label=own, x=-20, y=y, width=days*W+32, height=height, color=colour))
    for t in rows:
        s, e = (D(t["start"])-day0).days, (D(t["end"])-day0).days
        info = (f"{t['hours']}h · " if t["hours"] else "") + (f(t["start"]) if s==e else f"{f(t['start'])} → {f(t['end'])}")
        n = dict(id=f"task-{t['id']}", type="text", text=f"**[[{name(t['id'])}|{t['id']} {SHORT[t['id']]}]]**\n{info}",
                 x=s*W, y=y+PAD+place[t["id"]]*(H+GAP), width=(e-s+1)*W-8, height=H)
        if t["critical"]: n["color"] = "1"
        nodes.append(n)
    y += height + 50
for t in T:
    for d in t["deps"]:
        e = dict(id=f"e-{d}-{t['id']}", fromNode=f"task-{d}", fromSide="right", toNode=f"task-{t['id']}", toSide="left")
        if t["critical"] and by[d]["critical"]: e["color"] = "1"
        edges.append(e)
    if t["id"] in SOFT:
        s,_ = SOFT[t["id"]]
        edges.append(dict(id=f"e-{s}-{t['id']}", fromNode=f"task-{s}", fromSide="bottom", toNode=f"task-{t['id']}", toSide="bottom", label="wire up"))
json.dump(dict(nodes=nodes, edges=edges), open(os.path.join(PLAN, "Launch timeline.canvas"), "w"), indent=1, ensure_ascii=False)

# graph colours, keeping any other settings already there
gp = os.path.join(ROOT, ".obsidian", "graph.json")
os.makedirs(os.path.dirname(gp), exist_ok=True)
g = json.load(open(gp)) if os.path.exists(gp) else {}
rgb = lambda h: int(h.lstrip("#"), 16)
g.update({
 "search": "path:docs/plan",
 "showTags": False, "showAttachments": False, "hideUnresolved": True, "showOrphans": False,
 "showArrow": True, "collapse-color-groups": False,
 "colorGroups": [{"query":"tag:#checkpoint","color":{"a":1,"rgb":rgb(CPCOLOUR)}}] +
   [{"query":f"tag:#{tag}","color":{"a":1,"rgb":rgb(c)}} for _,_,tag,c in OWNERS],
})
g.setdefault("linkDistance", 180); g.setdefault("repelStrength", 12); g.setdefault("textFadeMultiplier", -0.5)
json.dump(g, open(gp, "w"), indent=2)

# team plan: everything above "## Go or no-go" is generated, the rest is hand-written
TP = os.path.join(ROOT, "docs", "team-plan.md")
TAIL_MARK = "## Go or no-go"
tail = open(TP).read().split(TAIL_MARK, 1)[1] if os.path.exists(TP) else "\n"
LANES = [k for k in OWN if k.startswith("P")]
def when(t): return f(t["start"]) if t["start"]==t["end"] else f"{f(t['start'])} → {f(t['end'])}"
def rows_of(k): return sorted([t for t in T if t["role"]==k], key=lambda t:(t["start"],t["end"],t["id"]))
def tid(t): return t["id"] + (" ⚑" if t["critical"] else "")
def deps(t): return ", ".join(t["deps"]) or "—"
def hrs(t): return str(t["hours"]) if t["hours"] else ""
def gantt_title(s): return s.replace(":", " -").replace(",", "").replace("#", "")
LAUNCH = next(m[2] for m in ms if m[0] == "CP4")
FALLBACK, LAST_BUILD, BUG_DAY = "2026-10-14", "2026-10-10", "2026-10-11"
build = [t for t in T if t["role"] in LANES]
ui = [t for t in build if any(d.startswith("D-0") for d in t["deps"])]
b_h = sum(t["hours"] or 0 for t in build); ui_h = sum(t["hours"] or 0 for t in ui)
unfiled = [t["id"] for t in T if not t["issue"]]
L = [f"# Team plan: launch on {D(LAUNCH):%-d %B}", "",
 "**Status:** ready to assign · **Decision:** D12 · **Generated from** `docs/team-plan.json`", "",
 "Every task below is also a GitHub issue. This file is the baseline, and each person's list, in order, is also in `docs/how-to-work.md`.", "",
 "> **The GitHub issues still carry the original `vertical:V1`–`V5` labels and checkpoint milestones.** Where they disagree with this file, this file wins until the issues are relabelled."
 + (f" **Not filed yet:** {', '.join(unfiled)}." if unfiled else ""), "",
 "---", "", "## How to use this", "",
 "1. **Put a name against every lane and role.** Task F-01. They are slots, so the plan works before anyone is named.",
 "2. **Work your list in order.** The order is the schedule. Finish and merge one task before starting the next.",
 "3. **Open a pull request for every task.** Never push to `main`. One PR per task, titled with the task ID.",
 "4. **Post a standup by 10 am:** what you finished, what you're on, what's blocking you.",
 "5. **Blocked for more than half a day?** Say so in the channel. The founder reassigns.", "",
 "**Everyone works two hours a day, weekends included, from Thursday 24 September.**", "",
 "**Quality comes before the date.** The go/no-go list at the end of this file is the bar. If a check fails, the date moves a little rather than shipping something below it. Don't cut corners to hit a day. Say you're running long.", "",
 "---", "", "## Five lanes", "",
 f"We have no designs yet. {b_h - ui_h} of the {b_h} build hours need none, and {ui_h} are screens that cannot start without them. So the work runs in two phases:", "",
 "- **Phase A · Thu 24 → Wed 30 Sep.** Design-free work: the monorepo, the database, sign-in, the assistant, matching, moderation.",
 f"- **Phase B · Thu 1 → {f(LAST_BUILD)}.** Every screen, once designs D-02, D-03 and D-04 exist, plus the router, observer, advisor, analytics database and backups. **Designs are due by end of Wednesday 30 September.**", "",
 f"| Lane | Question it answers | Owns | Hours | Spare | Person |", "|---|---|---|---|---|---|"]
for k in LANES:
    rs = rows_of(k); h = sum(t["hours"] or 0 for t in rs)
    owns = ", ".join(SHORT[t["id"]] for t in rs)
    L.append(f"| **{P['roles'][k]}** | {QUESTION.get(k,'')} | {owns} | {h} | {CAP - h} | _name_ |")
L += ["", f"Each engineer has {CAP} hours from Thursday 24 September to {D(LAST_BUILD):%A %-d %B}, at two hours a day. {D(BUG_DAY):%A %-d %B} is bug fixing. **{D(LAUNCH):%A %-d %B} is launch**, with {D(FALLBACK):%A %-d %B} as the fallback.", "",
 "**Why the lanes are not the old verticals.** V1, V2 and V4 needed no designs, but V3 and V5 were about 80% screens. Keeping them would have left two people idle for a week. Every task still has exactly one owner, start to finish.", "",
 "**Other roles.** Design, marketing and the founder keep their roles. Their sequences are below too.", "",
 f"**If there are four engineers, not five,** one lane has no owner. Plan for {D(FALLBACK):%-d %B} from day one, and use the cut order in `docs/launch-plan.md`.", "",
 "---", "", "## Each person's sequence", "", "Work top to bottom. Finish and merge one task before starting the next. Dates assume two hours every day.", ""]
for k,(own,tag,_) in OWN.items():
    rs = rows_of(k)
    if not rs: continue
    head = P["roles"].get(k, own)
    L.append(f"### {head}" + (f" — {QUESTION[k][0].lower()+QUESTION[k][1:]}" if k in QUESTION else "")); L.append("")
    if k in LANES:
        L += ["| # | Task | Hours | When | Waits on |", "|---|---|---|---|---|"]
        L += [f"| {i} | {tid(t)} · {t['title']} | {hrs(t)} | {when(t)} | {deps(t)} |" for i,t in enumerate(rs,1)]
        h = sum(t["hours"] or 0 for t in rs)
        L += ["", f"Finish line: {f(max(t['end'] for t in rs))}. {h} hours."]
    else:
        L += ["| # | Task | When | Waits on |", "|---|---|---|---|"]
        L += [f"| {i} | {tid(t)} · {t['title']} | {when(t)} | {deps(t)} |" for i,t in enumerate(rs,1)]
        L += ["", f"Finish line: {f(max(t['end'] for t in rs))}."]
    L.append("")
L += ["---", "", "## All tasks", "", "One row per task, grouped by owner in the order they are worked. ⚑ marks the critical path.", "",
 "| Owner | # | ID | Task | Hours | Start | End | Checkpoint | Waits on | Issue |", "|---|---|---|---|---|---|---|---|---|---|"]
for k,(own,_,_) in OWN.items():
    for i,t in enumerate(rows_of(k),1):
        L.append(f"| {own} | {i} | {tid(t)} | {t['title']} | {hrs(t)} | {f(t['start'])} | {f(t['end'])} | {t['cp']} | {deps(t)} | {issue_md(t)} |")
L += ["", "---", "", "## Checkpoints", "", "| | Date | What is true by then |", "|---|---|---|"]
L += [f"| **{cp} · {label}** | {f(due)} | {what} |" for cp,label,due,what in ms]
L += ["", "---", "", "## Sequence", "", "```mermaid", "gantt", "    title roomsie to launch", "    dateFormat YYYY-MM-DD", "    axisFormat %d %b", "    section Checkpoints"]
L += [f"    {cp} {label} :milestone, {cp.lower()}, {due}, 0d" for cp,label,due,_ in ms]
for k,(own,_,_) in OWN.items():
    rs = rows_of(k)
    if not rs: continue
    L.append(f"    section {own}")
    for t in rs:
        d = (D(t["end"]) - D(t["start"])).days + 1
        L.append(f"    {t['id']} {gantt_title(t['title'])} :{'crit, ' if t['critical'] else ''}{t['id'].lower().replace('-','')}, {t['start']}, {d}d")
L += ["```", "", "---", "", "## Tasks by checkpoint", ""]
for cp,label,due,what in ms:
    rs = sorted([t for t in T if t["cp"]==cp], key=lambda t:(t["start"],t["end"],t["id"]))
    L += [f"### {cp} · {label} — {f(due)}", "", what, "", "| ID | Task | Role | Hours | When | Needs first |", "|---|---|---|---|---|---|"]
    L += [f"| {tid(t)} | {t['title']} | {t['role']} | {hrs(t)} | {when(t)} | {deps(t)} |" for t in rs]
    L.append("")
    for t in rs:
        L.append(f"**{t['id']} · {t['title']}** — done when:")
        L += [f"- {d}" for d in t["done"]]
        if t["read"]: L.append("- Read first: " + ", ".join(f"`{r}`" for r in t["read"]))
        L.append("")
open(TP, "w").write("\n".join(L).rstrip() + "\n\n" + TAIL_MARK + tail)

# ── the global progress rollup ──────────────────────────────────────────────
# Every task in the project, grouped by lane. Each task is a callout that starts
# collapsed; opening it shows the task's own Done when list, EMBEDDED rather than
# copied. So there is one copy of every checkbox, it lives in the task note, and
# ticking it here ticks it there. Only the counts and marks in the callout titles
# are a snapshot, refreshed on the next build.
FINAL = harvest()          # re-read what we just wrote, so counts match the notes
ORDER = [k for k,_,_,_ in OWNERS]

def bar(done, total, width=24):
    if not total: return "─" * width
    filled = round(width * done / total)
    return "█" * filled + "░" * (width - filled)

tot_d = tot_n = 0
lane_rows, body = [], []

for k in ORDER:
    own = OWN[k][0]
    rows = sorted([t for t in T if t["role"]==k], key=lambda t:(t["start"],t["end"],t["id"]))
    if not rows: continue
    items = [(t, FINAL.get(t["id"], [])) for t in rows]
    d = sum(1 for _, its in items for _,ok,_ in its if ok)
    n = sum(len(its) for _, its in items)
    td = sum(1 for _, its in items if its and all(ok for _,ok,_ in its))
    tot_d += d; tot_n += n
    lane_rows.append(f"| [[{own}]] | {td} / {len(rows)} | {d} / {n} | {round(100*d/n) if n else 0}% |")

    body.append(f"\n## {own} — {d}/{n}\n")
    for t, its in items:
        dn = sum(1 for _,ok,_ in its if ok)
        mark = "✅" if its and dn == len(its) else ("🟡" if dn else "⬜")
        # `-` after the callout type makes it start collapsed.
        body.append(f"> [!todo]- {mark} {link(t['id'])} · {dn}/{len(its)}")
        body.append(f"> ![[{name(t['id'])}#^done]]" if its else "> _No done-when list._")
        body.append("")

P_ = ["---","tags:","  - progress","---", HEADER,
      "# Progress\n",
      "**The vault is the source of truth for progress.** Every task below opens",
      "to show its sub-tasks. Those checkboxes are the task note's own list, shown",
      "here rather than copied — tick one here and it is ticked in the task note.\n",
      "The counts and ✅ 🟡 ⬜ marks are a snapshot. Run",
      "`python3 tools/build-obsidian-plan.py` to refresh them.\n",
      f"**{tot_d} of {tot_n} done · {round(100*tot_d/tot_n) if tot_n else 0}%**\n",
      f"`{bar(tot_d, tot_n)}`\n",
      "Part of [[roomsie launch]].\n",
      "| Lane | Tasks complete | Items | Done |","|---|---|---|---|", *lane_rows,
      "\n---", *body]
write(None, "Progress.md", "\n".join(P_) + "\n")

print(f"{len(T)} task notes, {len(OWN)} owner notes, {len(ms)} checkpoints, "
      f"canvas with {len(nodes)} nodes and {len(edges)} edges, graph colours set, team-plan.md rebuilt,\n"
      f"Progress.md: {tot_d}/{tot_n} checkboxes done")
