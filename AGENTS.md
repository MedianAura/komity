# Driving komity from an agent

komity composes and validates conventional-style commit messages, and generates a
changelog from them. Every command takes a global `--json` flag that makes stdout a
single parseable JSON object.

Two rules apply everywhere:

- **`--json` precedes the subcommand.** `komity --json validate <file>`, not
  `komity validate --json <file>`. It is an option on the program, not on the
  subcommand.
- **stdout is the payload, stderr is noise.** Parse stdout only. Under `--json`, no
  human-readable line is ever written to stdout — a `[SUCCESS]` there would break
  your parse.

Every payload carries `"schema": 1`. Increment means the shape changed.

## The loop

```
komity --json schema             read the payload contract
        |
        v
komity --json types              discover the taxonomy
        |
        v
compose a payload                type, subject, body, changelog
        |
        v
komity --json commit --input -   assemble (and optionally write) the message
        |
        v
komity --json validate <file>    check it
        |
        v
read errors[] and warnings[]     fix precisely what failed, retry
```

You do not have to hardcode the type list. `types` publishes it, and every
validation failure repeats it in `allowedTypes`.

## The payload contract

```bash
komity --json schema
```

```json
{ "schema": 1, "payload": { "$schema": "…", "required": ["type", "subject"], "properties": { "…": {} } } }
```

`payload` is the JSON Schema of what `commit --input` accepts. The type `enum` and the
subject `maxLength` are derived from the same source the tool validates against, so this is
accurate for the _installed_ version — which a copy of this file cannot promise.

Unknown properties are ignored rather than rejected, and the schema says so instead of
claiming a refusal that never happens.

Without `--json`, the same document is printed indented.

## Discovering the taxonomy

```bash
komity --json types
```

```json
{
  "schema": 1,
  "types": [
    { "value": "feature", "name": "Feature", "description": "New feature for the user", "aliases": ["feat"] },
    { "value": "fix", "name": "Correction", "description": "Correction of an issue.", "aliases": [] }
  ]
}
```

`value` is the canonical form. `aliases` are conventional-commits spellings that are
**accepted on input** and normalised to `value` on output. Write `feat` if you like;
komity emits `feature`. One spelling ends up in the history.

| canonical     | aliases                | changelog section |
| ------------- | ---------------------- | ----------------- |
| `feature`     | `feat`                 | Feature           |
| `fix`         | —                      | Correction        |
| `style`       | —                      | Style             |
| `refactor`    | —                      | Refactor          |
| `perf`        | —                      | Performance       |
| `maintenance` | `chore`, `ci`, `build` | Refactor          |
| `doc`         | `docs`                 | Documentation     |
| `test`        | —                      | Test              |
| `dep`         | `deps`                 | Dependencies      |

Matching is exact and case-sensitive: `Feat:` is rejected.

## Composing a commit

```bash
echo '{"type":"feat","subject":"add the types command","changelog":"Adds the types command"}' \
  | komity --json commit --input -
```

`--input` resolves in three modes, in this order:

| given                     | read as                     |
| ------------------------- | --------------------------- |
| `-`                       | stdin                       |
| a string starting `{`/`[` | the JSON payload itself     |
| anything else             | a path to a file holding it |

**Prefer the file path.** A multi-line body with quotes or `@` sigils cannot be passed as
a shell argument on Windows — cmd.exe re-parses before node sees it — and `-` needs a pipe
a non-interactive wrapper cannot build:

```bash
komity --json commit --input ./commit.json
```

A path that does not resolve fails as `invalid-payload` naming the path it tried.

Without `--commit`, nothing is written to the repository — the message is only assembled
and returned.

```json
{
  "schema": 1,
  "ok": true,
  "committed": false,
  "message": "feature: add the types command\n\n\n\n[log] Adds the types command",
  "changelogEntry": "Adds the types command.",
  "warnings": []
}
```

`changelogEntry` is the exact text `generate` will publish, derived by the same code the
changelog uses. `null` when the commit carries no `[log]`. Read it on the dry run — otherwise
the entry stays invisible until the next `generate`, possibly weeks later.

## Warnings

Some payloads are legal, commit cleanly, and do the wrong thing. Those are not validation
errors, so they come back in a separate `warnings` array — on `commit` and on `validate`
alike. The human-readable form goes to stderr in both modes.

**A warning never changes the exit code.** Legal is legal; the array is the signal.

| code                       | field       | what it means                                                                                   |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `subject-trailing-task`    | `subject`   | subject ends in `(#54)` with no scope — the changelog reads the scope only, so it finds no task |
| `changelog-entry-too-long` | `changelog` | a bare `[log]` would publish more than three lines; set `changelog` for a one-line entry        |

`subject-trailing-task` is the pre-0.3.1 form. Anything that learned the convention from
older commits in a repository's history reproduces it, and the failure is silent: the commit
looks right and simply never appears in `generate` output with a task attached.

