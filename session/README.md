# The session lives in this repo

This repo carries the full Claude Code conversation in which roomsie is being
planned. Clone the repo, run one script, and you can continue that same
conversation on your own machine, in your own terminal, on whatever Claude
subscription or account you have.

Nothing is streamed and nothing is shared through Anthropic's servers.
**Remote Control is not used and must stay off.** The whole mechanism is a
JSONL file in this repo plus a local copy into your own Claude Code state
directory.

## To continue the session

```bash
git clone git@github.com:magentawood/roomsie.git
cd roomsie
./tools/resume-session.sh
claude --resume $(cat session/SESSION_ID)
```

If `--resume` doesn't list it, start `claude` from the repo root and pick the
session from the `/resume` picker.

## To save your progress back

After you've worked in the session, before you commit:

```bash
./tools/sync-session.sh
git add session/transcript/session.jsonl
git commit -m "session: <what you covered>"
git push
```

## What the scripts do

| Script | Action |
|---|---|
| `tools/resume-session.sh` | Copies `session/transcript/session.jsonl` into `~/.claude/projects/<slug of this repo's path>/<session id>.jsonl`, rewriting the recorded working directory to your clone's path so file references resolve. Backs up any transcript already there. |
| `tools/sync-session.sh` | Finds the live transcript under `~/.claude/projects` by session id and copies it back into the repo. |

The project slug is your clone's absolute path with every non-alphanumeric
character replaced by a dash, which is how Claude Code names project
directories. The script computes it, so you can clone anywhere.

## Caveats, honestly

- **One writer at a time.** The transcript is a single append-only file. If two
  people resume it and both push, the second push overwrites or conflicts on a
  700KB JSONL. Treat it like a lock: one person holds the session, syncs, and
  pushes before the next person picks it up.
- **The transcript is a record of everything said,** including the original
  author's email address and local file paths. That is why this repo is
  private. Scrub before ever making it public.
- **Model differences are fine.** The transcript is a message log, not a
  checkpoint. A different Claude model reads the same history; it just responds
  as itself from there.
- **Skills, MCP servers and plugins do not travel with the transcript.** If the
  original session used them and yours doesn't have them, past tool calls
  remain visible as history but you cannot re-run them.
- **Vendored source material** lives in `docs/source/`, so the session's file
  references still resolve on your machine.
- **The transcript grows, and git keeps every version.** It is a single file of
  a few megabytes, and each sync stores a whole new copy rather than a diff. If
  the repo gets uncomfortably large, squash the session commits or keep only
  the latest transcript in history. Nothing depends on the old copies.

## Verified

The resume path was tested from a clean clone on 2026-09-23. The transcript
installed to the correct project directory and every recorded working
directory rewrote to the clone's own path.
