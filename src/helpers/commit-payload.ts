import { types } from '../models/commit-types.js';
import { SUBJECT_MAX_LENGTH } from './commit-message.js';
import { KomityError } from './errors.js';

export interface CommitPayload {
  body?: string;
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

  return [head, payload.body ?? '', payload.log ? '[log]' : ''].join('\n\n');
}

function fail(code: string, message: string, details: Record<string, unknown> = {}): never {
  throw new KomityError(code, message, details);
}

const allowedTypes = types.map((type) => type.value);

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

  if (typeof payload.type !== 'string' || !allowedTypes.includes(payload.type)) {
    fail('type-unknown', `Unknown commit type <${String(payload.type)}>.`, { allowedTypes });
  }

  if (typeof payload.subject !== 'string' || payload.subject.trim() === '') {
    fail('subject-missing', 'A non-empty <subject> is required.');
  }

  if (payload.subject.length > SUBJECT_MAX_LENGTH) {
    fail('subject-too-long', `Subject must be ${SUBJECT_MAX_LENGTH.toString(10)} characters or fewer.`, {
      length: payload.subject.length,
    });
  }

  if (payload.scope !== undefined && typeof payload.scope !== 'string') {
    fail('invalid-payload', '<scope> must be a string.');
  }

  if (payload.body !== undefined && typeof payload.body !== 'string') {
    fail('invalid-payload', '<body> must be a string.');
  }

  if (payload.log !== undefined && typeof payload.log !== 'boolean') {
    fail('invalid-payload', '<log> must be a boolean.');
  }

  return {
    type: payload.type,
    scope: payload.scope as string | undefined,
    subject: payload.subject,
    body: payload.body as string | undefined,
    log: (payload.log as boolean | undefined) ?? false,
  };
}
