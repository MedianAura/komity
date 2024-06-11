import dedent from 'dedent';
// import { type GitlogOptions } from 'gitlog';
// import gitlog from 'gitlog';
import { exec, spawn, spawnSync } from 'node:child_process';
import { registry } from 'tsyringe';
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
          maxBuffer: Number.POSITIVE_INFINITY,
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

    const parameters = ['status'];
    getDebugger().info(`${command} ${parameters}`);

    const commitIO = spawnSync(command, parameters);

    const branch = /On branch (.)?/.exec(commitIO.stdout.toString());

    if (!branch) return undefined;

    return branch[1];
  }

  public async commit(commitMessage: string): Promise<boolean | string> {
    // Definition de l'action
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
}
