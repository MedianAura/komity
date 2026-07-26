import { Logger } from './logger.js';
import { SCHEMA_VERSION } from './schema.js';

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
