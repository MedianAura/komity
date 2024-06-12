import { format, parse } from 'date-fns';
import { capitalize } from 'lodash-es';
import { sprintf } from 'sprintf-js';

export class CommitModel {
  public hash!: string;
  public author!: string;
  public date!: Date;
  public type!: string;
  public task!: string;
  public subject!: string;
  public description!: string;

  public setDate(date: string): void {
    this.date = parse(date, 'yyyy-MM-dd HH:mm:ss XX', new Date());
  }

  public setSubject(subject: string): void {
    const match = /:\s(.)?/.exec(subject);
    if (match !== null) {
      this.subject = (match[1] ?? '').replaceAll('"', '');
      this.setBody(this.subject);
    }

    this.setTask(subject);
    this.setType(subject);
  }

  public setBody(value: string): void {
    if (value.trim() === '') return;
    this.description = value;
    this.sanitizeDescription();
  }

  public setTask(subject: string): void {
    const match = /\((\w+-\d+|\d+)?\)/.exec(subject);
    if (match !== null && match[1]) {
      this.task = match[1].toUpperCase();
    }
  }

  public setType(subject: string): void {
    const match = /^(.*?)[(:[]/m.exec(subject);
    if (match !== null) {
      this.type = match[1] ?? '';
    }
  }

  public getTask(): string {
    if (!this.task) return '';
    return sprintf('[%(task)s]', { task: this.task });
  }

  public toString(): string {
    let template = '- [%(date)s] %(task)s\r\n\t%(description)s';
    const info = {
      task: this.getTask(),
      description: this.description,
      date: format(this.date, 'yyyy-MM-dd'),
    };

    if (this.task === null) {
      template = '- [%(date)s] %(description)s';
    }

    return sprintf(template, info);
  }

  private sanitizeDescription(): void {
    this.description = this.description
      .split('\n')
      .filter((line) => line.trim() !== '' && line !== '[log]')
      .map((line) => {
        line = capitalize(line);

        if (!line.endsWith('.')) {
          line += '.';
        }

        return line;
      })
      .join('\n');
  }
}
