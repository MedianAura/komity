import { spawnSync } from 'node:child_process';
import { getDebugger } from '../helpers/pino.js';

export class BranchRunner {
  public async run(branch: string): Promise<void> {
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
  }
}
