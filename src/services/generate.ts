import { format } from 'date-fns';
import dedent from 'dedent';
import { groupBy, orderBy } from 'lodash-es';
import { registry } from 'tsyringe';
import type { CommitModel } from '../models/commit.js';
import { types } from '../models/questions/type.js';

export const ChangelogGeneratorServiceToken = Symbol('ChangelogGeneratorService');

@registry([{ token: ChangelogGeneratorServiceToken, useClass: ChangelogGeneratorService }])
export class ChangelogGeneratorService {
  public generate(list: CommitModel[], version: string): string {
    const grouped = groupBy(orderBy(list, ['date', 'description'], ['asc', 'asc']), (commit) => {
      const type = commit.type.replaceAll('"', '');
      // eslint-disable-next-line unicorn/prefer-array-some
      if (types.find((t) => t.value === type)) {
        return type;
      }

      return 'other';
    });

    const changes = [this.generateHeader(version)];

    this.addChanges(changes, grouped, ['feature'], '## Feature');
    this.addChanges(changes, grouped, ['fix'], '## Correction');
    this.addChanges(changes, grouped, ['refactor', 'maintenance'], '## Refactor');
    this.addChanges(changes, grouped, ['doc'], '## Documentation');
    this.addChanges(changes, grouped, ['test'], '## Test');
    this.addChanges(changes, grouped, ['dep'], '## Dependencies');
    this.addChanges(changes, grouped, ['other'], '## Other');

    return changes.join('\r\n\r\n');
  }

  private generateHeader(version: string): string {
    return dedent`
      ## [[${version}] - ${format(new Date(), 'yyyy-MM-dd')}]
    `.trim();
  }

  private addChanges(changes: string[], grouped: Record<string, CommitModel[]>, type: string[], title: string): void {
    const changeList = [title];

    for (const t of type) {
      if (!Object.prototype.hasOwnProperty.call(grouped, t)) continue;
      changeList.push(this.getLogsLine(grouped[t]));
    }

    if (changeList.length === 1) return;
    changes.push(...changeList);
  }

  private getLogsLine(logs: CommitModel[] | undefined): string {
    if (!logs) return '';
    return logs.map((log) => log.toString()).join('\r\n\r\n');
  }
}
