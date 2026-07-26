import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isValidCommitMessage } from '../helpers/commit-message.js';
import { Logger } from '../helpers/logger.js';

export class ValidateRunner {
  public async run(commitFile: string): Promise<void> {
    const commitMessage = readFileSync(path.resolve(process.cwd(), commitFile), { encoding: 'utf8' });

    if (!isValidCommitMessage(commitMessage)) {
      throw new Error('Commit is invalid.');
    }

    Logger.success('Commit is valid.');
  }
}
