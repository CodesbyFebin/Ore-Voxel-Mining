# OreBunker agentic qualification setup

This PR introduces **source templates**, not autonomously running agents.
Normal GitHub Actions is reserved for deterministic tests. The markdown workflow in
`.github/workflows/orebunker-agent-review.md` is designed for GitHub Agentic Workflows (gh-aw).

## Enable
1. Install the official extension: `gh extension install github/gh-aw`.
2. Audit supported fields using the installed version's docs: https://github.github.com/gh-aw/.
3. Compile: `gh aw compile .github/workflows/orebunker-agent-review.md`.
4. Inspect the generated `.lock.yml` for tools, permissions, safe outputs and engine selection.
5. Configure an approved AI engine/credentials in GitHub settings, with minimal scoped access.
6. Enable the compiled workflow only after an authorized reviewer approves the lockfile.

**No background agent is claimed to be running.** The markdown source is not executable GitHub Actions until compiled.

## Controls
Review-only: no git pushes from agent jobs, no automatic merge, no deployments,
no external wallet actions. PR comments are restricted via safe outputs.
The deterministic quality workflow should be treated as a starting point and its
commands checked against the actual package scripts before treating it as a release gate.

References: https://github.com/github/gh-aw and the fork at
https://github.com/CodesbyFebin/Agentic-Workflow.
