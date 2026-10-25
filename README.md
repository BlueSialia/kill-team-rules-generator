# Kill Team Rule Generator

[![Hippocratic License HL3-BOD-CL-ECO-FFD-LAW-MEDIA-MIL-MY-SV-TAL-USTA-XUAR](https://img.shields.io/static/v1?label=Hippocratic%20License&message=HL3-BOD-CL-ECO-FFD-LAW-MEDIA-MIL-MY-SV-TAL-USTA-XUAR&labelColor=5e2751&color=bc8c3d)](https://firstdonoharm.dev/version/3/0/bod-cl-eco-ffd-law-media-mil-my-sv-tal-usta-xuar.html)

---

A static, offline-capable editor for creating printable homebrew Kill Team rules documents.

For more details on the project structure and design, see the [ADR](ADR.md) document.

## Getting Started

These instructions will get you a copy of the website up and running on your local machine for development and testing purposes. See [Deployment](#deployment) for notes on publishing the site.

### Prerequisites

- Node.js 24 or newer, or the version selected by `mise.toml`
- npm
- Nix with flakes enabled, if using the provided development shell
- direnv, optional but recommended when using Nix

### Setup

Clone the repository, enable the local Git hooks, and install dependencies:

```sh
git clone git@github.com:BlueSialia/kill-team-rules-generator
cd kill-team-rules-generator
./setup-hooks.sh
npm install
```

With Nix and direnv installed, run `direnv allow` after cloning to enter the pinned development shell automatically. Without direnv, use `nix develop`.

### Running the Site

```sh
npm run dev
```

Open the local URL printed by Vite.

## Running the Tests

### Quality Checks

```sh
npm run check
```

This runs formatting, linting, type checking, the schema test suite, and the production build.

## Deployment

Build the static site with:

```sh
npm run build
```

The `main` branch is deployed automatically by `.github/workflows/deploy-pages.yml`. Configure the repository's Pages source as **GitHub Actions** under **Settings → Pages → Build and deployment**.

### Other Static Hosts

Build the application and deploy the generated `dist/` directory:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Built With

| Dependency | Purpose |
|---|---|
| [TypeScript](https://www.typescriptlang.org/) | Application language and type checking |
| [Vite](https://vite.dev/) | Development server and production build |
| [Biome](https://biomejs.dev/) | Formatting and linting |
| [Font Awesome](https://fontawesome.com/) | Preview icons |
| [Zod](https://zod.dev/) | Runtime document schema validation |
| [Vitest](https://vitest.dev/) | Automated tests |

## Automations

Local Git hooks enforce Conventional Commits. The `check` script runs formatting, linting, type checking, and the production build. GitHub Actions run the same checks, audit dependencies, and deploy successful `main` builds to GitHub Pages.

See [AUTOMATIONS.md](AUTOMATIONS.md) for more information and details.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct and the process for submitting pull requests to us.

## Versioning

We use [SemVer](https://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/BlueSialia/kill-team-rules-generator/tags).

## Authors

* **Jorge Domínguez** - *Initial work* - [BlueSialia](https://github.com/BlueSialia)

See also the list of [contributors](https://github.com/BlueSialia/kill-team-rules-generator/contributors) who participated in this project.

## License

This project is licensed under the Hippocratic License 3.0. See the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

Built with the Vite, TypeScript, Biome, Zod, and Vitest ecosystems.
