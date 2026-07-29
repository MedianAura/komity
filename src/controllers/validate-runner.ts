import { readFileSync } from 'node:fs';
import path from 'node:path';
import { lintCommitMessage } from '../helpers/commit-lint.js';
import { EXAMPLE_HEADER, validateCommitMessage } from '../helpers/commit-message.js';
import { ReportedError } from '../helpers/errors.js';
import { Logger } from '../helpers/logger.js';
import { reportWarnings } from '../helpers/output.js';
import { SCHEMA_VERSION } from '../helpers/schema.js';

export class ValidateRunner {
  public async run(commitFile: string, options: { json?: boolean } = {}): Promise<void> {
    const commitMessage = readFileSync(path.resolve(process.cwd(), commitFile), { encoding: 'utf8' });
    const result = validateCommitMessage(commitMessage);

    // Le lint vit ici autant que sur `commit --input` : un message écrit à la
    // main dans un éditeur ne passe jamais par la charge utile, et c'est ce
    // chemin-là que le hook `commit-msg` garde. Regex sur une chaîne déjà en
    // mémoire, aucune E/S — #4 a ramené cette commande de 2098 ms à 215 ms.
    const warnings = lintCommitMessage(commitMessage);

    // Avant la branche `--json`, et non après : stderr est du bruit au sens du
    // contrat, donc l'humain qui regarde passer la commande d'un agent voit
    // l'avertissement lui aussi. `commit` fait pareil.
    reportWarnings(warnings);

    if (options.json) {
      console.log(
        JSON.stringify({
          schema: SCHEMA_VERSION,
          valid: result.valid,
          header: result.header,
          errors: result.errors,
          warnings,
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
