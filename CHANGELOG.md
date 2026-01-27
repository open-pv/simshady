# Changelog

All notable changes to this project will be documented in this file.
For each version important additions, changes and removals are listed here.

The format is inspired from [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and the versioning aims to respect [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## v0.2.1 - 2026-01-27

### Changes

- Shading geometry filtering and runtime estimation by @mestr01 in https://github.com/open-pv/simshady/pull/74
- Fix broken link #75 by @FlorianK13 in https://github.com/open-pv/simshady/pull/76
- Fix cli bugs by @mestr01 in https://github.com/open-pv/simshady/pull/77

## v0.2.0 - The CLI 2025-12-01

### Changes

- Repair links #58 by @FlorianK13 in https://github.com/open-pv/simshady/pull/59
- Add simshady to docs links #60 by @FlorianK13 in https://github.com/open-pv/simshady/pull/61
- Create a joss publication by @FlorianK13 in https://github.com/open-pv/simshady/pull/62
- Add acknowledgement statement. by @kpoeppel in https://github.com/open-pv/simshady/pull/63
- Bump vite from 6.3.4 to 6.3.6 by @dependabot[bot] in https://github.com/open-pv/simshady/pull/65
- 64 puppeteer only approach by @mestr01 in https://github.com/open-pv/simshady/pull/68
- Bump vite from 6.3.6 to 6.4.1 by @dependabot[bot] in https://github.com/open-pv/simshady/pull/69
- Updates for joss publication by @FlorianK13 in https://github.com/open-pv/simshady/pull/72

## v0.1.0 - 2025-04-21

### Changes

- Use skydomes in the simshady simulation by @FlorianK13 in #48

## v0.0.5 - 2024-09-17

### Changes

- Add keywords by @FlorianK13 in #29
- Add Contributing.md by @FlorianK13 in #29
- Stop hogging the main thread during calculation (No more "this website is slowing down your browser") by @khdlr in #32

### Fixes

- Fix incorrect handling of indexed geometries by @khdlr in #36
- Fix outdated usage example in README.md by @khdlr in #37
- Fix incorrect handling of clockwise-oriented polygons by @khdlr in #31

## [v0.0.4] - 2024-08-30

### Changes

- Delete hardcoded url for tif files by @FlorianK13 in #24
- Add units warning to docs by @FlorianK13 in #25
- Make colormaps configurable by @FlorianK13 in #27

## [v0.0.3] - 2024-08-19

Update of version number was not done in 0.0.2, so another release was needed 🥇

## [v0.0.2] Bug Fixes - 2024-08-19

### Changes

- Use Diffuse Radiation in WebGL by @FlorianK13 in #15
- Include diffuse radiation by @FlorianK13 in #18
- Shadinggeometry should be infered from simgeometry by @FlorianK13 in #21

## [v0.0.1] First NPM Release - 2024-06-03

### Added

- Add Main class `ShadingScene`
- Add WebGL code for shading simulation
- Add method for digital elevation models
- Add method for diffuse radiation
- Add documentation page on github pages
