# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-29

### Fixed
- `verticalCross` / `horizontalCross`: drop the perpendicular wobble that
  was making the swap read as a sideways drift — pure axis-aligned lerp
  now (crossPair already mirrors the halves, no extra bow needed).
- `swirl`: monotonic one-revolution rotation (`ang = a0 + da·e + 2π·e`,
  `rad = lerp(r0, r1, e)`) — no more peak-and-unwrap, no radial pulse.
  The rotation reads as "go around once" instead of "bounce in and out".

### Changed
- Default `dotSize` 9 → 2, `gridSpacing` 13 → 1.5, `idleFloat` 1.5 → 0:
  the rest text renders as a small pixel-art-style block instead of
  chunky squares; the in-repo examples pin the same defaults
  explicitly.
- "随机形态" reroll button: 🎲 emoji replaced by an inline
  refresh-cw SVG (uses `currentColor` so it picks up theme colours,
  rotates -30° on hover for a tactile cue).
- README: collapsed from a long parameter / export / deployment /
  architecture / test dump into the four sections that matter —
  showcase, what it is, quick start, library use.

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
