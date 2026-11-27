#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2026 William Tierney
#
# SPDX-License-Identifier: Apache-2.0

# Packs the core, installs the tarball in an empty folder as a consumer would, and runs `bunx breacan --help`.
# Fails when the install is over 15 MB or the command exits non-zero.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$(mktemp -d)"
trap 'rm -r "$out"' EXIT

(cd "$root/packages/core" && bun pm pack --destination "$out" --quiet >/dev/null)
tarball="$(echo "$out"/breacan-*.tgz)"

mkdir "$out/consumer"
cd "$out/consumer"
echo '{"name":"consumer","private":true}' >package.json
bun add "$tarball" >/dev/null
bunx breacan --help >/dev/null

kb="$(du -sk node_modules | cut -f1)"
echo "installed size: ${kb} KB"
[ "$kb" -lt 15360 ] || { echo "installed size over 15 MB" >&2; exit 1; }
