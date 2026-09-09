import { defineConfig, mergeConfig } from 'vitest/config';
import config from './vitest.config.mjs';
export default mergeConfig(
  config,
  defineConfig({ resolve: { alias: { 'datatables.net': 'datatables21' } } }),
);
