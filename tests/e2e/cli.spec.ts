import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCLI, withTemporaryDirectory, writeCommitFile } from './helpers/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageJSON = JSON.parse(readFileSync(path.join(root, 'package.json'), { encoding: 'utf8' })) as {
  version: string;
};

// Chaque cas paie ~1,9 s de démarrage du CLI (voir #4 et #10) : en série la
// suite dure 12 s, en parallèle elle est bornée par le cas le plus lent.
describe.concurrent('komity', () => {
  it('affiche sa version', async () => {
    const { exitCode, stdout } = await runCLI(['--version']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain(packageJSON.version);
  });

  it('liste toutes les commandes', async () => {
    const { exitCode, stdout } = await runCLI(['--help']);

    expect(exitCode).toBe(0);
    for (const command of ['commit', 'generate', 'validate', 'branch', 'setup']) {
      expect(stdout).toContain(command);
    }
  });

  it("s'exécute hors d'un dépôt git sans planter", async () => {
    const { exitCode } = await withTemporaryDirectory(async (directory) => runCLI(['--version'], { cwd: directory }));

    expect(exitCode).toBe(0);
  });

  describe('validate', () => {
    it('accepte un en-tête valide', async () => {
      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', 'feature: ajoute une chose\n');
        return runCLI(['validate', file]);
      });

      expect(exitCode).toBe(0);
    });

    it('refuse un type inconnu', async () => {
      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', 'nope: x\n');
        return runCLI(['validate', file]);
      });

      expect(exitCode).not.toBe(0);
    });

    // L'assertion inverse promise par #11 : avant #1, la ligne de corps
    // satisfaisait le motif et le commit passait.
    it("refuse un en-tête invalide qu'une ligne de corps rendait valide", async () => {
      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', 'fixed the login bug\n\nfix: this line is what actually satisfies the regex\n');
        return runCLI(['validate', file]);
      });

      expect(exitCode).not.toBe(0);
    });

    it('laisse passer un commit de merge', async () => {
      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', "Merge branch 'main' into feature\n");
        return runCLI(['validate', file]);
      });

      expect(exitCode).toBe(0);
    });
  });
});
