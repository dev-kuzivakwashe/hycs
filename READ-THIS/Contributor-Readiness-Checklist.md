# Contributor Readiness Checklist

## Purpose

This checklist covers the remaining items worth finishing before HYCS is opened for outside contributors.

## Must Do Before Opening

- Add a `LICENSE` file if MIT is still the intended license.
- Add `CODE_OF_CONDUCT.md` so community expectations are clear from day one.
- Add `SECURITY.md` with a private vulnerability reporting path.
- Add GitHub issue templates for bug reports, feature proposals and research notes.
- Add a pull request template that asks contributors to confirm the Generation Contract was preserved.
- Add a short local setup section that names the package manager, required secrets and expected commands.
- Add a maintainer decision process for protected HYCS platform UI changes.

## Should Do Soon

- Add automated checks for linting, type safety and formatting in CI.
- Add a small smoke-test checklist for Planner, Developer, export, BYOK and GitHub deployment flows.
- Add labels for contribution types: developer, research, design, testing, documentation and governance.
- Add a roadmap or project board so contributors can pick approved work.
- Add a changelog once public releases begin.

## HYCS-Specific Guardrails

- Pull requests must not weaken no-framework output rules.
- Pull requests must not add Bootstrap, Tailwind or framework output to generated sites.
- Pull requests must not expose user keys, BYOK keys or workspace secrets.
- Pull requests that change the protected platform interface need maintainer approval before implementation.

## Opening Recommendation

The repo is close to contributor-ready. The biggest missing pieces are community governance files, issue and PR templates, CI checks and a clear security reporting path.