import { readFileSync } from 'node:fs';
import { program } from '@commander-js/extra-typings';

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
  // Chaque runner est importé dans son action, pas au chargement du module : sinon
  // `--version` et `validate` — que tourne un hook git à chaque commit — paient le
  // graphe de dépendances complet (inquirer, execa, gitlog2, ...).
  .action(async (options) => {
    const { CommitRunner } = await import('./controllers/commit-runner.js');
    await new CommitRunner().run({ ...options, json: cli.opts().json });
  });

program
  .command('generate')
  .argument('<next>', 'Specify the next version')
  .option('--preview', 'Preview changelog')
  .action(async (next, options) => {
    const { GenerateRunner } = await import('./controllers/generate-runner.js');
    await new GenerateRunner().run(next, { ...options, json: cli.opts().json });
  });

program
  .command('validate')
  .argument('<commitFile>', 'commit file')
  .action(async (commitFile) => {
    const { ValidateRunner } = await import('./controllers/validate-runner.js');
    await new ValidateRunner().run(commitFile, { json: cli.opts().json });
  });

program
  .command('branch')
  .argument('<branch>', 'branch to create')
  .action(async (branch) => {
    const { BranchRunner } = await import('./controllers/branch-runner.js');
    await new BranchRunner().run(branch, { json: cli.opts().json });
  });

program
  .command('types')
  .description('List the accepted commit types')
  .action(async () => {
    const { TypesRunner } = await import('./controllers/types-runner.js');
    await new TypesRunner().run({ json: cli.opts().json });
  });

program
  .command('schema')
  .description('Print the JSON Schema of the commit payload')
  .action(async () => {
    const { SchemaRunner } = await import('./controllers/schema-runner.js');
    await new SchemaRunner().run({ json: cli.opts().json });
  });

program
  .command('setup')
  .argument('<title>', 'Specify the title for the changelog')
  .action(async (title) => {
    const { SetupRunner } = await import('./controllers/setup-runner.js');
    await new SetupRunner().run(title, { json: cli.opts().json });
  });

export async function run(): Promise<number> {
  try {
    await cli.parseAsync();
  } catch (error: unknown) {
    // `opts()` est déjà peuplé : commander analyse les options du programme
    // avant de déclencher l'action qui a levé.
    const { handleError } = await import('./helpers/handle-error.js');
    return handleError(error, Boolean(cli.opts().json));
  }

  return 0;
}
