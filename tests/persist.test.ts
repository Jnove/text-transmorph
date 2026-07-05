import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig, mergeKnown, pickInitial } from '../src/config/persist'
import { defaultConfig, type Config } from '../src/config/types'

describe('config persistence', () => {
  it('round-trips a config through encode/decode', () => {
    const custom: Config = { ...defaultConfig, phrases: ['你好', 'World'], holdMs: 900, movement: 'swirl' }
    expect(decodeConfig(encodeConfig(custom), defaultConfig)).toEqual(custom)
  })

  it('survives unicode phrases in the encoded string', () => {
    const c: Config = { ...defaultConfig, phrases: ['文字解离', '重组动画'] }
    expect(decodeConfig(encodeConfig(c), defaultConfig).phrases).toEqual(['文字解离', '重组动画'])
  })

  it('falls back to base on malformed input', () => {
    expect(decodeConfig('%%%not-json%%%', defaultConfig)).toEqual(defaultConfig)
    expect(decodeConfig('', defaultConfig)).toEqual(defaultConfig)
  })

  it('mergeKnown ignores unknown keys and type mismatches', () => {
    const merged = mergeKnown(defaultConfig, {
      holdMs: 500,            // valid
      dotColor: 12345,        // wrong type → ignored
      bogusKey: 'nope',       // unknown → ignored
      phrases: [1, 2],        // not string[] → ignored
    })
    expect(merged.holdMs).toBe(500)
    expect(merged.dotColor).toBe(defaultConfig.dotColor)
    expect(merged.phrases).toEqual(defaultConfig.phrases)
    expect('bogusKey' in merged).toBe(false)
  })

  it('pickInitial prefers hash, then stored, then defaults', () => {
    const hashCfg: Config = { ...defaultConfig, holdMs: 111 }
    const storedCfg: Config = { ...defaultConfig, holdMs: 222 }
    expect(pickInitial(defaultConfig, encodeConfig(hashCfg), encodeConfig(storedCfg)).holdMs).toBe(111)
    expect(pickInitial(defaultConfig, null, encodeConfig(storedCfg)).holdMs).toBe(222)
    expect(pickInitial(defaultConfig, null, null)).toEqual(defaultConfig)
  })
})
