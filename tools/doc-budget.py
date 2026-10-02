#!/usr/bin/env python3
"""Keep documents inside their size limits, so they do not fill the agent context.

Usage:
  doc-budget [FILE ...]              Check these files (default: all Markdown in the repo).
  doc-budget --changed BASE          Check only the Markdown files changed since git ref BASE.
  doc-budget --staged                Check only the staged Markdown files (for a pre-commit hook).
  doc-budget --report                Show every file with its size and its limit.

The limits come from "docBudget": the defaults (defaults/devkit.defaults.json of
the plugin, or devkit-defaults.json next to a project copy), then the project
devkit.config.json.
A rule gives a glob and maxWords or maxTokens. The first rule that matches a
file applies. "overrides" sets the limit for one file: use it for a file that
is already over its rule, as a ceiling that stops growth. With --staged or
--changed, an override that grew since HEAD or BASE also fails.
Exit code 1 means at least one checked file is over its limit.
"""
import fnmatch, json, os, re, subprocess, sys

TOOL_VERSION = "0.1.0"  # master: agentic-devkit skills/doc-architecture/scripts; sync-tools copies it to tools/


def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def config(root):
    here = os.path.dirname(os.path.abspath(__file__))
    defaults = os.path.join(here, "devkit-defaults.json")
    if os.path.basename(here) == "scripts":  # the master copy in the plugin
        defaults = os.path.join(here, "..", "..", "..", "defaults", "devkit.defaults.json")
    merged = {}
    for level in (load(defaults), load(os.path.join(root, "devkit.config.json"))):
        for key, value in level.get("docBudget", {}).items():
            merged[key] = {**merged.get(key, {}), **value} if isinstance(value, dict) else value
    return merged


def size(path):
    text = open(path, encoding="utf-8").read()
    return len(re.findall(r"[A-Za-z0-9₹$]\S*", text)), len(text) // 4  # words, approximate tokens


def limit_for(rel, cfg):
    if rel in cfg.get("overrides", {}):
        return cfg["overrides"][rel], "override"
    for rule in cfg.get("rules", []):
        if fnmatch.fnmatch(rel, rule["glob"]):
            return rule, rule["glob"]
    return None, None


def git(root, *args):
    out = subprocess.run(["git", *args], capture_output=True, text=True, cwd=root)
    if out.returncode:
        sys.exit(f"doc-budget: git {' '.join(args)} failed: {out.stderr.strip()}")
    return [f for f in out.stdout.split("\0") if f]


def raised_overrides(root, old_ref, new_ref):
    """Overrides that grew between two versions of devkit.config.json. An override can only shrink."""
    def overrides(ref):
        if ref is None:
            return load(os.path.join(root, "devkit.config.json")).get("docBudget", {}).get("overrides", {})
        out = subprocess.run(["git", "show", f"{ref}:devkit.config.json"], capture_output=True, text=True, cwd=root)
        try:
            return json.loads(out.stdout).get("docBudget", {}).get("overrides", {}) if out.returncode == 0 else {}
        except ValueError:
            return {}
    def cap(value):  # an override is a number of words, or a rule such as {"maxTokens": N}
        rule = {"maxWords": value} if isinstance(value, int) else value
        return ("tokens", rule["maxTokens"]) if "maxTokens" in rule else ("words", rule["maxWords"])

    old, new, raised = overrides(old_ref), overrides(new_ref), []
    for rel, value in sorted(new.items()):
        unit, limit = cap(value)
        if rel in old:
            old_unit, old_limit = cap(old[rel])
            if unit != old_unit or limit > old_limit:
                raised.append(f"{rel}: {old[rel]} -> {value}")
        elif os.path.exists(os.path.join(root, rel)):  # a new override is at most the size of the file now
            words, tokens = size(os.path.join(root, rel))
            now = tokens if unit == "tokens" else words
            if limit > now:
                raised.append(f"{rel}: new override {limit} {unit}, but the file has {now}")
    return raised


def main(argv):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
    cfg = config(root)
    raised = []
    if "--staged" in argv:
        files = git(root, "diff", "-z", "--cached", "--name-only", "--diff-filter=AM", "--", "*.md")
        has_head = subprocess.run(["git", "rev-parse", "--verify", "-q", "HEAD"], capture_output=True, cwd=root).returncode == 0
        raised = raised_overrides(root, "HEAD", "") if has_head else []
    elif "--changed" in argv:
        i = argv.index("--changed") + 1
        if i >= len(argv):
            sys.exit(__doc__)
        base = argv[i]
        files = git(root, "diff", "-z", "--name-only", "--diff-filter=AM", base, "--", "*.md")
        raised = raised_overrides(root, base, None)
    else:
        files = []
        for a in (x for x in argv if not x.startswith("-")):
            if os.path.isdir(a):
                files += [os.path.relpath(os.path.join(d, n), root) for d, _, ns in os.walk(a) for n in ns if n.endswith(".md")]
            else:
                files.append(os.path.relpath(os.path.abspath(a), root))
        if not files:
            files = git(root, "ls-files", "-z", "*.md")
    excluded = cfg.get("exclude", [])
    over = 0
    for rel in sorted(files):
        if any(fnmatch.fnmatch(rel, g) for g in excluded) or not os.path.exists(os.path.join(root, rel)):
            continue
        words, tokens = size(os.path.join(root, rel))
        rule, source = limit_for(rel, cfg)
        if rule is None:
            continue
        if isinstance(rule, int):
            rule = {"maxWords": rule}
        cap, unit, value = (rule["maxTokens"], "tokens", tokens) if "maxTokens" in rule else (rule["maxWords"], "words", words)
        bad = value > cap
        over += bad
        if bad or "--report" in argv:
            mark = "OVER" if bad else "ok"
            print(f"{mark:4} {rel}: {value} {unit}, limit {cap} ({source})")
    if over:
        print(f"doc-budget: {over} file(s) over the limit. Divide the file, link to the decision record, "
              f"or remove text that a later decision replaced.")
    if raised:
        print("doc-budget: an override can only shrink. These overrides grew:", *raised, sep="\n  ")
    return 1 if over or raised else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
