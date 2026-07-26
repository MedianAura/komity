import dedent from 'dedent';
import { execaSync } from 'execa';
import { gitlog, type IOptions, type IParseCommit } from 'gitlog2';
import { exec, spawn } from 'node:child_process';
import { registry } from 'tsyringe';
import { KomityError } from '../helpers/errors.js';
import { Logger } from '../helpers/logger.js';
import { getDebugger } from '../helpers/pino.js';

export const GitServiceToken = Symbol('GitService');

@registry([{ token: GitServiceToken, useClass: GitService }])
export class GitService {
  public async isClean(): Promise<boolean> {
    return new Promise((resolve) => {
      const command = 'git diff --no-ext-diff --cached --name-only';
      getDebugger().info(command);

      exec(
        command,
        {
          maxBuffer: Infinity,
        },
        (error, stdout) => {
          if (error) {
            resolve(false);
            return false;
          }

          const output = stdout || '';
          resolve(output.trim().length === 0);
        },
      );
    });
  }

  public getBranch(): string | undefined {
    const command = 'git';

    // `branch --show-current` plutôt que le parsing de `git status` : pas de
    // dépendance à la locale de git, et une chaîne vide sur HEAD détaché.
    const parameters = ['branch', '--show-current'];
    getDebugger().info(`${command} ${parameters}`);

    try {
      const branch = execaSync(command, parameters).stdout.trim();
      return branch === '' ? undefined : branch;
    } catch {
      // Hors dépôt, ou git absent : la signature promet déjà l'optionalité.
      return undefined;
    }
  }

  public async commit(commitMessage: string): Promise<boolean | string> {
    const command = 'git';
    const parameters = ['commit', '-m', dedent(commitMessage)];

    return new Promise((resolve, reject) => {
      const child = spawn(command, parameters, { stdio: 'inherit' });

      child.on('error', (error) => {
        reject(error.message);
      });

      child.on('exit', (code) => {
        if (code) {
          if (code === 128) {
            Logger.warn(`Git exited with code 128. Did you forget to run:
              git config --global user.email "you@example.com"
              git config --global user.name "Your Name"
            `);
          }

          reject(`git exited with error code ${code.toString()}`);
          return;
        }

        resolve(true);
      });
    });
  }

  /**
   * Rafraîchit les tags depuis les remotes. Séparé de `getLatestTag` : c'est le
   * seul appel réseau de `generate`, et le seul dont l'échec — hors ligne, remote
   * qui refuse l'authentification — ne doit pas faire échouer la commande. Les
   * tags locaux restent exploitables. Rend `false` plutôt que de lever, à
   * l'appelant de décider quoi en dire.
   */
  public fetchTags(): boolean {
    const command = 'git';
    const parameters = ['fetch', '--all', '--tags'];
    getDebugger().info(`${command} ${parameters}`);

    try {
      execaSync(command, parameters);
      return true;
    } catch (error: unknown) {
      getDebugger().info(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  public getLatestTag(): string | undefined {
    const command = 'git';

    // Pas de garde `exitCode !== 0` : `execaSync` lève avant qu'elle puisse
    // s'exécuter. On enveloppe donc, pour que `--json` rende un code stable au
    // lieu d'une pile Execa brute.
    let parameters = ['rev-list', '--exclude=alpha-*', '--tags', '--max-count=1'];
    getDebugger().info(`${command} ${parameters}`);
    const commit = this.run(parameters).replace('\n', '');

    // Dépôt sans aucun tag : `rev-list` sort vide en code 0. Ce n'est pas une
    // erreur, c'est un changelog qui part du premier commit.
    if (commit === '') {
      return undefined;
    }

    parameters = ['describe', '--tags', commit];
    getDebugger().info(`${command} ${parameters}`);
    const tag = this.run(parameters);

    return tag ? tag.toLowerCase().replace(/\n/, '') : undefined;
  }

  private run(parameters: string[]): string {
    try {
      return execaSync('git', parameters).stdout.toString();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new KomityError('git-command-failed', `git ${parameters.join(' ')} failed.`, { command: `git ${parameters.join(' ')}`, stderr: message });
    }
  }

  public async log(tag: string): Promise<IParseCommit[]> {
    const options: IOptions = {
      repo: process.cwd(),
      fields: ['hash', 'subject', 'body', 'rawBody', 'authorName', 'authorDate'],
      number: 10_000,
    };

    if (tag) {
      options.branch = `${tag}..HEAD`;
    }

    return gitlog(options);
  }
}
