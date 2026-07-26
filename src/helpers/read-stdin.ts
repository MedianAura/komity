import { KomityError } from './errors.js';

/** Lit l'intégralité de stdin, pour `--input -`. */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new KomityError('input-required', '<--input -> was given but stdin is a TTY; pipe the payload in.');
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer));
  }

  return Buffer.concat(chunks).toString('utf8');
}
