// Imports par sous-chemin : le baril `date-fns` coûte 1,2 s au chargement contre
// 4 ms par fonction, et `lodash-es` 690 ms contre 2 ms.
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import capitalize from 'lodash-es/capitalize.js';
import { sprintf } from 'sprintf-js';
import { resolveType } from './commit-types.js';

// `[log]` seul : tout le corps sert d'entrée de changelog, la convention
// d'origine du dépôt. `[log] texte` : l'entrée est ce texte et le reste du corps
// est ignoré. Un corps écrit par un agent fait quinze lignes et porte ses
// remorques — le publier tel quel dans un changelog n'a pas de sens.
// Le séparateur exige un premier caractère non blanc dans la capture : avec
// `[ \t]*(.*)` les deux quantificateurs se disputent les espaces, ce que
// `regexp/no-super-linear-backtracking` refuse à juste titre.
const LOG_LINE = /^\[log\](?:[ \t]+(\S.*))?$/;

// Les remorques git n'ont leur place dans aucun changelog, quelle que soit la
// forme du marqueur.
const TRAILER = /^(?:co-authored-by|signed-off-by|closes|refs|fixes|resolves)\b/i;

function extractEntry(body: string): string {
  const lines = body.split('\n');

  for (const line of lines) {
    const entry = LOG_LINE.exec(line.trim())?.[1]?.trim();
    if (entry !== undefined && entry !== '') return entry;
  }

  // Marqueur nu : le corps entier fait l'entrée, la ligne de marqueur exclue.
  return lines.filter((line) => !LOG_LINE.test(line.trim())).join('\n');
}

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
    this.description = extractEntry(value);
    this.sanitizeDescription();
  }

  public setTask(subject: string): void {
    // Le scope est un lien vers le gestionnaire de tâches : `JIRA-99999`,
    // `REDMINE-Bob`, ou `#999` pour GitHub/GitLab. Rien d'autre — `(#99-doing
    // -something)` n'est pas un scope et ne doit pas être lu comme `#99`. Le
    // `\d+` nu reste accepté : il est déjà dans l'historique du dépôt.
    //
    // Ancrée sur l'en-tête : non ancrée, elle allait chercher la première
    // parenthèse venue et tirait une tâche d'un `(12)` du sujet.
    const match = /^\w+\((#\d+|[a-z]+-[a-z\d]+|\d+)\):/i.exec(subject);
    if (match !== null && match[1]) {
      this.task = match[1].toUpperCase();
    }
  }

  public setType(subject: string): void {
    const match = /^(.*?)[(:[]/m.exec(subject);
    if (match !== null) {
      const token = match[1] ?? '';
      // Canonicalisation à la lecture : un `feat:` déjà présent dans
      // l'historique doit tomber dans la même section que `feature:`, sans quoi
      // il disparaît sous « Other ».
      this.type = resolveType(token)?.value ?? token;
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
      .filter((line) => line.trim() !== '' && !TRAILER.test(line.trim()))
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
