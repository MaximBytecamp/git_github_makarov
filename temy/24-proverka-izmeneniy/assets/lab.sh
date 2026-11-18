#!/bin/sh
# Teacher-only verification fixture. Creates new temporary repositories; no pushes.
set -eu
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/gh47-ch48-lab.XXXXXX")
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null LC_ALL=C
export GIT_AUTHOR_NAME='Demo Student' GIT_AUTHOR_EMAIL='demo.student@example.invalid'
export GIT_COMMITTER_NAME='Demo Committer' GIT_COMMITTER_EMAIL='demo.committer@example.invalid'
LAB="$SCRATCH/local"
mkdir "$LAB"
cd "$LAB"
git init -q -b main
git config core.autocrlf false
git config commit.gpgsign false
git config core.hooksPath /dev/null
commit_at() {
  GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"
}
printf '%s\n' '<!doctype html>' '<html lang="en"><body><a href="/root">Root</a></body></html>' > index.html
git add index.html
commit_at root '2020-01-01T00:00:00+0000'
ROOT=$(git rev-parse HEAD)
git switch -q -c topic
printf '%s\n' '<!doctype html>' '<html lang="en"><body><h1>Help</h1></body></html>' > help.html
git add help.html
commit_at 'topic: add help page' '2020-01-02T00:00:00+0000'
TOPIC=$(git rev-parse HEAD)
git switch -q main
printf '%s\n' '<!doctype html>' '<html lang="en"><body><a href="/welcome">Welcome</a></body></html>' > index.html
git add index.html
commit_at 'main: update text and link' '2020-01-03T00:00:00+0000'
MAIN=$(git rev-parse HEAD)
git switch -q -c same
GIT_AUTHOR_DATE='2020-01-04T00:00:00+0000' GIT_COMMITTER_DATE='2020-01-04T00:00:00+0000' git commit -q --allow-empty -m 'same: record equivalent tree'
SAME=$(git rev-parse HEAD)
git switch -q -c rename-delete topic
git mv help.html guide.html
commit_at 'rename: help.html to guide.html' '2020-01-05T00:00:00+0000'
RENAME=$(git rev-parse HEAD)
git rm -q guide.html
commit_at 'delete: guide.html' '2020-01-06T00:00:00+0000'
DELETE=$(git rev-parse HEAD)
git switch -q main
{
  git --version
  printf '\n--- commits ---\n'
  for oid in "$ROOT" "$TOPIC" "$MAIN" "$SAME" "$RENAME" "$DELETE"; do
    git show -s --format='commit=%H%nparents=%P%ntree=%T%nauthor=%an%ncommitter=%cn%ndate=%aI%nmessage=%s' "$oid"
  done
  printf '\n--- graph ---\n'
  git log --all --graph --decorate --oneline --date-order
  printf '\n--- local numstat (both directions) ---\n'
  for pair in root:main root:topic topic:main main:topic topic:rename rename:delete; do
    A=${pair%:*}; B=${pair#*:}
    case "$A" in root) A=$ROOT;; main) A=$MAIN;; topic) A=$TOPIC;; rename) A=$RENAME;; esac
    case "$B" in main) B=$MAIN;; topic) B=$TOPIC;; rename) B=$RENAME;; delete) B=$DELETE;; esac
    printf '\n%s..%s\n' "$A" "$B"; git diff --numstat -M "$A..$B"
    printf '%s...%s\n' "$A" "$B"; git diff --numstat -M "$A...$B"
  done
  printf '\n--- rename status ---\n'; git diff --name-status -M "$TOPIC" "$RENAME"
  printf '\n--- exact HTML diff ---\n'; git diff "$ROOT" "$MAIN"
} > "$SCRATCH/local-checks.txt"
# Assertions are outside pipelines: any failure stops the script.
test "$ROOT" = cb21ff42eec4fa4a3a1bca459488ea5b7d6b25ec
test "$TOPIC" = ebdddaa6cf2744111d44714daf7d110f1ccb83fc
test "$MAIN" = 7f42542ef01aac2b7b2897e506b79116576dc2df
test "$SAME" = 7d898dce02a26242b26e74dd027d63fc6d05865e
test "$RENAME" = 503a877017861decc9ceccf29daff6c876e8bc52
test "$DELETE" = 477f9203a70f9d807387fb29ac5b909fd4c3668b
test "$(git rev-parse main^{tree})" = "$(git rev-parse same^{tree})"
test "$MAIN" != "$SAME"
test "$(git rev-parse same^)" = "$MAIN"
test "$(git rev-list --count "$MAIN..$SAME")" = 1
git diff --exit-code main same >/dev/null
git diff --exit-code same main >/dev/null
git diff --exit-code main...same >/dev/null
git diff --exit-code same...main >/dev/null
printf '\nPASS exact hashes, equal trees, different commits and parents, empty endpoint diffs\n' >> "$SCRATCH/local-checks.txt"
# Bare clone only; never execute anything from it.
PUBLIC="$SCRATCH/public.git"
git clone -q --bare https://github.com/octocat/Hello-World.git "$PUBLIC"
cd "$SCRATCH"
A=b3cbd5bbd7e81436d2eee04537ea2b4c0cad4cdf
B=b1b3f9723831141a31a1a7252a213e216ea76e56
C=7fd1a60b01f91b314f59955a4e4d4e80d8edf11d
{
  printf '%s\n' 'Public read-only example: octocat/Hello-World'
  for oid in "$A" "$B" "$C"; do
    git --git-dir="$PUBLIC" show -s --format='commit=%H%nparents=%P%ntree=%T%nauthor=%an%ncommitter=%cn%nauthor_date=%aI%ncommitter_date=%cI%nmessage=%s' "$oid"
  done
  for range in "$A..$B" "$B..$A" "$A...$B" "$B...$A"; do
    printf '\n%s\n' "$range"; git --git-dir="$PUBLIC" diff --numstat "$range"
  done
  printf '\n--- graph ---\n'
  git --git-dir="$PUBLIC" log --all --graph --decorate --oneline --max-count=12
} > "$SCRATCH/public-checks.txt"
test "$(git --git-dir="$PUBLIC" merge-base "$A" "$B")" = "$C"
test "$(git --git-dir="$PUBLIC" rev-parse "$A^")" = "$C"
test "$(git --git-dir="$PUBLIC" rev-parse "$B^")" = "$C"
printf '0\t1\tCONTRIBUTING.md\n1\t1\tREADME\n' > "$SCRATCH/expected.txt"
git --git-dir="$PUBLIC" diff --numstat "$A..$B" > "$SCRATCH/actual.txt"
cmp "$SCRATCH/expected.txt" "$SCRATCH/actual.txt"
printf '1\t0\tCONTRIBUTING.md\n1\t1\tREADME\n' > "$SCRATCH/expected.txt"
git --git-dir="$PUBLIC" diff --numstat "$B..$A" > "$SCRATCH/actual.txt"
cmp "$SCRATCH/expected.txt" "$SCRATCH/actual.txt"
printf '1\t1\tREADME\n' > "$SCRATCH/expected.txt"
git --git-dir="$PUBLIC" diff --numstat "$A...$B" > "$SCRATCH/actual.txt"
cmp "$SCRATCH/expected.txt" "$SCRATCH/actual.txt"
printf '1\t0\tCONTRIBUTING.md\n' > "$SCRATCH/expected.txt"
git --git-dir="$PUBLIC" diff --numstat "$B...$A" > "$SCRATCH/actual.txt"
cmp "$SCRATCH/expected.txt" "$SCRATCH/actual.txt"
printf '\nPASS common ancestor and exact numstat in all four directions\n' >> "$SCRATCH/public-checks.txt"
printf 'Results: %s\n' "$SCRATCH"
cat "$SCRATCH/local-checks.txt" "$SCRATCH/public-checks.txt"
