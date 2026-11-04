import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import createConfig from '../vite.config.js'

const config = createConfig({ mode: 'test' })
const routes = config.plugins.find((plugin) => plugin.name === 'page-routes')

for (const hook of ['configureServer', 'configurePreviewServer']) {
  test(`${hook} serves the slashless intro URL without changing other pages`, () => {
    let middleware
    routes[hook]({
      middlewares: {
        use(handler) {
          middleware = handler
        },
      },
    })

    for (const [url, expected] of [
      ['/intro', '/intro/index.html'],
      ['/intro?from=gaming', '/intro/index.html?from=gaming'],
      ['/intro/', '/intro/'],
      ['/intro/index.html', '/intro/index.html'],
      ['/portfolio', '/portfolio/index.html'],
      ['/gaming', '/gaming/index.html'],
      ['/wuthering-waves', '/wuthering-waves/index.html'],
      ['/wuthering-waves/characters', '/wuthering-waves/index.html'],
      ['/wuthering-waves/characters/aalto?x=1', '/wuthering-waves/index.html?x=1'],
      ['/wuthering-waves/archives', '/wuthering-waves/index.html'],
      ['/wuthering-waves/archives/weapons/abyss-surges', '/wuthering-waves/index.html'],
      ['/wutheringwaves/team-calculations', '/wuthering-waves/index.html'],
      ['/wuthering-waves-other', '/wuthering-waves-other'],
      ['/', '/'],
      ['/intro-other', '/intro-other'],
    ]) {
      const request = { url }
      let nextCalls = 0
      middleware(request, {}, () => {
        nextCalls += 1
      })
      assert.equal(request.url, expected)
      assert.equal(nextCalls, 1)
    }
  })
}

test('production builds and Vercel route /intro and Wuthering Waves to their entries', async () => {
  assert.match(config.build.rollupOptions.input.intro, /[\\/]intro[\\/]index\.html$/)
  assert.match(config.build.rollupOptions.input.wuwa, /[\\/]wuthering-waves[\\/]index\.html$/)
  const deployment = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.deepEqual(deployment.rewrites, [
    { source: '/intro', destination: '/intro/index.html' },
    { source: '/wuthering-waves/:path*', destination: '/wuthering-waves/index.html' },
    { source: '/wutheringwaves/:path*', destination: '/wuthering-waves/index.html' },
  ])
})
