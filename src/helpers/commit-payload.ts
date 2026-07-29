import { acceptedTypes, resolveType } from '../models/commit-types.js';
import { SUBJECT_MAX_LENGTH } from './commit-message.js';
import { KomityError } from './errors.js';

export interface CommitPayload {
  body?: string;
  /**
   * Entrée de changelog, en une ligne. Deux emplacements distincts et c'est le
   * but : `body` porte le pourquoi, long, pour l'archéologie ; `changelog` porte
   * ce qu'on dit à l'utilisateur. Sans ça un agent doit deviner quelle quantité
   * de détail est publiable, et se trompe.
   *
   * Implique `log` : `[log] texte` est émis même si `log` est absent.
   */
  changelog?: string;
  log?: boolean;
  scope?: string;
  subject: string;
  type: string;
}

/**
 * Unique chemin d'assemblage : le prompt interactif et `--input` passent tous
 * les deux ici, faute de quoi les deux rendus divergent.
 */
export function assembleCommitMessage(payload: CommitPayload): string {
  const scope = payload.scope ? `(${payload.scope.toUpperCase()})` : '';
  const head = `${payload.type}${scope}: ${payload.subject}`;

  let log = '';
  if (payload.changelog !== undefined && payload.changelog.trim() !== '') {
    log = `[log] ${payload.changelog.trim()}`;
  } else if (payload.log) {
    log = '[log]';
  }

  return [head, payload.body ?? '', log].join('\n\n');
}

function fail(code: string, message: string, details: Record<string, unknown> = {}): never {
  throw new KomityError(code, message, details);
}

const allowedTypes = acceptedTypes;

export function parseCommitPayload(raw: string): CommitPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    fail('invalid-payload', 'Input is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('invalid-payload', 'Input must be a JSON object.');
  }

  const payload = parsed as Record<string, unknown>;

  // `field` s'ajoute aux détails, il ne remplace rien : `code`, `message` et
  // `length` sont publiés sous `schema: 1`. Les renommer casserait le contrat
  // que #16 cherche justement à rendre découvrable. `got` n'est pas ajouté à
  // côté de `length` — ce serait la même valeur sous deux noms.
  const type = typeof payload.type === 'string' ? resolveType(payload.type) : undefined;
  if (type === undefined) {
    fail('type-unknown', `Unknown commit type <${String(payload.type)}>.`, { field: 'type', allowedTypes });
  }

  if (typeof payload.subject !== 'string' || payload.subject.trim() === '') {
    fail('subject-missing', 'A non-empty <subject> is required.', { field: 'subject' });
  }

  if (payload.subject.length > SUBJECT_MAX_LENGTH) {
    fail('subject-too-long', `Subject must be ${SUBJECT_MAX_LENGTH.toString(10)} characters or fewer.`, {
      field: 'subject',
      max: SUBJECT_MAX_LENGTH,
      length: payload.subject.length,
    });
  }

  if (payload.scope !== undefined && typeof payload.scope !== 'string') {
    fail('invalid-payload', '<scope> must be a string.', { field: 'scope' });
  }

  if (payload.body !== undefined && typeof payload.body !== 'string') {
    fail('invalid-payload', '<body> must be a string.', { field: 'body' });
  }

  if (payload.log !== undefined && typeof payload.log !== 'boolean') {
    fail('invalid-payload', '<log> must be a boolean.', { field: 'log' });
  }

  if (payload.changelog !== undefined && typeof payload.changelog !== 'string') {
    fail('invalid-payload', '<changelog> must be a string.', { field: 'changelog' });
  }

  // Le marqueur tient sur une ligne : un saut ferait retomber la suite dans le
  // corps, où elle serait interprétée comme du texte de commit ordinaire.
  if (typeof payload.changelog === 'string' && payload.changelog.includes('\n')) {
    fail('invalid-payload', '<changelog> must be a single line.', { field: 'changelog' });
  }

  return {
    // Forme canonique et non le jeton reçu : `--input {"type":"feat"}` écrit
    // `feature:`. L'alias est une rampe d'entrée, pas une seconde orthographe
    // dans l'historique.
    type: type.value,
    scope: payload.scope as string | undefined,
    subject: payload.subject,
    body: payload.body as string | undefined,
    changelog: payload.changelog as string | undefined,
    log: (payload.log as boolean | undefined) ?? false,
  };
}