### Payload fields

| field       | type             | meaning                                                                  |
| ----------- | ---------------- | ------------------------------------------------------------------------ |
| `type`      | string, required | canonical value or alias                                                 |
| `subject`   | string, required | 100 characters or fewer, measured **without** the `type(scope): ` prefix |
| `scope`     | string           | task id alone — `JIRA-99999`, `REDMINE-Bob`, `#999`. Never a slug        |
| `body`      | string           | the _why_. Long is fine. This is not what the changelog publishes        |
| `changelog` | string           | one line, published in the changelog. Implies the `[log]` marker         |
| `log`       | boolean          | legacy marker: publish the **whole body** to the changelog               |

**Use `changelog`, not `log`.** They are separate slots on purpose. `body` is for
archaeology — rationale, trade-offs, issue references. `changelog` is the one line a
user reads in the release notes. Setting `log: true` on an agent-written body
publishes fifteen lines of reasoning and its `Closes #` / `Co-Authored-By:` trailers
into the changelog. Trailers are stripped, but the rest is not, and it should not be
there.

Passing both means `changelog` wins.

### Writing the commit

Add `--commit` to actually create it. That requires staged changes; without them you
get `nothing-staged`.

```bash
komity --json commit --commit --input '{"type":"fix","subject":"correct the redirect"}'
```

## Validating

```bash
komity --json validate .git/COMMIT_EDITMSG
```

Exit code is 0 when valid, non-zero otherwise. The payload is written either way:

```json
{
  "schema": 1,
  "valid": false,
  "header": "nope: something",
  "errors": [{ "rule": "type-unknown", "message": "Unknown commit type <nope>." }],
  "warnings": [],
  "allowedTypes": ["feature", "feat", "fix", "..."],
  "example": "fix(AB-12): correct the login redirect"
}
```

`errors[].rule` tells you _what_ to fix, which is not the same repair in each case. Entries
also carry `field` when the fault belongs to one part of the header rather than the whole
line — `header-missing` and `format-invalid` have none, on purpose:

| rule               | meaning                                            | what to change                    |
| ------------------ | -------------------------------------------------- | --------------------------------- |
| `header-missing`   | no non-comment line found                          | write a header                    |
| `type-unknown`     | the token before `:` is not accepted               | pick from `allowedTypes`          |
| `format-invalid`   | shape is wrong — usually a missing space after `:` | rewrite as `type(scope): subject` |
| `subject-too-long` | subject exceeds 100 characters                     | shorten the subject only          |

Git's own messages — `Merge branch`, `Merge remote-tracking branch`, `Revert "`,
`fixup!`, `squash!` — are bypassed and always valid.

## Errors

Any command under `--json` that fails writes one object and exits non-zero:

```json
{ "schema": 1, "error": { "code": "type-unknown", "message": "Unknown commit type <nope>.", "allowedTypes": ["..."] } }
```

| code                 | when                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| `input-required`     | `--json commit` without `--input`; or `--input -` with stdin a TTY               |
| `not-interactive`    | `commit` without `--input` and stdin is not a TTY                                |
| `nothing-staged`     | `--commit` with nothing in the index                                             |
| `invalid-payload`    | `--input` is not a JSON object or a readable file, or a field has the wrong type |
| `type-unknown`       | unknown commit type; carries `allowedTypes`                                      |
| `subject-missing`    | `subject` absent or blank                                                        |
| `subject-too-long`   | subject over 100 characters; carries `field`, `max` and `length`                 |
| `git-command-failed` | a git invocation failed; carries `command` and `stderr`                          |
| `unknown-error`      | anything else                                                                    |

`komity commit` never prompts when stdin is not a TTY — it fails with
`not-interactive` instead of hanging on inquirer until your job times out.

## Changelog generation

```bash
komity --json generate 1.2.0 --preview
```

`--preview` returns the rendered changelog without writing. Drop it to insert into
`CHANGELOG.md` at the `[//]: # "TEMPLATE"` marker, which `komity setup <title>`
creates.

```json
{ "schema": 1, "ok": true, "changelog": "## [[1.2.0] - 2026-07-27]\r\n\r\n## Feature\r\n...", "written": false, "fetchedTags": true }
```

Only commits carrying a `[log]` marker appear. The range starts at the most recent
tag, or at the first commit if the repository has none.

`fetchedTags: false` means the remote could not be reached and local tags were used.
The command still succeeds — it is otherwise entirely local — but the lower bound of
the range may be a stale tag, so the output may be missing entries.

## Other commands

| command                | effect                                                |
| ---------------------- | ----------------------------------------------------- |
| `komity branch <name>` | fetch, pull, then `git checkout -b <name>` lowercased |
| `komity setup <title>` | create `CHANGELOG.md` with the template marker        |

## Debugging

`PINO_DEBUG=1` logs every git invocation to stderr. It is read from komity's own
package directory, never from the calling project's `.env`.
