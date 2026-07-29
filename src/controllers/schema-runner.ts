import { buildPayloadSchema } from '../helpers/payload-schema.js';
import { SCHEMA_VERSION } from '../helpers/schema.js';

export class SchemaRunner {
  /**
   * `payload` et non `schema` pour porter le document : la clé `schema` de
   * l'enveloppe est un entier de version, et deux sens sous un même nom se
   * seraient confondus dans le premier `JSON.parse` venu.
   *
   * `console.log` et non `Logger` : consommé par un agent, et `log-update`
   * réécrit les lignes précédentes en ajoutant des ANSI.
   */
  public async run(options: { json?: boolean }): Promise<void> {
    const payload = buildPayloadSchema();

    if (options.json) {
      console.log(JSON.stringify({ schema: SCHEMA_VERSION, payload }));
      return;
    }

    console.log(JSON.stringify(payload, undefined, 2));
  }
}
