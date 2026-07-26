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
    for (const command of ['commit', 'generate', 'validate', 'branch', 'types', 'setup']) {
      expect(stdout).toContain(command);
    }
  });

  it("s'exécute hors d'un dépôt git sans planter", async () => {
    const { exitCode } = await withTemporaryDirectory(async (directory) => runCLI(['--version'], { cwd: directory }));

    expect(exitCode).toBe(0);
  });

  describe('types', () => {
    it('liste les huit types acceptés', async () => {
      const { exitCode, stdout } = await runCLI(['types']);

      expect(exitCode).toBe(0);
      for (const type of ['feature', 'fix', 'style', 'refactor', 'maintenance', 'doc', 'test', 'dep']) {
        expect(stdout).toContain(type);
      }
    });

    // Régression : la bannière et l'effacement d'écran appartiennent à la seule
    // commande interactive, `commit`.
    it("n'affiche ni bannière ni effacement d'écran", async () => {
      const { stdout } = await runCLI(['types']);

      expect(stdout.startsWith('feature')).toBe(true);
      expect(stdout).not.toContain('[KOMITY]');
    });

    // Le contrat agent : `stdout` doit se parser tel quel, sans bannière ni ANSI.
    it('émet du JSON analysable sous --json', async () => {
      const { exitCode, stdout } = await runCLI(['--json', 'types']);

      expect(exitCode).toBe(0);

      const payload = JSON.parse(stdout) as { schema: number; types: { value: string }[] };
      expect(payload.schema).toBe(1);
      expect(payload.types.map((type) => type.value)).toEqual(['feature', 'fix', 'style', 'refactor', 'maintenance', 'doc', 'test', 'dep']);
    });
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
