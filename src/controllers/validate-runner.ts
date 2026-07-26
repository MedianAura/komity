import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EXAMPLE_HEADER, validateCommitMessage } from '../helpers/commit-message.js';
import { ReportedError } from '../helpers/errors.js';
import { Logger } from '../helpers/logger.js';
import { SCHEMA_VERSION } from '../helpers/schema.js';

export class ValidateRunner {
  public async run(commitFile: string, options: { json?: boolean } = {}): Promise<void> {
    const commitMessage = readFileSync(path.resolve(process.cwd(), commitFile), { encoding: 'utf8' });
    const result = validateCommitMessage(commitMessage);

    if (options.json) {
      console.log(
        JSON.stringify({
          schema: SCHEMA_VERSION,
          valid: result.valid,
          header: result.header,
          errors: result.errors,
          allowedTypes: result.allowedTypes,
          example: EXAMPLE_HEADER,
        }),
      );

      // La charge utile est déjà écrite : `handleError` ne doit rien ajouter.
      if (!result.valid) throw new ReportedError();
      return;
    }

    if (!result.valid) {
      throw new Error(`Commit is invalid. ${result.errors.map((error) => error.message).join(' ')}`);
    }

    Logger.success('Commit is valid.');
  }
}
