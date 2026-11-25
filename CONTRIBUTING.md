# Contributing to Breacán

Breacán is Apache-2.0, and every contributor signs a licence agreement once (`CLA.md`).

## Agree to the CLA

In your first pull request:

1. Read `CLA.md`.
2. Add one line to `.github/cla-signatures.txt`: your GitHub login, a space and today's date (`YYYY-MM-DD`).
3. Tick the agreement box in the pull request description (the template has it).

The `cla` check in CI passes when your line is in the file and the box is ticked. You sign once; later pull
requests pass without a new line, but each still has the box to tick. Pull requests from `dependabot[bot]` and
`github-actions[bot]` (dependency and release PRs) are exempt. If you contribute for an employer, ask the maintainers
for a company agreement first (`CLA.md`, section 3).

The check reads your own pull request's file, and the line must carry the login that opened the pull request, so
signing for someone else does not pass. This is a lightweight record, not a legal signature service: it needs no
GitHub app, and the file in git is the record.

## Make a change

- `mise run setup`, then `mise run test`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); release-please builds the changelog
  and version from them.
- Source files start with the SPDX header below. `mise run reuse` checks it, and CI runs it.
- `mise run licence` fails on any production dependency with a copyleft or unreadable licence. Do not add one.
- `AGENTS.md` lists the rules that matter (frozen goldens, generated headers, the module shape).

```
// SPDX-FileCopyrightText: <year> Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0
```

A file that cannot carry a header (JSON, generated output, a golden) is covered in `REUSE.toml`. Third-party code
needs its own licence and an entry in `NOTICE`.
