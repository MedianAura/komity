## Idea

- Adding documentation
- Creating an LLM.md file so Agent know how to use the tool in the best way
- With LLM creating Commit how do we make it some for example These body don't go in a changelog
``
  Deux directions, comme prévu dans l'issue.

Rapport : `komity --json validate <fichier>` écrit
`{ schema, valid, header, errors, allowedTypes, example }`. Les règles sont
distinguées — `header-missing`, `type-unknown`, `format-invalid` — pour que
l'agent sache quoi corriger et pas seulement qu'il a échoué. `handleError` rend
`{ schema, error: { code, message, ...détails } }` sous `--json`, toujours en
code non nul ; `ReportedError` évite qu'un runner ayant déjà écrit sa charge
utile soit imprimé deux fois.

Composition : `--input <json|->` sur `commit`, `-` lisant stdin. Sans
`--commit`, le message est seulement émis, rien n'est écrit dans le dépôt.
L'assemblage sort dans `src/helpers/commit-payload.ts` et le prompt interactif
passe désormais par le même `assembleCommitMessage` : sans ça les deux rendus
divergeaient à la première retouche.

Garde-fou repris du commentaire de l'issue : `commit` refuse de solliciter
inquirer quand stdin n'est pas un TTY, `--json` ou non. `komity commit` en CI
bloquait jusqu'au timeout du job.

`branch`, `generate` et `setup` ont leur forme de succès `{ schema, ok }`, et
leurs `Logger.success` disparaissent sous `--json` — un `[SUCCESS]` sur stdout
cassait le `JSON.parse` de l'appelant.

Closes #2

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>``

This is way too large or specific for a changelog and Komity should be allowed to create changelog out of commit.
