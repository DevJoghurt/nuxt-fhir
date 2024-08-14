import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils';

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/basic'),
  server: true
})