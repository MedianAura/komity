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
  const header = extractHeader(message);

  return isGeneratedCommit(header) || isValidHeader(header);
}
