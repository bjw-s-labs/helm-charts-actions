#!/usr/bin/env bash
set -eu

# Sanity check that repo is clean to start with
if [[ ! -z "$(git status --porcelain)" ]]; then
    # If we get a fail here then this workflow needs attention...
    >&2 echo "Failed: Repo should be clean before testing!"
    exit 1
fi

"$(dirname "$0")/update-node-modules.sh" check-only

# Check that repo is still clean
if [[ ! -z "$(git status --porcelain)" ]]; then
    # If we get a fail here then the PR needs attention
    >&2 echo "Failed: node_modules are not up to date. Add the 'ci/update-deps' label to your PR to update them."
    git status
    exit 1
fi
echo "Success: node_modules are up to date"
