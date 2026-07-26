import { spawnSync } from 'node:child_process';
import { reportSuccess } from '../helpers/output.js';
import { getDebugger } from '../helpers/pino.js';

export class BranchRunner {
  public async run(branch: string, options: { json?: boolean } = {}): Promise<void> {
    // Definition de l'action
    const command = 'git';

    let parameters = ['fetch', '--all'];
    getDebugger().info(`${command} ${parameters}`);
    spawnSync(command, parameters);

    parameters = ['pull'];
    getDebugger().info(`${command} ${parameters}`);
    spawnSync(command, parameters);

    parameters = ['checkout', '-b', branch.toLowerCase()];
    getDebugger().info(`${command} ${parameters}`);
    spawnSync(command, parameters);

    reportSuccess(options.json, `Branch <${branch.toLowerCase()}> created.`, { branch: branch.toLowerCase() });
  }
}
