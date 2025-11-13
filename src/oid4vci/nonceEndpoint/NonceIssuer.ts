import { IssueResult, NonceIssuerConfig } from "./types.js";

export class NonceIssuer {
  // eslint-disable-next-line no-unused-vars
  constructor(private config: NonceIssuerConfig) {}

  async issue(): Promise<IssueResult> {
    const nonceResponse = await this.config.nonceIssuer();
    if (nonceResponse.ok) {
      return { ok: true, payload: nonceResponse.payload };
    } else {
      const { ok, error } = nonceResponse;
      if (error.internalError) {
        return { ok, error: { status: 500, payload: error } };
      } else {
        return { ok, error: { status: 400, payload: error } };
      }
    }
  }
}
