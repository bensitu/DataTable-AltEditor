# Publishing

## GitHub Pages

The `Deploy examples` workflow builds and deploys the static demonstration site after pushes to `master`. It also supports manual execution from the repository's default branch. Other branches cannot deploy through this workflow. If the default branch changes, update the push branch filter in `.github/workflows/pages.yml`.

In repository Settings, open Pages and select **GitHub Actions** as the build and deployment source. Allow the default branch to deploy to the `github-pages` environment. The workflow uses the built-in `GITHUB_TOKEN` and does not need a personal access token.

Run `npm run build:pages` locally to rebuild `dist/` and assemble `.pages/`. The output contains `index.html`, `example/`, `dist/`, and `translations/`, preserving relative links for project sites. It excludes development dependencies, tests, and Git metadata. The output directory is replaced on each build and is not committed. The site is static HTML; `_config.yml` is not used. Examples still require access to their external CDN dependencies.

## GitHub release drafts

Merge the intended release code into the default branch with matching versions in `package.json` and `package-lock.json`. Add the release notes under the corresponding version heading in `CHANGELOG.md`. Both `## 4.0.1 - YYYY-MM-DD` and `## [4.0.1] - YYYY-MM-DD` heading formats are accepted.

From Actions, run **Draft GitHub release** on the default branch and enter the package version, optionally prefixed with `v`. The workflow checks the version and notes, installs dependencies with Node.js 24, runs formatting, lint, coverage, DataTables compatibility, and browser checks, then packages the built distribution. It creates an annotated `v<version>` tag at the selected commit and a draft release containing the npm `.tgz` archive and its SHA-256 checksum. Versions containing a prerelease identifier are marked as prereleases.

Review and publish the draft in GitHub when ready. The workflow does not publish to the npm registry and does not change package versions automatically. Existing tags or releases are not overwritten. If release creation fails after the tag was pushed, the tag remains: inspect the failure and either finish creating the draft for that tag or remove the tag deliberately before retrying. The workflow does not automatically delete remote tags or releases.

The workflow files must be present on the default branch to appear in the manual Actions menu. Creating tags and release drafts requires repository Actions write permission for contents. Local build verification does not exercise GitHub deployment or release permissions.
