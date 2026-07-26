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

  describe('commit --input', () => {
    it("assemble le message et ne l'écrit pas dans le dépôt", async () => {
      const payload = JSON.stringify({ type: 'fix', scope: 'ab-12', subject: 'corrige la redirection' });
      const { exitCode, stdout } = await runCLI(['commit', '--input', payload]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('fix(AB-12): corrige la redirection');
    });

    it('lit la charge utile sur stdin avec -', async () => {
      const payload = JSON.stringify({ type: 'feature', subject: 'ajoute une chose' });
      const { exitCode, stdout } = await runCLI(['commit', '--input', '-'], { input: payload });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('feature: ajoute une chose');
    });

    // Aller-retour : ce que komity assemble doit passer komity validate.
    it('produit un message que validate accepte', async () => {
      const payload = JSON.stringify({ type: 'fix', scope: 'ab-12', subject: 'corrige', body: 'détail', log: true });
      const composed = await runCLI(['--json', 'commit', '--input', payload]);
      const { message } = JSON.parse(composed.stdout) as { message: string };

      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', message);
        return runCLI(['validate', file]);
      });

      expect(exitCode).toBe(0);
    });

    it('rejette un type inconnu en annonçant les types valides', async () => {
      const payload = JSON.stringify({ type: 'nope', subject: 'x' });
      const { exitCode, stdout } = await runCLI(['--json', 'commit', '--input', payload]);

      expect(exitCode).not.toBe(0);

      const { error } = JSON.parse(stdout) as { error: { allowedTypes: string[]; code: string } };
      expect(error.code).toBe('type-unknown');
      expect(error.allowedTypes).toContain('fix');
    });

    // Le garde-fou : sans lui, inquirer bloquerait jusqu'au timeout du job.
    it('refuse de demander quoi que ce soit hors TTY', async () => {
      const { exitCode, stdout } = await runCLI(['--json', 'commit']);

      expect(exitCode).not.toBe(0);
      expect((JSON.parse(stdout) as { error: { code: string } }).error.code).toBe('input-required');
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

    it('rend un diagnostic actionnable sous --json', async () => {
      const { exitCode, stdout } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', '# gabarit\n\nfixed the login bug\n');
        return runCLI(['--json', 'validate', file]);
      });

      expect(exitCode).not.toBe(0);

      const payload = JSON.parse(stdout) as {
        allowedTypes: string[];
        errors: { rule: string }[];
        header: string;
        valid: boolean;
      };

      expect(payload.valid).toBe(false);
      expect(payload.header).toBe('fixed the login bug');
      expect(payload.errors.map((error) => error.rule)).toEqual(['format-invalid']);
      expect(payload.allowedTypes).toContain('fix');
    });

    it('sort un succès analysable sous --json', async () => {
      const { exitCode, stdout } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', 'feature: ajoute une chose\n');
        return runCLI(['--json', 'validate', file]);
      });

      expect(exitCode).toBe(0);
      expect((JSON.parse(stdout) as { valid: boolean }).valid).toBe(true);
    });
  });
});
