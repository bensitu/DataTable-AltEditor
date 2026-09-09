import { defineConfig, mergeConfig } from 'vitest/config';
import config from './vitest.config.mjs';
export default mergeConfig(
  config,
  defineConfig({
    test: { env: { DATATABLES_PACKAGE: 'datatables21' } },
    resolve: { alias: { 'datatables.net': 'datatables21' } },
  })
);
