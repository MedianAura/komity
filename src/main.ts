import { readFileSync } from 'node:fs';
import { program } from '@commander-js/extra-typings';
import { BranchRunner } from './controllers/branch-runner.js';
import { CommitRunner } from './controllers/commit-runner.js';
import { GenerateRunner } from './controllers/generate-runner.js';
import { SetupRunner } from './controllers/setup-runner.js';
import { TypesRunner } from './controllers/types-runner.js';
import { ValidateRunner } from './controllers/validate-runner.js';
import { handleError } from './helpers/handle-error.js';

// Résolu depuis l'emplacement du module, pas depuis process.cwd() : sinon on lit
// le package.json du projet qui invoque komity. src/ et dist/ sont tous deux à un
// niveau sous la racine, donc le chemin relatif vaut en dev comme en build.
const packageJSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), { encoding: 'utf8' })) as {
  description?: string;
  name: string;
  version: string;
};

// La chaîne est capturée : `@commander-js/extra-typings` porte le typage des
// options sur la valeur de retour, `program.opts()` resterait `{}`.
const cli = program
  .name(packageJSON.name)
  .description(packageJSON.description ?? '')
  .version(packageJSON.version)
  // Global : une sous-commande le lit via `cli.opts()`. L'invocation est donc
  // `komity --json types`, l'option précédant la sous-commande.
  .option('--json', 'Machine-readable output');

program
  .command('commit', { isDefault: true })
  // `--input` porte la charge utile, `--json` ne choisit que la forme de la
  // sortie : les deux axes restent orthogonaux.
  .option('--input <payload>', 'JSON payload, or - to read it from stdin')
  .option('--commit', 'Actually create the commit; without it the message is only emitted')
  .action(async (options) => {
    await new CommitRunner().run({ ...options, json: cli.opts().json });
  });

program
  .command('generate')
  .argument('<next>', 'Specify the next version')
  .option('--preview', 'Preview changelog')
  .action(async (next, options) => {
    await new GenerateRunner().run(next, { ...options, json: cli.opts().json });
  });

program
  .command('validate')
  .argument('<commitFile>', 'commit file')
  .action(async (commitFile) => {
    await new ValidateRunner().run(commitFile, { json: cli.opts().json });
  });

program
  .command('branch')
  .argument('<branch>', 'branch to create')
  .action(async (branch) => {
    await new BranchRunner().run(branch, { json: cli.opts().json });
  });

program
  .command('types')
  .description('List the accepted commit types')
  .action(async () => {
    await new TypesRunner().run({ json: cli.opts().json });
  });

program
  .command('setup')
  .argument('<title>', 'Specify the title for the changelog')
  .action(async (title) => {
    await new SetupRunner().run(title, { json: cli.opts().json });
  });

export async function run(): Promise<number> {
  try {
    await cli.parseAsync();
  } catch (error: unknown) {
    // `opts()` est déjà peuplé : commander analyse les options du programme
    // avant de déclencher l'action qui a levé.
    return handleError(error, Boolean(cli.opts().json));
  }

  return 0;
}
