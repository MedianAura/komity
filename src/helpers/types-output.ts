import longest from 'longest';
import { type CommitType } from '../models/commit-types.js';

/** Version du contrat consommé par les agents. À incrémenter si la forme change. */
export const TYPES_SCHEMA_VERSION = 1;

export interface TypesPayload {
  schema: number;
  types: CommitType[];
}

export function renderTypesText(types: CommitType[]): string {
  const width = (longest(types.map((type) => type.value)) as string).length + 3;

  return types.map((type) => `${type.value.padEnd(width)}${type.description}`).join('\n');
}

export function buildTypesPayload(types: CommitType[]): TypesPayload {
  return {
    schema: TYPES_SCHEMA_VERSION,
    types: types.map((type) => ({ value: type.value, name: type.name, description: type.description })),
  };
}
