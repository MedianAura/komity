import { execa } from 'execa';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Les tests e2e lancent `bin/run.js`, qui importe `dist/entry.js`. On reproduit
// `pnpm build` sans passer par le gestionnaire de paquets : appeler `tsc` via
// node évite la résolution de `pnpm.cmd` sous Windows.
export default async function setup(): Promise<void> {
  await rm(path.join(root, 'dist'), { recursive: true, force: true });
  await execa(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.build.json'], {
    cwd: root,
    stdio: 'inherit',
  });
}
