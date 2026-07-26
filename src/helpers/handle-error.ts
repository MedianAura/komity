import { KomityError, ReportedError } from './errors.js';
import { Logger } from './logger.js';
import { SCHEMA_VERSION } from './schema.js';

export function handleError(error: unknown, isJSON = false): number {
  // Le runner a déjà écrit sa charge utile : une seconde sortie casserait le
  // `JSON.parse` de l'appelant.
  if (error instanceof ReportedError) {
    return 1;
  }

  if (isJSON) {
    const code = error instanceof KomityError ? error.code : 'unknown-error';
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof KomityError ? error.details : {};

    console.log(JSON.stringify({ schema: SCHEMA_VERSION, error: { code, message, ...details } }));
    return 1;
  }

  if (error instanceof Error) {
    Logger.error(error.message);
    return 1;
  }

  console.error('Unknown Error :', error);
  return 1;
}
