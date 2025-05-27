import dedent from 'dedent';
import { execaSync } from 'execa';
import { gitlog, type IOptions, type IParseCommit } from 'gitlog2';
import { exec, spawn } from 'node:child_process';
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

    const commitIO = execaSync(command, parameters);

    const branch = /On branch (.)?/.exec(commitIO.message);

    if (!branch) return undefined;

    return branch[1];
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

  public getLatestTag(): string | undefined {
    const command = 'git';

    let parameters = ['fetch', '--all', '--tags'];
    getDebugger().info(`${command} ${parameters}`);
    execaSync(command, parameters);

    parameters = ['rev-list', '--exclude=alpha-*', '--tags', '--max-count=1'];
    getDebugger().info(`${command} ${parameters}`);
    const commitIO = execaSync(command, parameters);
    if (commitIO.exitCode !== 0) {
      throw new Error(commitIO.message);
    }

    const commit = commitIO.stdout.toString().replace('\n', '');

    parameters = ['describe', '--tags', commit];
    getDebugger().info(`${command} ${parameters}`);
    const tag = execaSync(command, parameters);
    if (tag.exitCode !== 0) {
      throw new Error(tag.message);
    }

    return tag.stdout.toString() ? tag.stdout.toString().toLowerCase().replace(/\n/, '') : undefined;
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
