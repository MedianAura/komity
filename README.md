# Komity

Commit message generator, validator, and changelog builder. Prompts for a structured
commit, enforces the format from a git hook, and renders `CHANGELOG.md` from the
commits you marked for publication.

[![Version](https://img.shields.io/npm/v/@medianaura/komity.svg)](https://npmjs.org/package/@medianaura/komity)
[![Downloads/week](https://img.shields.io/npm/dw/@medianaura/komity.svg)](https://npmjs.org/package/@medianaura/komity)

- [Install](#install)
- [Commit](#commit)
- [Commit types](#commit-types)
- [Validate from a git hook](#validate-from-a-git-hook)
- [Changelog](#changelog)
- [Commands](#commands)
- [For agents](#for-agents)

## Install

```bash
pnpm add -D @medianaura/komity
```

Installing per project rather than running through `npx` is the intended shape: the
`commit-msg` hook runs on every commit, and a resolved install starts in about
200 ms against several seconds for a cold `npx`.

## Commit

```bash
komity
```

`commit` is the default command. It asks for a type, a subject, whether the commit
belongs in the changelog, a description, and an issue id — then writes the commit.

The issue id defaults to whatever the current branch name looks like: on
`feature/AB-12-add-login`, it offers `ab-12`, which is uppercased into the header.

The assembled message is:

```
feature(AB-12): add the login redirect

The description, if you gave one.

[log] What users read in the changelog
```

The header is what gets validated. `[log]` marks the commit for the changelog — see
[Changelog](#changelog).

## Commit types

```bash
komity types
```

| type          | aliases                | meaning                                        |
| ------------- | ---------------------- | ---------------------------------------------- |
| `feature`     | `feat`                 | New feature for the user                       |
| `fix`         |                        | Correction of an issue                         |
| `style`       |                        | Change to the interface or the user experience |
| `refactor`    |                        | Code refactoring                               |
| `perf`        |                        | Change that improves performance               |
| `maintenance` | `chore`, `ci`, `build` | Chore that doesn't modify the code             |
| `doc`         | `docs`                 | Documentation only                             |
| `test`        |                        | Adding or correcting tests                     |
| `dep`         | `deps`                 | Dependencies update                            |

Aliases are the conventional-commits spellings. They are **accepted** wherever a type
is read, so a repository already writing `feat:` and `chore:` can adopt the hook
without rewriting its conventions. komity itself always **writes** the canonical form,
so one spelling ends up in your history.

Matching is case-sensitive: `Feat:` is rejected.

## Validate from a git hook

```bash
komity validate .git/COMMIT_EDITMSG
```

Exit code 0 when the header is valid, non-zero otherwise. Only the header is checked —
the body is free text.

With husky:

```bash
# .husky/commit-msg
komity validate "$1"
```

Rules:

- header reads `type(scope): subject`, with a space after the colon
- `type` is one of the accepted types or aliases
- `scope`, when present, is a task id and nothing else — `JIRA-99999`, `REDMINE-Bob`, or
  `#999` for GitHub/GitLab. It is what links the commit to the tracker, so a trailing slug
  (`#999-doing-something`) is not a scope
- `subject` is 100 characters or fewer, measured **without** the `type(scope): ` prefix
- git's own messages (`Merge branch`, `Revert "`, `fixup!`, `squash!`) always pass

## Changelog

```bash
komity setup "My Project"         # creates CHANGELOG.md with its insertion marker
komity generate 1.2.0             # renders entries and inserts them
komity generate 1.2.0 --preview   # renders to stdout, writes nothing
```

`generate` collects commits since the most recent tag — or since the first commit if
the repository has no tags — and keeps only those carrying a `[log]` marker.

The marker has two forms:

```
[log] Adds the login redirect
```

The changelog entry is that line, and the rest of the body is ignored. This is what
you want whenever the body explains _why_ at length.

```
[log]
```

Bare marker: the whole body becomes the entry. Convenient when the body is already
one short user-facing sentence.

Under both forms, git trailers — `Closes #`, `Refs #`, `Co-Authored-By:`,
`Signed-off-by:` — are stripped.

Entries are grouped into sections by type: Feature, Correction, Style, Refactor
(`refactor` and `maintenance`), Performance, Documentation, Test, Dependencies, and
Other for anything unrecognised.

## Commands

| command                     | effect                                   |
| --------------------------- | ---------------------------------------- |
| `komity` / `komity commit`  | prompt for and create a commit           |
| `komity validate <file>`    | validate a commit message file           |
| `komity types`              | list accepted types                      |
| `komity generate <version>` | render the changelog into `CHANGELOG.md` |
| `komity setup <title>`      | create `CHANGELOG.md`                    |
| `komity branch <name>`      | fetch, pull, then create the branch      |

Global options:

| option                | effect                                               |
| --------------------- | ---------------------------------------------------- |
| `--json`              | machine-readable stdout; must precede the subcommand |
| `--version`, `--help` | as usual                                             |

`PINO_DEBUG=1` logs every git invocation to stderr.

## For agents

Every command speaks JSON, and `types` publishes the taxonomy so nothing has to be
hardcoded. See [AGENTS.md](./AGENTS.md) for the composition loop, the payload fields,
and the error codes.

```bash
echo '{"type":"feat","subject":"add the types command","changelog":"Adds the types command"}' \
  | komity --json commit --input -
```
