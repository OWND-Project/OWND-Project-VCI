import { HttpRequest } from "../types";
import { IssueResult, TokenIssuerConfig } from "./types";
import validate from "./validate";

export class TokenIssuer {
  // eslint-disable-next-line no-unused-vars
  constructor(private config: TokenIssuerConfig) {}

  async issue(request: HttpRequest): Promise<IssueResult> {
    const validateResult = await validate(
      request,
      this.config.authCodeStateProvider,
    );
    if (!validateResult.ok) {
      const { ok, error } = validateResult;
      return { ok, error: { status: 400, payload: error } };
    }
    const { authorizedCode } = validateResult.payload;
    const accessToken = await this.config.accessTokenIssuer(authorizedCode);
    if (accessToken.ok) {
      return { ok: true, payload: accessToken.payload };
    } else {
      const { ok, error } = accessToken;
      if (error.internalError) {
        return { ok, error: { status: 500, payload: error } };
      } else {
        return { ok, error: { status: 400, payload: error } };
      }
    }
  }
}
