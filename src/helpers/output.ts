import chalk from 'chalk';
import type { CommitWarning } from './commit-lint.js';
import { Logger } from './logger.js';
import { SCHEMA_VERSION } from './schema.js';

/**
 * Sur stderr, et non via `Logger.warn` : celui-ci passe par `log-update` branché
 * sur `process.stdout`. Sous `--json` il casserait le `JSON.parse` de
 * l'appelant, et en mode texte il tomberait à l'intérieur du message assemblé
 * qu'on redirige. Les avertissements sont du bruit au sens du contrat : stdout
 * reste la charge utile.
 */
export function reportWarnings(warnings: CommitWarning[]): void {
  for (const warning of warnings) {
    process.stderr.write(`${chalk.bold.yellow('[WARN]')} ${warning.message}\n`);
  }
}

/**
 * Sortie de succès des commandes. Sous `--json`, la ligne humaine disparaît :
 * un `[SUCCESS]` sur stdout casserait le `JSON.parse` de l'appelant.
 */
export function reportSuccess(json: boolean | undefined, humanMessage: string, extra: Record<string, unknown> = {}): void {
  if (json) {
    console.log(JSON.stringify({ schema: SCHEMA_VERSION, ok: true, ...extra }));
    return;
  }

  Logger.success(humanMessage);
}
