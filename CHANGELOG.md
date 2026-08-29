# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Engine re-samples once webfonts have settled (`document.fonts.ready` +
  `loadingdone`) so async-loaded faces don't leave the dot layout in fallback fonts.
- Live `prefers-reduced-motion` toggling in the embeddable library:
  freezing / resuming follows the OS preference without reload.

## [0.1.0] - 2026-08-29

### Added
- Initial public embeddable library (`text-transmorph`).
- `createTextTransmorph(canvas, options)` entry point with hot-updatable
  config (`tm.set({...})`), pause/play, manual `renderAt`, and
  `durationMs` / `destroy` for cleanup.
- Lower-level exports: `Engine`, `defaultConfig`, `STAGE_PRESETS`,
  `createStore`, `sampleText`, `sampleWithRasterizer`, `rasterizeCanvas`,
  `splitLines`, `ALPHA_THRESHOLD`, `ParticleSystem`, `pairPoints`,
  `waypointFor`, `easings`, `sequenceState`, `cycleDuration`,
  `mulberry32`, `drawStage`, `blitFit`, `Vec2`, `PlaybackClock`.
- ESM (`text-transmorph.js`) and UMD (`text-transmorph.umd.cjs`) builds
  plus matching TypeScript declarations under `dist-lib/types/`.
- Demo at `examples/basic.html` (consumes the built bundle directly).
- 108 unit tests across 14 files covering sampling, particles, easing,
  sequencer, persistence, filename sanitization, config store, PlaybackClock,
  Engine, and Transmorph — all running under Node, no browser required.
