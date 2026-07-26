import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // `src/entry.ts` est le point d'entrée du build, `bin/run.js` celui du binaire.
  // `src/index.ts` n'a jamais existé : knip analysait un graphe fantôme.
  entry: ['src/entry.ts', 'bin/run.js'],
  project: ['src/**/*.ts', 'bin/**/*.js'],
};

export default config;
