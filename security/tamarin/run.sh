#!/bin/sh
# Machine-check security/tamarin/edgeore-approval.spthy when tamarin-prover is installed.
# Exit 0 and say NOT RUN when the prover is absent. That is not a passed proof.
set -eu
cd "$(dirname "$0")/../.."
THEORY="security/tamarin/edgeore-approval.spthy"
if ! command -v tamarin-prover >/dev/null 2>&1; then
  echo "NOT RUN: tamarin-prover is not installed. Lemmas were not machine-checked."
  echo "Install from https://tamarin-prover.github.io/manual/master/book/002_installation.html"
  echo "Then re-run: bash security/tamarin/run.sh"
  exit 0
fi
echo "RUNNING: $(tamarin-prover --version 2>&1 | head -n 1)"
tamarin-prover --prove "$THEORY"
echo "CHECKED: tamarin-prover finished. Read the summary above before calling any lemma proved."
