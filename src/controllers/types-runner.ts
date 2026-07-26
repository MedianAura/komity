import { buildTypesPayload, renderTypesText } from '../helpers/types-output.js';
import { types } from '../models/commit-types.js';

export class TypesRunner {
  // `console.log` et non `Logger` : la sortie est consommée par un agent, et
  // `log-update` réécrit les lignes précédentes en plus d'ajouter des ANSI.
  public async run(options: { json?: boolean }): Promise<void> {
    if (options.json) {
      console.log(JSON.stringify(buildTypesPayload(types)));
      return;
    }

    console.log(renderTypesText(types));
  }
}
