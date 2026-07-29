import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveCommitInput } from '../../src/helpers/commit-input.js';
import { KomityError } from '../../src/helpers/errors.js';

// `await` avant le nettoyage, sinon le `finally` supprime le dossier pendant
// qu'il est encore le répertoire courant — EPERM sur Windows.
async function withTemporaryDirectory<T>(callback: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), 'komity-input-'));

  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('resolveCommitInput', () => {
  it('rend une charge utile JSON telle quelle', async () => {
    const payload = '{"type":"fix","subject":"corrige"}';

    await expect(resolveCommitInput(payload)).resolves.toBe(payload);
  });

  // Le tri se fait sur le premier caractère et non sur un `JSON.parse` d'essai :
  // sans ça, un JSON mal formé retomberait sur le système de fichiers et
  // ressortirait en « fichier introuvable », ce qui envoie corriger la mauvaise
  // chose.
  it('laisse un JSON mal formé échouer en JSON plutôt qu’en chemin', async () => {
    const broken = '{"type":"fix",}';

    await expect(resolveCommitInput(broken)).resolves.toBe(broken);
  });

  it('lit le fichier quand l’entrée n’est pas du JSON', async () => {
    const content = await withTemporaryDirectory(async (directory) => {
      const file = path.join(directory, 'commit.json');
      writeFileSync(file, '{"type":"feature","subject":"ajoute"}', { encoding: 'utf8' });

      return resolveCommitInput(file);
    });

    expect(content).toBe('{"type":"feature","subject":"ajoute"}');
  });

  it('résout un chemin relatif depuis le répertoire courant', async () => {
    const content = await withTemporaryDirectory(async (directory) => {
      writeFileSync(path.join(directory, 'commit.json'), '{"type":"fix","subject":"corrige"}', { encoding: 'utf8' });
      const previous = process.cwd();
      process.chdir(directory);

      try {
        return await resolveCommitInput('./commit.json');
      } finally {
        process.chdir(previous);
      }
    });

    expect(content).toContain('"subject":"corrige"');
  });

  // Le code reste `invalid-payload` : l'appelant a passé quelque chose qui
  // n'était ni du JSON ni un fichier lisible, c'est la même classe d'erreur.
  // Le chemin tenté est nommé, sinon « Input is not valid JSON » envoie
  // chercher une faute de syntaxe dans un fichier qui n'existe pas.
  it('échoue en invalid-payload en nommant le chemin tenté', async () => {
    await expect(resolveCommitInput('./nulle-part.json')).rejects.toThrow(KomityError);

    await expect(resolveCommitInput('./nulle-part.json')).rejects.toMatchObject({
      code: 'invalid-payload',
      message: expect.stringContaining('nulle-part.json'),
    });
  });
});
