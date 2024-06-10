import { spawnSync } from 'node:child_process';

export function getLatestTag(): string | undefined {
  const command = 'git';

  let commandSwitch = ['fetch', '--all', '--tags'];
  spawnSync(command, commandSwitch);

  commandSwitch = ['rev-list', 'HEAD', '--exclude=alpha-*', '--tags', '--max-count=1'];
  const commitIO = spawnSync(command, commandSwitch);
  const commit = commitIO.stdout.toString().replace('\n', '');

  commandSwitch = ['describe', '--tags', commit];
  const tag = spawnSync(command, commandSwitch);

  if (tag.stdout.toString()) {
    return tag.stdout.toString().toLowerCase().replace(/\n/, '').replace('v', '').replace('rel-', '');
  }

  return undefined;
}
