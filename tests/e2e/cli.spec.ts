import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStagedRepo, runCLI, withTemporaryDirectory, writeCommitFile } from './helpers/cli.js';

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
    it('liste les neuf types acceptés', async () => {
      const { exitCode, stdout } = await runCLI(['types']);

      expect(exitCode).toBe(0);
      for (const type of ['feature', 'fix', 'style', 'refactor', 'perf', 'maintenance', 'doc', 'test', 'dep']) {
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

      const payload = JSON.parse(stdout) as { schema: number; types: { aliases: string[]; value: string }[] };
      expect(payload.schema).toBe(1);
      expect(payload.types.map((type) => type.value)).toEqual(['feature', 'fix', 'style', 'refactor', 'perf', 'maintenance', 'doc', 'test', 'dep']);
    });

    // Les alias font partie du contrat publié : un agent qui écrit `feat:` doit
    // pouvoir apprendre d'ici qu'il sera accepté.
    it('publie les alias conventional-commits', async () => {
      const { stdout } = await runCLI(['--json', 'types']);
      const payload = JSON.parse(stdout) as { types: { aliases: string[]; value: string }[] };

      expect(payload.types.find((type) => type.value === 'feature')?.aliases).toEqual(['feat']);
      expect(payload.types.find((type) => type.value === 'fix')?.aliases).toEqual([]);
    });
  });

  // Régression : `setup` écrit le marqueur en apostrophes et `generate` n'en
  // reconnaissait que la forme en guillemets doubles. Les deux commandes ne
  // composaient donc pas, et rien ne l'attrapait.
  describe('setup puis generate', () => {
    it('lit le marqueur que setup vient décrire', async () => {
      const { exitCode, stdout } = await withTemporaryDirectory(async (directory) => {
        await runCLI(['setup', 'Mon Projet'], { cwd: directory });
        return runCLI(['--json', 'generate', '1.0.0', '--preview'], { cwd: directory });
      });

      // Le répertoire n'est pas un dépôt git, donc la commande échoue — mais sur
      // git, ce qui prouve qu'elle est passée le contrôle du marqueur.
      expect(exitCode).not.toBe(0);
      expect((JSON.parse(stdout) as { error: { code: string } }).error.code).toBe('git-command-failed');
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

    // La forme que #15 débloque : sous PowerShell, ni le JSON en argument ni le
    // pipe ne sont atteignables depuis un wrapper non interactif.
    it('lit la charge utile depuis un chemin de fichier', async () => {
      const { exitCode, stdout } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(
          directory,
          'commit.json',
          JSON.stringify({ type: 'feat', scope: '#15', subject: 'accepte un chemin', body: "des guillemets 'ici' et un @sigil", changelog: 'Accepte un chemin de fichier' }),
        );

        return runCLI(['--json', 'commit', '--input', file]);
      });

      expect(exitCode).toBe(0);

      const { message } = JSON.parse(stdout) as { message: string };
      expect(message).toContain('feature(#15): accepte un chemin');
      expect(message).toContain("des guillemets 'ici' et un @sigil");
      expect(message).toContain('[log] Accepte un chemin de fichier');
    });

    it('nomme le chemin tenté quand le fichier est absent', async () => {
      const { exitCode, stdout } = await runCLI(['--json', 'commit', '--input', './nulle-part.json']);

      expect(exitCode).not.toBe(0);

      const { error } = JSON.parse(stdout) as { error: { code: string; message: string } };
      expect(error.code).toBe('invalid-payload');
      expect(error.message).toContain('nulle-part.json');
    });

    // Le chemin d'écriture n'était testé qu'en échec : `git commit` héritait de
    // stdout et poussait son résumé devant la charge utile, ce que personne ne
    // voyait faute d'un cas qui réussit.
    it('écrit un stdout analysable quand le commit réussit', async () => {
      const { exitCode, stdout } = await withTemporaryDirectory(async (directory) => {
        await createStagedRepo(directory);
        const file = await writeCommitFile(directory, 'commit.json', JSON.stringify({ type: 'fix', subject: 'corrige la redirection' }));

        return runCLI(['--json', 'commit', '--commit', '--input', file], { cwd: directory });
      });

      expect(exitCode).toBe(0);

      const payload = JSON.parse(stdout) as { committed: boolean; ok: boolean };
      expect(payload.ok).toBe(true);
      expect(payload.committed).toBe(true);
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

    // La rampe d'entrée conventional-commits : un dépôt qui écrit déjà `feat:`
    // peut brancher le hook sans réécrire ses conventions.
    it('accepte un alias conventional-commits', async () => {
      const { exitCode } = await withTemporaryDirectory(async (directory) => {
        const file = await writeCommitFile(directory, 'COMMIT_EDITMSG', 'feat(AB-12): ajoute une chose\n');
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
