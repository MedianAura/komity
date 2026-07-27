import { createRequire } from 'node:module';
import type { Logger } from 'pino';

// `pino` et `pino-pretty` coûtent ~180 ms d'import à eux deux, payés au chargement
// du module par toute commande qui touche `git.ts`. Les deux sont CJS : un
// `createRequire` paresseux les sort du chemin critique sans rendre `getDebugger`
// asynchrone. `pino-pretty` n'est chargé que sous `PINO_DEBUG`.
const require = createRequire(import.meta.url);

function create(): Logger {
  const { pino } = require('pino') as typeof import('pino');

  if (!process.env.PINO_DEBUG || process.env.PINO_DEBUG === '0') {
    return pino({ level: 'silent' });
  }

  // `destination: 2`, stderr : par défaut pino-pretty écrit sur stdout, où les
  // lignes de debug s'intercalaient dans la charge utile `--json` et cassaient le
  // `JSON.parse` de l'appelant. Un diagnostic n'est pas une sortie de commande.
  const { build } = require('pino-pretty') as typeof import('pino-pretty');
  const debug = pino(build({ colorize: true, destination: 2 }));
  debug.level = 'debug';

  return debug;
}

// L'instance est mémoïsée dans une fermeture : `create()` ouvre un flux, il ne
// doit pas être rejoué à chaque appel.
export const getDebugger = ((): (() => Logger) => {
  let instance: Logger | undefined;

  return () => (instance ??= create());
})();
