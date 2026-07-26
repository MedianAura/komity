import { types } from '../models/commit-types.js';

// Messages que git génère lui-même : aucun hook n'a à les refuser.
const GENERATED_PREFIXES = ['Merge branch', 'Merge remote-tracking branch', 'Revert "', 'fixup!', 'squash!'];

/**
 * Isole l'en-tête du message. Git passe au hook le `COMMIT_EDITMSG` brut, avec
 * les commentaires du gabarit : on saute les lignes vides et les lignes `#`
 * avant de prendre la première ligne réelle.
 */
export function extractHeader(message: string): string {
  for (const line of message.split('\n')) {
    const trimmed = line.trim();

    if (trimmed !== '' && !trimmed.startsWith('#')) {
      return trimmed;
    }
  }

  return '';
}

function isGeneratedCommit(header: string): boolean {
  return GENERATED_PREFIXES.some((prefix) => header.startsWith(prefix));
}

/**
 * Longueur du sujet seul, hors `type(scope): `. C'est cette ligne que les
 * visualiseurs d'historique affichent : au-delà, elle est tronquée et le
 * commit devient illisible dans la liste.
 */
export const SUBJECT_MAX_LENGTH = 100;

/**
 * Ni `m` ni `g` : `m` ferait matcher n'importe quelle ligne du corps, ce qui
 * revenait à ne jamais valider l'en-tête.
 */
function matchHeader(header: string): RegExpExecArray | null {
  const validTypes = types.map((type) => type.value).join('|');
  const regex = new RegExp(String.raw`^(${validTypes})(?:\(.*\))?:\s(.*)$`);

  return regex.exec(header);
}

export function isValidCommitMessage(message: string): boolean {
  return validateCommitMessage(message).valid;
}

interface ValidationError {
  message: string;
  rule: string;
}

export interface ValidationResult {
  allowedTypes: string[];
  errors: ValidationError[];
  header: string;
  valid: boolean;
}

const EXAMPLE_HEADER = 'fix(AB-12): correct the login redirect';

/**
 * Diagnostic plutôt que booléen : l'agent qui a écrit le message doit savoir
 * quoi corriger, pas seulement qu'il a échoué.
 */
export function validateCommitMessage(message: string): ValidationResult {
  const header = extractHeader(message);
  const allowedTypes = types.map((type) => type.value);
  const result = { allowedTypes, header, valid: true, errors: [] as ValidationError[] };

  if (isGeneratedCommit(header)) {
    return result;
  }

  if (header === '') {
    return { ...result, valid: false, errors: [{ rule: 'header-missing', message: 'The message has no header line.' }] };
  }

  const match = matchHeader(header);

  if (match !== null) {
    const subject = match[2] ?? '';

    if (subject.length > SUBJECT_MAX_LENGTH) {
      return {
        ...result,
        valid: false,
        errors: [
          {
            rule: 'subject-too-long',
            message: `Subject must be ${SUBJECT_MAX_LENGTH.toString(10)} characters or fewer; it is ${subject.length.toString(10)}.`,
          },
        ],
      };
    }

    return result;
  }

  // Un `mot:` en tête distingue « type inconnu » de « forme cassée » — les deux
  // corrections ne sont pas les mêmes.
  const declaredType = /^([a-z]+)(?:\(.*\))?:/i.exec(header)?.[1];
  const errors: ValidationError[] =
    declaredType !== undefined && !allowedTypes.includes(declaredType)
      ? [{ rule: 'type-unknown', message: `Unknown commit type <${declaredType}>.` }]
      : [{ rule: 'format-invalid', message: `Header must read <type(scope): subject>, for example <${EXAMPLE_HEADER}>.` }];

  return { ...result, valid: false, errors };
}

export { EXAMPLE_HEADER };
