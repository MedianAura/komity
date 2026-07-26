import { execa } from 'execa';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bin = path.join(root, 'bin/run.js');

/**
 * Lance le CLI construit dans un sous-processus. `reject: false` : les cas
 * d'échec attendus sont des assertions sur `exitCode`, pas des throws.
 */
export interface CLIResult {
  exitCode: number | undefined;
  stderr: string;
  stdout: string;
}

export async function runCLI(arguments_: string[], options: { cwd?: string; input?: string } = {}): Promise<CLIResult> {
  const result = await execa(process.execPath, [bin, ...arguments_], {
    cwd: options.cwd ?? root,
    reject: false,
    // Toujours fourni : stdin reste un pipe, donc `isTTY` est faux dans le
    // sous-processus — ce que testent les cas non interactifs.
    input: options.input ?? '',
    env: {
      // update-notifier interroge le registre npm et écrit dans un cache global.
      NO_UPDATE_NOTIFIER: '1',
      NODE_ENV: 'test',
    },
  });

  // `stdout`/`stderr` sont typés en union par execa : on les fige en chaînes
  // pour que les cas puissent faire un `JSON.parse` direct.
  return {
    exitCode: result.exitCode,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  };
}

/** Répertoire temporaire jetable, hors de tout dépôt git. */
export async function withTemporaryDirectory<T>(callback: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(tmpdir(), 'komity-e2e-'));

  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Écrit un fichier de message de commit et renvoie son chemin absolu. */
export async function writeCommitFile(directory: string, name: string, content: string): Promise<string> {
  const file = path.join(directory, name);
  await writeFile(file, content, { encoding: 'utf8' });
  return file;
}
