# Agentic activation gate — 2026-10-16

## Current outcomes
- Security GitHub Action: PASS (run 38810534817).
- Deterministic qualification: FAIL (run 38810534881).
- Native-static job: PASS.
- Web job: FAIL at `npm test` (181 passed, 16 failed of 197 in first test phase). Auth and lint were skipped after failure.
- Workflow PR #6 is closed; do not assume its branch is active in main.
- gh-aw markdown **has not been compiled into a lockfile** and no AI engine key has been provisioned.

## Specific failures observed in job logs
- `scripts/with-app-env.test.mjs`: test expects `.grok/app-env.json` to provide `VITE_AUTH_ENABLED=false`, but `.grok` is ignored by Git and absent on CI. Do **not** silently default auth to false in application code. Decide whether the check verifies a deliberately provisioned fixture or whether it needs to change for CI.
- `scripts/write-atomic.test.mjs`: `.grok/skills/og/references` is missing on clean checkout, causing ENOENT. This test needs explicitly packaged, license-approved fixtures, or must be scoped to workspaces where the skill is provisioned. Do not remove the assertion merely to make CI green.
- Review the other 12 failing tests using the same workflow's full logs before calling CI green. Do not assume the four examples explain all failures.

## Proposed constrained review workflow
`.github/workflows/orebunker-agent-review.md` includes `engine: codex`, `tools.bash: false`, read-only `contents` and `pull-requests` permissions, and one safe-output comment restricted to the triggering PR. This is a **source candidate**, not a compiled executable workflow.

## Required operator steps
1. Install `gh` and `gh extension install github/gh-aw`.
2. Review gh-aw engine docs and set up `CODEX_API_KEY` or `OPENAI_API_KEY` as a GitHub Actions secret using GitHub's UI. Never commit it.
3. Run `gh aw compile .github/workflows/orebunker-agent-review.md`; fix any schema/compile diagnostics, then inspect the generated `.lock.yml`, its permissions, jobs and safe outputs. Pin a supported gh-aw version.
4. Check that the agent job has no shell execution and no repository write permissions; only an isolated validated safe-output job may comment on the triggering PR.
5. Repair all baseline test/fixture failures without weakening security or hiding tests; rerun deterministic qualification to PASS (test, auth invariant and lint).
6. Have an authorized human approve the generated lockfile and enable the workflow. No automatic merging, deployments, wallet connections or crypto transfers.

Reference documentation:
- https://github.github.com/gh-aw/setup/creating-workflows/
- https://github.github.com/gh-aw/engines/codex/
- https://github.github.com/gh-aw/reference/safe-outputs-specification/
