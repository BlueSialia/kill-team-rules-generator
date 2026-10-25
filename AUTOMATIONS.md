# Automations

This document describes the repository automations, where they live, and what
they enforce.

## Local automations (Git hooks)

Git hooks are configured through `core.hooksPath`, pointing to `.githooks/`. Run
`./setup-hooks.sh` once from the repository root to enable them.

| Hook file | Trigger | What it does |
|---|---|---|
| `.githooks/commit-msg` | `git commit` | Validates that the first line of the commit message follows [Conventional Commits](https://www.conventionalcommits.org/). |

## Development environment

The repository includes two complementary ways to obtain the Node.js toolchain:

| File | Tool | What it does |
|---|---|---|
| `mise.toml` | Mise | Pins Node.js and npm for local development. |
| `flake.nix` | Nix | Provides a reproducible development shell. |
| `.envrc` | direnv | Enters the Nix development shell automatically after `direnv allow`. |

## Continuous integration

The workflows in `.github/workflows/` automate quality checks, dependency audits,
and GitHub Pages deployment.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Pushes, pull requests, manual dispatch | Validates pull request titles and runs `npm run check`. |
| `security.yml` | Pushes, pull requests, weekly schedule, manual dispatch | Runs `npm audit --audit-level=high`. |
| `deploy-pages.yml` | Pushes to `main`, manual dispatch | Runs the checks, builds `dist/`, and deploys it to GitHub Pages. |

The repository's Pages source must be set to **GitHub Actions** under **Settings
→ Pages → Build and deployment**.

`npm run check` verifies formatting, linting, type checking, and the production
build. Run it before opening a pull request.

## Configuration files

| File | Purpose |
|---|---|
| `package.json` | Project metadata, scripts, and development dependencies. |
| `tsconfig.json` | TypeScript compiler settings. |
| `biome.json` | Formatting and linting rules. |
| `.githooks/commit-msg` | Local Conventional Commit validation. |
| `setup-hooks.sh` | Enables the local Git hooks. |
| `flake.nix` | Nix development shell. |
| `mise.toml` | Pinned Node.js and npm toolchain versions. |
| `.node-version` | Node.js version used by version managers and CI. |
| `.github/workflows/ci.yml` | Pull request checks and Conventional Commit title validation. |
| `.github/workflows/security.yml` | Scheduled npm security audit. |
| `.github/workflows/deploy-pages.yml` | Check-gated GitHub Pages deployment. |
| `.github/FUNDING.yml` | GitHub Sponsors configuration. |
