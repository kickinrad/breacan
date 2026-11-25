# Contributing to Breacán

Breacán is Apache-2.0. A contribution you intentionally submit is under the same licence, as [section 5 of the licence](https://www.apache.org/licenses/LICENSE-2.0#contributions) says. There is nothing to sign.

You keep the copyright in what you write, and the git history records who wrote what. The project itself is William Tierney's.

## Make a change

- `mise run setup`, then `mise run test`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); release-please builds the changelog
  and version from them.
- Source files start with the SPDX header below. `mise run reuse` checks it, and CI runs it.
- `mise run licence` fails on any production dependency with a copyleft or unreadable licence. Do not add one.
- `AGENTS.md` lists the rules that matter (frozen goldens, generated headers, the module shape).

```
// SPDX-FileCopyrightText: <year> William Tierney
//
// SPDX-License-Identifier: Apache-2.0
```

A file that cannot carry a header (JSON, generated output, a golden) is covered in `REUSE.toml`. Third-party code
needs its own licence and an entry in `NOTICE`.
