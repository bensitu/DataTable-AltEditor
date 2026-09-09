import { spawnSync } from 'node:child_process';
const run = (command) => {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
};
run('npm run build');
run('npx vitest run --config vitest.compat.config.mjs');
run('npx playwright test');
