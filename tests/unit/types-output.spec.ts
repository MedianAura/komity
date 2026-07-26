import { SCHEMA_VERSION } from '../../src/helpers/schema.js';
import { buildTypesPayload, renderTypesText } from '../../src/helpers/types-output.js';
import { type CommitType } from '../../src/models/commit-types.js';

const sample: CommitType[] = [
  { value: 'fix', name: 'Correction', description: 'Correction of an issue.', aliases: [] },
  { value: 'maintenance', name: 'Maintenance', description: "Chore that doesn't modify the code.", aliases: ['chore'] },
];

describe('renderTypesText', () => {
  it('aligne les descriptions sur la valeur la plus longue', () => {
    expect(renderTypesText(sample)).toBe(['fix           Correction of an issue.', "maintenance   Chore that doesn't modify the code. (chore)"].join('\n'));
  });

  it('ne laisse aucun échappement ANSI dans la sortie', () => {
    expect(renderTypesText(sample).includes('')).toBe(false);
  });
});

describe('buildTypesPayload', () => {
  it('porte la version du contrat et les trois champs publics', () => {
    expect(buildTypesPayload(sample)).toEqual({
      schema: SCHEMA_VERSION,
      types: [
        { value: 'fix', name: 'Correction', description: 'Correction of an issue.', aliases: [] },
        { value: 'maintenance', name: 'Maintenance', description: "Chore that doesn't modify the code.", aliases: ['chore'] },
      ],
    });
  });
});
