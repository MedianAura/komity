import { acceptedTypes, resolveType } from '../models/commit-types.js';

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
 *
 * La forme et le type sont désormais décidés séparément : l'expression ne
 * connaît que la grammaire `type(scope): sujet`, `resolveType` tranche seul de
 * la validité du jeton. Sans ça il faudrait injecter une alternance de tous les
 * alias dans la regex, et distinguer « type inconnu » de « forme cassée »
 * demanderait une seconde expression.
 */
const HEADER_SHAPE = /^([a-z]+)(?:\((.*)\))?:\s(.*)$/;

export interface ParsedHeader {
  scope: string;
  subject: string;
  token: string;
}

/**
 * Le scope est capturé alors que la validation ne s'en sert pas : le lint doit
 * pouvoir répondre « y en avait-il un ». Sans ça, un sujet finissant par
 * `(#54)` est indiscernable d'un sujet dont le scope porte déjà la tâche.
 */
export function parseHeader(header: string): ParsedHeader | undefined {
  const match = HEADER_SHAPE.exec(header);
  if (match === null) return undefined;

  return { token: match[1] ?? '', scope: match[2] ?? '', subject: match[3] ?? '' };
}

export function isValidCommitMessage(message: string): boolean {
  return validateCommitMessage(message).valid;
}

/**
 * `field` s'ajoute à `rule` et `message`, publiés sous `schema: 1`. L'issue
 * proposait de remplacer `rule` par `code` : ça aurait cassé le contrat qu'elle
 * cherche à rendre découvrable, donc `schema: 2` pour un gain cosmétique.
 *
 * `header-missing` et `format-invalid` n'ont pas de champ : la faute porte sur
 * la ligne entière, pas sur une de ses parties. Mieux vaut l'absence qu'un
 * `field: "header"` inventé pour la symétrie.
 */
interface ValidationError {
  field?: string;
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
  const result = { allowedTypes: acceptedTypes, header, valid: true, errors: [] as ValidationError[] };

  if (isGeneratedCommit(header)) {
    return result;
  }

  if (header === '') {
    return { ...result, valid: false, errors: [{ rule: 'header-missing', message: 'The message has no header line.' }] };
  }

  const match = parseHeader(header);

  if (match !== undefined && resolveType(match.token) !== undefined) {
    const subject = match.subject;

    if (subject.length > SUBJECT_MAX_LENGTH) {
      return {
        ...result,
        valid: false,
        errors: [
          {
            rule: 'subject-too-long',
            field: 'subject',
            message: `Subject must be ${SUBJECT_MAX_LENGTH.toString(10)} characters or fewer; it is ${subject.length.toString(10)}.`,
          },
        ],
      };
    }

    return result;
  }

  // Un `mot:` en tête distingue « type inconnu » de « forme cassée » — les deux
  // corrections ne sont pas les mêmes. La casse est tolérée ici uniquement pour
  // nommer le jeton fautif : `Feature:` reste un type inconnu.
  const declaredType = match?.token ?? /^([a-z]+)(?:\(.*\))?:/i.exec(header)?.[1];

  // Un type connu qui échoue ici l'a fait sur la forme — `fix:sans espace` — pas
  // sur le jeton. Les deux corrections ne sont pas les mêmes.
  const isUnknownType = declaredType !== undefined && resolveType(declaredType) === undefined;
  const errors: ValidationError[] = isUnknownType
    ? [{ rule: 'type-unknown', field: 'type', message: `Unknown commit type <${declaredType ?? ''}>.` }]
    : [{ rule: 'format-invalid', message: `Header must read <type(scope): subject>, for example <${EXAMPLE_HEADER}>.` }];

  return { ...result, valid: false, errors };
}

export { EXAMPLE_HEADER };
