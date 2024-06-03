# Release Procedure

## Version Numbers

This software follows the [Semantic Versioning (SemVer)](https://semver.org/).<br>
It always has the format `MAJOR.MINOR.PATCH`, e.g. `1.5.0`.

## GitHub and NPM Release

### 1. 🐙 Create a `Draft GitHub Release`

- Named `v0.12.1`
- Possibly add Title to the Release Notes Headline

### 2. 📝 Update the version files

- `📝CHANGELOG.md`
  - All Pull Request are included
  - Add a new section with correct version number
  - Give the suitable name to the release
- `📝package.json`
  - Update `version`

### 3. 🐙 Update `Documentation`

- Navigate to github workflows and manually start the process to generate and host the new documentation page

### 4. 🐙 Publish `Release` on GitHub and NPM

- Navigate to your releases on GitHub and open your draft release.
- Summarize key changes in the description
  - Use the `generate release notes` button provided by github (This only works after the release branch is merged on production)
- Choose the correct git `tag`
- Choose the `main` branch
- Publish release
