import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // `src/entry.ts` est le point d'entrée du build ; `bin/run.js` est déduit du
  // champ `bin` de package.json. `src/index.ts` n'a jamais existé : le graphe
  // analysé était fantôme.
  entry: ['src/entry.ts'],
  project: ['src/**/*.ts', 'bin/**/*.js'],
  // Invoqués depuis des chaînes de commande que knip ne lit pas : les actions de
  // `.concatenate/*.json` et le `testRunner` de `stryker.config.mjs`.
  ignoreDependencies: ['prettier', 'eslint-formatter-pretty', '@stryker-mutator/vitest-runner'],
  ignoreBinaries: ['stryker'],
};

export default config;
