import 'reflect-metadata';

import { readPackageSync } from 'read-pkg';
import { program } from '@commander-js/extra-typings';
import { CommitRunner } from './controllers/commit-runner.js';
import { handleError } from './helpers/handle-error.js';
import { Logger } from './helpers/logger.js';

const packageJSON = readPackageSync();

program
  .name(packageJSON.name)
  .description(packageJSON.description ?? '')
  .version(packageJSON.version);

program.command('commit', { isDefault: true }).action(async () => {
  await new CommitRunner().run();
  console.log('YOOO');
});

program.command('generate').action(async () => {
  await new CommitRunner().run();
});

program.command('validate').action(async () => {
  await new CommitRunner().run();
});

program.command('branch').action(async () => {
  await new CommitRunner().run();
});

program.command('staging').action(async () => {
  await new CommitRunner().run();
});

export async function run(): Promise<number> {
  Logger.clear();

  try {
    await program.parseAsync();
  } catch (error: unknown) {
    Logger.skipLine();

    return handleError(error);
  }

  return 0;
}
