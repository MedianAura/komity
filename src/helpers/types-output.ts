import longest from 'longest';
import { type CommitType } from '../models/commit-types.js';
import { SCHEMA_VERSION } from './schema.js';

export interface TypesPayload {
  schema: number;
  types: CommitType[];
}

export function renderTypesText(types: CommitType[]): string {
  const width = (longest(types.map((type) => type.value)) as string).length + 3;

  return types
    .map((type) => {
      // Les alias sont accolés à la description : les cacher rendrait la sortie
      // humaine moins informative que la sortie `--json`.
      const aliases = type.aliases.length > 0 ? ` (${type.aliases.join(', ')})` : '';

      return `${type.value.padEnd(width)}${type.description}${aliases}`;
    })
    .join('\n');
}

export function buildTypesPayload(types: CommitType[]): TypesPayload {
  return {
    schema: SCHEMA_VERSION,
    // `aliases` est additif : un consommateur de `schema: 1` qui l'ignore lit la
    // charge utile exactement comme avant.
    types: types.map((type) => ({ value: type.value, name: type.name, description: type.description, aliases: type.aliases })),
  };
}
