import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { createBinderPage, storageKeys } from '../src/services/storage.ts'

const require = createRequire(import.meta.url)

// Execute App's actual initializers and mount effects with isolated hook/storage
// doubles. No browser profile or real localStorage is accessed.
function mountApp(initial: Record<string, string>, unavailable = false, writeFailure = false) {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  const effects: Array<() => unknown> = []
  const storage = {
    getItem(key: string) { if (unavailable) throw Error('Denied'); return data.get(key) ?? null },
    setItem(key: string, value: string) { if (writeFailure) throw Error('Quota'); writes.push(key); data.set(key, value) },
  }
  const window = {
    localStorage: storage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }
  const execute = (file: string) => {
    const exports: Record<string, unknown> = {}
    const code = transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
    }).outputText
    runInNewContext(code, {
      exports, window, document: { addEventListener() {}, removeEventListener() {} },
      require(name: string) {
        if (name === './services/storage') return execute('src/services/storage.ts')
        if (name === 'react') return {
          useState(initial: unknown) {
            let value = typeof initial === 'function' ? initial() : initial
            return [value, (next: unknown) => { value = typeof next === 'function' ? next(value) : next }]
          },
          useRef: (value: unknown) => ({ current: value }),
          useEffect: (effect: () => unknown) => effects.push(effect),
          useEffectEvent: (callback: unknown) => callback,
        }
        if (name === 'react/jsx-runtime') return require(name)
        return new Proxy({}, { get: (_, key) => String(key) })
      },
    })
    return exports
  }
  const App = execute('src/App.tsx').default as () => unknown
  const tree = App()
  // React StrictMode can run mount effects twice.
  effects.forEach(effect => effect())
  effects.forEach(effect => effect())
  return { data, writes, tree }
}

test('mount never overwrites malformed collection data; binder saving remains enabled', () => {
  const raw = '{broken'
  const app = mountApp({ [storageKeys.collection]: raw })
  assert.equal(app.data.get(storageKeys.collection), raw)
  assert.ok(!app.writes.includes(storageKeys.collection))
  assert.ok(app.writes.includes(storageKeys.binder))
  assert.match(JSON.stringify(app.tree), /Storage warning/)
})

test('invalid modern binder blocks initial migration/autosave but not collection saving', () => {
  const raw = JSON.stringify({ slots: 'wrong' })
  const legacy = JSON.stringify(createBinderPage(1))
  const app = mountApp({ [storageKeys.binder]: raw, [storageKeys.legacyBinder]: legacy })
  assert.equal(app.data.get(storageKeys.binder), raw)
  assert.equal(app.data.get(storageKeys.legacyBinder), legacy)
  assert.ok(!app.writes.includes(storageKeys.binder))
  assert.ok(app.writes.includes(storageKeys.collection))
})

test('valid JSON with unexpected collection/binder structures renders safely', () => {
  for (const raw of ['null', '{}', '[null]', '"wrong"', '']) {
    const app = mountApp({ [storageKeys.collection]: raw, [storageKeys.binder]: raw })
    assert.equal(app.data.get(storageKeys.collection), raw)
    assert.equal(app.data.get(storageKeys.binder), raw)
  }
})

test('unavailable storage and failed writes do not throw during initialization or mount', () => {
  assert.doesNotThrow(() => mountApp({}, true))
  assert.doesNotThrow(() => mountApp({}, false, true))
})

test('missing data initializes normally; valid legacy page migrates without changing source', () => {
  const legacy = JSON.stringify({ ...createBinderPage(1), name: 'Keep this name' })
  const app = mountApp({ [storageKeys.legacyBinder]: legacy })
  assert.equal(app.data.get(storageKeys.legacyBinder), legacy)
  const pages = JSON.parse(app.data.get(storageKeys.binder)!)
  assert.equal(pages.length, 40)
  assert.equal(pages[0].name, 'Keep this name')
})
