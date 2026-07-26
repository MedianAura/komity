import 'reflect-metadata';
import dotenvFlow from 'dotenv-flow';
import { fileURLToPath } from 'node:url';

// `silent` : sans fichier `.env*`, dotenv-flow écrivait un avertissement sur
// stderr à chaque invocation. Rien n'est optionnel ici, l'absence est le cas
// normal.
//
// `path` : depuis la racine du package, pas depuis process.cwd(). Sinon komity
// charge le `.env` du projet appelant — jamais documenté, et un `PINO_DEBUG` qui
// s'y trouve allumait la sortie de debug chez un consommateur. Reste équivalent
// en développement, où cwd est déjà la racine du package.
dotenvFlow.config({
  path: fileURLToPath(new URL('../', import.meta.url)),
  silent: true,
});

export async function run(): Promise<number> {
  const program = await import('./main.js');
  return program.run();
}
