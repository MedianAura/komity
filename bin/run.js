#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import updateNotifier from 'update-notifier';
import { run } from '../dist/entry.js';

// Depuis l'emplacement du module, pas process.cwd() : autrement update-notifier
// interroge le registre pour le package du projet appelant.
const packageJSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), { encoding: 'utf8' }));

updateNotifier({
  pkg: packageJSON,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
}).notify();

const status = await run();
// eslint-disable-next-line n/no-process-exit
process.exit(status);
