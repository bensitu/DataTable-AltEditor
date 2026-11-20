# Publishing

[Documentation](README.md) · [Project overview](../README.md)

## npm package

The public package name is `@bensitu/datatable-alteditor`. `publishConfig` sets public access and the npm registry. The author metadata identifies Ben Situ, while contributor metadata and license banners retain the original attribution. npm assigns registry maintainers from the accounts that own or can publish the package.

The package includes these runtime files in addition to documentation, translations, and the license.

| File                                    | Purpose                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `dist/dataTables.altEditor.js`          | Readable UMD JavaScript and the `main` entry               |
| `dist/dataTables.altEditor.min.js`      | Minified UMD JavaScript and the `unpkg` / `jsdelivr` entry |
| `dist/dataTables.altEditor.css`         | Readable stylesheet                                        |
| `dist/dataTables.altEditor.min.css`     | Minified stylesheet and the `style` entry                  |
| `dist/dataTables.altEditor.js.map`      | Readable JavaScript source map                             |
| `dist/dataTables.altEditor.min.js.map`  | Minified JavaScript source map                             |
| `dist/dataTables.altEditor.min.css.map` | Minified CSS source map                                    |

JavaScript and CSS must both be loaded by applications. DataTables and jQuery are peer dependencies and are not bundled. Optional frameworks and field plugins remain separate. Examples, development dependencies, and repository tooling are excluded from the archive; obtain examples through GitHub or the live site.

From the intended release checkout, verify the package before publication.

```sh
npm ci --engine-strict
npm run format:check
npm run lint
npm run build
npm test
npm pack --dry-run
npm publish --dry-run --access public
```

The `prepack` script rebuilds the distribution for normal packing and publication. A scoped package archive is named `bensitu-datatable-alteditor-<version>.tgz`. Inspect the actual archive when distributing it separately. Development Node.js constraints are configured with `devEngines`, independently of browser consumers.

### Publish a GitHub release to npm

Configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for this repository, workflow filename `publish-npm.yml`, and environment `npm`. The trusted publisher must allow direct publication. Publish the GitHub release first, then run **Publish to npm** in Actions with its version and the intended npm distribution tag.

Run from the release commit on the default branch or select the matching release tag if the branch has advanced. The workflow verifies the tag, the package checksum, and that the archive matches a fresh package from the tagged files. It publishes the release archive with provenance. The release workflows use a fixed Node.js version with bundled npm so both runs use the same packaging tools.

### Publish manually

To publish manually, sign in with an npm account allowed to publish under `@bensitu`, confirm its identity, and publish the checked version.

```sh
npm login
npm whoami
npm publish --access public
```

Follow npm's authentication prompts when required. Each package name and version can be published once. Create and review the GitHub release separately when both distribution channels are needed.

## Contribution templates

Merge `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md` into the default branch to make the templates available on GitHub. The Issue chooser provides bug reports, feature requests, and documentation or usage questions, while retaining blank issues for other topics. No workflow run or deployment is needed to activate the templates.

## GitHub Pages

The `Deploy examples` workflow builds and deploys the static demonstration site after pushes to `master`. It also supports manual execution from the repository's default branch. Other branches cannot deploy through this workflow. If the default branch changes, update the push branch filter in `.github/workflows/pages.yml`.

In repository Settings, open Pages and select **GitHub Actions** as the build and deployment source. Allow the default branch to deploy to the `github-pages` environment. The workflow uses the built-in `GITHUB_TOKEN` and does not need a personal access token.

Run `npm run build:pages` locally to rebuild `dist/` and assemble `.pages/`. The output contains `index.html`, `example/`, `dist/`, and `translations/`, preserving relative links for project sites. It excludes development dependencies, tests, and Git metadata. The output directory is replaced on each build and is not committed. The site is static HTML; `_config.yml` is not used. Examples still require access to their external CDN dependencies.

## GitHub release drafts

Merge the intended release code into the default branch with matching versions in `package.json` and `package-lock.json`. Add the release notes under the corresponding version heading in `CHANGELOG.md`. Both `## 4.1.0 - YYYY-MM-DD` and `## [4.1.0] - YYYY-MM-DD` heading formats are accepted.

From Actions, run **Draft GitHub release** on the default branch and enter the package version, optionally prefixed with `v`. The read-only build job verifies the release metadata, builds and checks the committed distribution, runs the compatibility tests, and packages the release files. A separate job creates the annotated `v<version>` tag at the selected commit and the draft with the npm `.tgz` archive and its SHA-256 checksum. Versions containing a prerelease identifier are marked as prereleases.

Review and publish the draft in GitHub when ready. The workflow does not publish to the npm registry and does not change package versions automatically. Existing tags or releases are not overwritten. If release creation fails after the tag was pushed, the tag remains: inspect the failure and either finish creating the draft for that tag or remove the tag deliberately before retrying. The workflow does not automatically delete remote tags or releases.

The workflow files must be present on the default branch to appear in the manual Actions menu. Creating tags and release drafts requires repository Actions write permission for contents. Local build verification does not exercise GitHub deployment or release permissions.
