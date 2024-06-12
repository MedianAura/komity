import { type Logger, pino } from 'pino';
import { build } from 'pino-pretty';

const stream = build({
  colorize: true,
});
const debug = pino(stream);

export function getDebugger(): Logger {
  debug.level = 'debug';
  if (!process.env.PINO_DEBUG || process.env.PINO_DEBUG === '0') {
    debug.level = 'silent';
  }

  return debug;
}
