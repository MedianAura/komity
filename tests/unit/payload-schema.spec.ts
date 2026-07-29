import { SUBJECT_MAX_LENGTH } from '../../src/helpers/commit-message.js';
import { buildPayloadSchema } from '../../src/helpers/payload-schema.js';
import { acceptedTypes } from '../../src/models/commit-types.js';

interface Properties {
  subject: { maxLength: number };
  type: { enum: string[] };
}

describe('buildPayloadSchema', () => {
  const schema = buildPayloadSchema();
  const properties = schema.properties as Properties;

  it('exige le type et le sujet, et rien d’autre', () => {
    expect(schema.required).toEqual(['type', 'subject']);
  });

  // Dérivés et non recopiés : une transcription est exactement ce que la
  // commande existe pour supprimer.
  it('publie la liste effective des types, alias compris', () => {
    expect(properties.type.enum).toEqual(acceptedTypes);
    expect(properties.type.enum).toContain('feat');
  });

  it('publie la limite de sujet effective', () => {
    expect(properties.subject.maxLength).toBe(SUBJECT_MAX_LENGTH);
  });

  // Le parseur ignore les clés inconnues : les refuser dans le schéma
  // annoncerait un comportement que komity n'a pas.
  it('ne prétend pas refuser les clés inconnues', () => {
    expect(schema.additionalProperties).toBeUndefined();
  });

  it('décrit tous les champs de la charge utile', () => {
    expect(Object.keys(schema.properties as object)).toEqual(expect.arrayContaining(['body', 'changelog', 'log', 'scope', 'subject', 'type']));
    expect(Object.keys(schema.properties as object)).toHaveLength(6);
  });
});
