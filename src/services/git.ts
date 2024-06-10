// import dedent from 'dedent';
// import { type GitlogOptions } from 'gitlog';
// import gitlog from 'gitlog';
import { exec } from 'node:child_process';
import { registry } from 'tsyringe';
import { Logger } from '../helpers/logger.js';

export const GitServiceToken = Symbol('GitService');

@registry([{ token: GitServiceToken, useClass: GitService }])
export class GitService {
  public async isClean(): Promise<boolean> {
    // const command = 'git diff --no-ext-diff --cached --name-only';
    // Logger.info(command);
    // exec(
    //   command,
    //   {
    //     maxBuffer: Number.POSITIVE_INFINITY,
    //   },
    //   (error, stdout) => {
    //     Logger.info('Bob');
    //     if (error) {
    //       // resolve(false);
    //       return false;
    //     }
    //
    //     const output = stdout || '';
    //     Logger.info('Bob');
    //     // resolve(output.trim().length === 0);
    //   },
    // );

    return true;
    // return Promise.resolve(true);
  }

  public async commit(message: string): Promise<void> {
    console.log(`Committing message: ${message}`);
  }
}
