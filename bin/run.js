#!/usr/bin/env node
import { run } from '../dist/entry.js';

// `update-notifier` coûte ~370 ms d'import. Il n'a rien à afficher quand la sortie
// n'est pas un TTY ni quand l'appelant demande du JSON, et `validate` tourne à
// chaque commit derrière un hook git : le chemin critique se passe des trois.
if (process.stdout.isTTY && !process.argv.includes('--json') && process.argv[2] !== 'validate') {
  const { readFileSync } = await import('node:fs');
  const { default: updateNotifier } = await import('update-notifier');

  // Depuis l'emplacement du module, pas process.cwd() : autrement update-notifier
  // interroge le registre pour le package du projet appelant.
  const packageJSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), { encoding: 'utf8' }));

  updateNotifier({
    pkg: packageJSON,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
  }).notify();
}

const status = await run();
// eslint-disable-next-line n/no-process-exit
process.exit(status);
