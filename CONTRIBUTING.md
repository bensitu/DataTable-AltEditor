# Contributing

[Project overview](README.md) · [Documentation](docs/README.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

Bug fixes, documentation improvements, translations, and small, focused examples are welcome. Search existing issues before opening a new one. Use the [Issue templates](https://github.com/bensitu/DataTable-AltEditor/issues/new/choose) for bugs, feature requests, and documentation or usage questions. Follow the [Security Policy](SECURITY.md) for private vulnerability reporting.

## Local development

Fork and clone the repository. Base changes on `develop`. Development dependencies require Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`; Node.js 24 is recommended.

```sh
npm ci --engine-strict
npm run build
npm run dev
```

Open [the local examples](http://127.0.0.1:8080/). Examples load `dist/`, so rebuild after source changes. Their external CDN dependencies require network access. The generated JavaScript, CSS, and source maps in `dist/` are tracked; commit them with source changes.

## Making changes

Use English comments and neutral, professional language. Keep examples short, explicit, and suitable for copying into an application. Edit modular JavaScript and CSS under `src/`, not generated distribution files. Keep public API changes and documentation consistent. Preserve MIT attribution.

Add release notes under the corresponding version in [CHANGELOG.md](CHANGELOG.md). Keep historical entries intact. Translation changes should preserve the documented JSON structure and use plain text; see [Translations](docs/translations.md).

## Verification

Run formatting and lint checks for relevant changes:

```sh
npm run format:check
npm run lint
```

For behavior changes, run `npm test` and add a focused regression test when it demonstrates the problem. `npm run test:coverage` measures all JavaScript source with an aggregate minimum of 80% for statements, branches, functions, and lines. Prefer meaningful coverage over repetitive assertions or tests of static file contents.

For browser behavior or styles, rebuild and run the relevant Playwright tests. Install Chromium once with `npx playwright install chromium`; `npm run test:e2e` runs the regular Chromium suite. For broader compatibility changes, install all browsers with `npx playwright install` and run `npm run test:compat`. That command also checks DataTables 2.1.8, Firefox, WebKit, Bootstrap 4, and Foundation.

Documentation-only changes need link, formatting, and content checks rather than the complete runtime test suite. Check screenshots against the current examples and keep image files small. Existing source syntax targets ES2015; tests and build scripts use newer Node.js APIs.

## Local distribution archives

Run `npm pack --dry-run` to inspect the file list or `npm pack` to build a local `.tgz` archive. The package metadata retains the name `datatables.net-AltEditor` for compatibility; these commands do not publish to a registry. An application can install the generated archive from its filesystem. For a complete source checkout including examples and contribution files, use Git or GitHub's source archive.

## Pull requests

Submit a focused pull request against `develop`. Explain the problem, resulting behavior, and relevant verification. Link related issues and include screenshots for visual changes. Use the supplied PR template; remove sections that do not apply. Mention compatibility changes and remaining limitations directly.

CI verifies a clean installation and runs the configured checks. A local commit does not publish a package or deploy the example site. Maintainers use the [publishing guide](docs/publishing.md) for GitHub releases and Pages deployment. The project has no current plans to publish to the npm registry.
