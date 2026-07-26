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
 * Ni `m` ni `g` : `m` ferait matcher n'importe quelle ligne du corps, ce qui
 * revenait à ne jamais valider l'en-tête.
 */
function isValidHeader(header: string): boolean {
  const validTypes = types.map((type) => type.value).join('|');
  const regex = new RegExp(String.raw`^(${validTypes})(\(.*\))?:\s.*$`);

  return regex.test(header);
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

  if (isValidHeader(header)) {
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
