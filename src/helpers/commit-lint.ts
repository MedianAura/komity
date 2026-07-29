import { extractChangelogEntry } from '../models/commit.js';
import { extractHeader, parseHeader } from './commit-message.js';

/**
 * Un avertissement ne dit pas qu'un message est invalide : il dit qu'il est
 * légal et probablement pas ce qui était voulu. Il ne touche donc jamais au
 * code de sortie — `validate` tourne en hook `commit-msg`, et refuser un commit
 * valide au prochain upgrade serait une régression pour tous les dépôts
 * installés.
 */
export interface CommitWarning {
  code: string;
  field: string;
  message: string;
}

/**
 * Forme d'avant 0.3.1. Ce qui a appris la convention en lisant l'historique
 * d'un dépôt la reproduit, et l'échec est silencieux : le commit a l'air bon et
 * n'apparaît simplement jamais dans `generate` avec une tâche attachée.
 */
const TRAILING_TASK = /\((#\d+)\)\s*$/;

/**
 * Au-delà, l'entrée n'est plus une phrase de notes de version mais le corps du
 * commit republié tel quel — remorques comprises avant qu'elles soient
 * retirées.
 */
const MAX_ENTRY_LINES = 3;

function lintTrailingTask(header: string, warnings: CommitWarning[]): void {
  const parsed = parseHeader(header);
  if (parsed === undefined || parsed.scope !== '') return;

  const task = TRAILING_TASK.exec(parsed.subject)?.[1];
  if (task === undefined) return;

  warnings.push({
    code: 'subject-trailing-task',
    field: 'subject',
    message: `Subject ends in (${task}) — did you mean scope: "${task}"? As written the changelog finds no task; the scope is the only position read.`,
  });
}

/** Tout ce qui suit la ligne d'en-tête : ce que git passe à `generate` sous le nom de `body`. */
function bodyOf(message: string, header: string): string {
  return message.slice(message.indexOf(header) + header.length);
}

/**
 * L'entrée exacte que `generate` publiera, ou `null` si le commit n'est pas
 * marqué. Dérivée par le même code que le changelog : une prévisualisation
 * réécrite à côté annoncerait un texte que `generate` ne produirait pas.
 */
export function previewChangelogEntry(message: string): string | undefined {
  const header = extractHeader(message);
  const body = bodyOf(message, header);
  if (!body.includes('[log]')) return undefined;

  const entry = extractChangelogEntry(body);
  return entry === '' ? undefined : entry;
}

function lintChangelogEntry(body: string, warnings: CommitWarning[]): void {
  if (!body.includes('[log]')) return;

  const entry = extractChangelogEntry(body);
  const lines = entry === '' ? 0 : entry.split('\n').length;
  if (lines <= MAX_ENTRY_LINES) return;

  warnings.push({
    code: 'changelog-entry-too-long',
    field: 'changelog',
    message: `The changelog entry would be ${lines.toString(10)} lines: a bare [log] publishes the whole body. Set <changelog> for a one-line entry.`,
  });
}

/**
 * Charges utiles légales, acceptées, qui font autre chose que ce qui était
 * voulu. Ce n'est donc pas de la validation — d'où une liste séparée de
 * `errors`, et deux règles seulement : chacune vient d'un commit écrit de
 * travers pour vrai, pas d'une symétrie.
 */
export function lintCommitMessage(message: string): CommitWarning[] {
  const header = extractHeader(message);
  if (header === '') return [];

  const warnings: CommitWarning[] = [];

  lintTrailingTask(header, warnings);
  lintChangelogEntry(bodyOf(message, header), warnings);

  return warnings;
}
