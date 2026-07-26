/** Erreur portant un code stable, repris tel quel dans la sortie `--json`. */
export class KomityError extends Error {
  public readonly code: string;

  public readonly details: Record<string, unknown>;

  public constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'KomityError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Le runner a déjà écrit sa propre charge utile : `handleError` doit rendre la
 * main en code non nul sans rien imprimer de plus.
 */
export class ReportedError extends Error {
  public constructor() {
    super('');
    this.name = 'ReportedError';
  }
}
