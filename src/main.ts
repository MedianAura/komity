import { readPackageSync } from 'read-pkg';
import { program } from '@commander-js/extra-typings';
import { BranchRunner } from './controllers/branch-runner.js';
import { CommitRunner } from './controllers/commit-runner.js';
import { GenerateRunner } from './controllers/generate-runner.js';
import { SetupRunner } from './controllers/setup-runner.js';
import { ValidateRunner } from './controllers/validate-runner.js';
import { handleError } from './helpers/handle-error.js';
import { Logger } from './helpers/logger.js';

const packageJSON = readPackageSync();

program
  .name(packageJSON.name)
  .description(packageJSON.description ?? '')
  .version(packageJSON.version);

program.command('commit', { isDefault: true }).action(async () => {
  await new CommitRunner().run();
});

program
  .command('generate')
  .argument('<next>', 'Specify the next version')
  .option('--preview', 'Preview changelog')
  .action(async (next, options) => {
    await new GenerateRunner().run(next, options);
  });

program
  .command('validate')
  .argument('<commitFile>', 'commit file')
  .action(async (commitFile) => {
    await new ValidateRunner().run(commitFile);
  });

program
  .command('branch')
  .argument('<branch>', 'branch to create')
  .action(async (branch) => {
    await new BranchRunner().run(branch);
  });

// TODO : Implement staging command
// program.command('staging').action(async () => {
//   await new CommitRunner().run();
// });

program
  .command('setup')
  .argument('<title>', 'Specify the title for the changelog')
  .action(async (title) => {
    await new SetupRunner().run(title);
  });

export async function run(): Promise<number> {
  Logger.clear();
  Logger.title('Commit message generator');

  try {
    await program.parseAsync();
  } catch (error: unknown) {
    return handleError(error);
  }

  return 0;
}
