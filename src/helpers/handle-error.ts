import { Logger } from './logger.js';

export function handleError(error: unknown): number {
  if (error instanceof Error) {
    Logger.error(error.message);
    return 1;
  }

  console.error('Unknown Error :', error);
  return 1;
}
