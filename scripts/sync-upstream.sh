#!/usr/bin/env bash
set -euo pipefail

# origin is this fork; upstream points to the original repository.
# Keep local workflow commits via a normal merge; never force-update branches or tags.
git fetch --no-tags upstream +refs/heads/main:refs/remotes/upstream/main
git fetch --tags upstream
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

if git merge-base --is-ancestor refs/remotes/upstream/main HEAD; then
  echo 'Fork main already contains upstream main.'
else
  if ! git merge --no-edit --no-ff refs/remotes/upstream/main; then
    git merge --abort || true
    echo 'Upstream changes conflict with fork main; no branch was pushed.' >&2
    exit 1
  fi
  git push origin HEAD:refs/heads/main
  echo 'Merged upstream main into fork main.'
fi

git push origin --tags
echo 'Upstream tags synchronized.'
