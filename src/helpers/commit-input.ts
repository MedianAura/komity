import { readFileSync } from 'node:fs';
import path from 'node:path';
import { KomityError } from './errors.js';
import { readStdin } from './read-stdin.js';

/**
 * Une charge utile est toujours un objet ou un tableau JSON : le premier
 * caractère suffit à trancher, et il tranche mieux qu'un `JSON.parse` d'essai.
 * Sur `{"type":"fix",}` l'essai échoue, l'entrée part vers le système de
 * fichiers et ressort en « fichier introuvable » — l'appelant est envoyé
 * chercher une faute de frappe dans un chemin alors que sa faute est dans son
 * JSON.
 *
 * Aucune invocation valide ne change de sens pour autant : ce qui parse
 * aujourd'hui commence par `{` ou `[`.
 */
function isJsonLiteral(input: string): boolean {
  const first = input.trimStart().charAt(0);

  return first === '{' || first === '[';
}

/**
 * Les trois formes de `--input`. La troisième existe parce que les deux
 * premières sont hors de portée d'un agent sous PowerShell : une charge utile
 * multiligne avec des guillemets se fait remanger par le shell avant node, et
 * `-` demande un pipe qu'un wrapper non interactif ne peut pas fabriquer.
 */
export async function resolveCommitInput(input: string): Promise<string> {
  if (input === '-') {
    return readStdin();
  }

  if (isJsonLiteral(input)) {
    return input;
  }

  const file = path.resolve(process.cwd(), input);

  try {
    return readFileSync(file, { encoding: 'utf8' });
  } catch {
    // Même classe de faute qu'avant : l'appelant a passé quelque chose qui
    // n'était ni du JSON ni un fichier lisible. Le code reste donc stable, mais
    // le chemin tenté est nommé — « Input is not valid JSON » enverrait
    // chercher une erreur de syntaxe dans un fichier qui n'existe pas.
    throw new KomityError('invalid-payload', `<--input ${input}> is neither JSON nor a readable file. Tried <${file}>.`, { path: file });
  }
}
