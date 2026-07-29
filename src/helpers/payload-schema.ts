import { acceptedTypes } from '../models/commit-types.js';
import { SUBJECT_MAX_LENGTH } from './commit-message.js';

/**
 * Le contrat d'entrée de `commit --input`, publié plutôt que transcrit. La
 * valeur n'est pas d'éviter la copie — AGENTS.md la couvre déjà — mais d'être
 * exact pour la version *installée* : AGENTS.md sur GitHub est ce qui traîne
 * sur master, et c'est une copie vieillie qui a produit la dérive de #16.
 *
 * `enum` et `maxLength` sont dérivés, jamais recopiés : si la liste des types
 * devient configurable (#12), la commande publiera l'ensemble effectif du
 * répertoire courant. C'est le comportement voulu, pas un changement de version
 * — `schema` porte la forme de l'enveloppe, pas son contenu.
 *
 * Pas d'`additionalProperties: false` : `parseCommitPayload` ignore les clés
 * inconnues. L'ajouter attraperait les fautes de frappe, au prix d'un schéma qui
 * annonce un refus qui n'arrive pas.
 */
export function buildPayloadSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'komity commit payload',
    description: 'Input accepted by <komity commit --input>. Unknown properties are ignored, not rejected.',
    type: 'object',
    required: ['type', 'subject'],
    properties: {
      type: {
        type: 'string',
        description: 'Canonical type or alias. Aliases are accepted on input and normalised on output.',
        enum: acceptedTypes,
      },
      subject: {
        type: 'string',
        minLength: 1,
        maxLength: SUBJECT_MAX_LENGTH,
        description: 'Measured without the <type(scope): > prefix.',
      },
      scope: {
        type: 'string',
        description: 'Task id alone — JIRA-99999, REDMINE-Bob, #999. Never a slug. Uppercased on output.',
      },
      body: {
        type: 'string',
        description: 'The why. Long is fine. This is not what the changelog publishes.',
      },
      changelog: {
        type: 'string',
        description: 'Single line published in the changelog. Implies the [log] marker and wins over <log>.',
      },
      log: {
        type: 'boolean',
        description: 'Bare marker: publishes the whole body to the changelog. Prefer <changelog>.',
      },
    },
  };
}
