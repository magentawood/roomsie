#!/usr/bin/env python3
# Copy of agentic-devkit skills/ste-writing/scripts/doc-budget, so CI and the pre-commit hook
# can run it without the plugin. Keep the two in step.
"""Keep documents inside their size limits, so they do not fill the agent context.

Usage:
  doc-budget [FILE ...]              Check these files (default: all Markdown in the repo).
  doc-budget --changed BASE          Check only the Markdown files changed since git ref BASE.
  doc-budget --staged                Check only the staged Markdown files (for a pre-commit hook).
  doc-budget --report                Show every file with its size and its limit.

The limits come from "docBudget" in devkit.config.json (plugin defaults, then
the project file). A rule gives a glob and maxWords or maxTokens. The first
rule that matches a file applies. "overrides" sets the limit for one file: use
it for a file that is already over its rule, as a ceiling that stops growth.
Exit code 1 means at least one checked file is over its limit.
"""
import fnmatch, json, os, re, subprocess, sys


def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def config(root):
    plugin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc-budget-defaults.json")
    merged = {}
    for level in (load(plugin), load(os.path.join(root, "devkit.config.json"))):
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


def main(argv):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
    cfg = config(root)
    if "--staged" in argv:
        out = subprocess.run(["git", "diff", "-z", "--cached", "--name-only", "--diff-filter=AM", "--", "*.md"],
                             capture_output=True, text=True, cwd=root).stdout
        files = [f for f in out.split("\0") if f]
    elif "--changed" in argv:
        base = argv[argv.index("--changed") + 1]
        out = subprocess.run(["git", "diff", "-z", "--name-only", "--diff-filter=AM", base, "--", "*.md"],
                             capture_output=True, text=True, cwd=root).stdout
        files = [f for f in out.split("\0") if f]
    else:
        files = []
        for a in (x for x in argv if not x.startswith("--")):
            if os.path.isdir(a):
                files += [os.path.relpath(os.path.join(d, n), root) for d, _, ns in os.walk(a) for n in ns if n.endswith(".md")]
            else:
                files.append(os.path.relpath(os.path.abspath(a), root))
        if not files:
            files = [f for f in subprocess.run(["git", "ls-files", "-z", "*.md"], capture_output=True, text=True, cwd=root).stdout.split("\0") if f]
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
    return 1 if over else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
