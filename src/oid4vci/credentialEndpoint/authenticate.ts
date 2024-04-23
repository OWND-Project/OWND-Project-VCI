import { AccessTokenStateProvider, ValidAccessTokenState } from "./types";
import { ErrorPayload, Result } from "../../types";
import { isExpired } from "../utils";

const INVALID_TOKEN = "invalid_token";
export const authenticate = async <T>(
  authHeader: string,
  accessTokenStateProvider: AccessTokenStateProvider<T>,
): Promise<Result<ValidAccessTokenState<T>, ErrorPayload>> => {
  /*
  https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-error-response

  invalid_token:
    - Credential Request contains the wrong Access Token or the Access Token is missing
   */
  if (!authHeader || !RegExp("^Bearer ", "i").test(authHeader)) {
    const error = {
      error: INVALID_TOKEN,
      error_description: "Invalid data received!",
    };
    return { ok: false, error };
  }
  const accessToken = authHeader.split(" ")[1];
  const tokenState = await accessTokenStateProvider(accessToken);
  if (!tokenState.exists) {
    const error = {
      error: INVALID_TOKEN,
      error_description: "Invalid access token",
    };
    return { ok: false, error };
  }
  const { expiresIn, createdAt } = tokenState.payload;
  if (isExpired(new Date(createdAt), expiresIn)) {
    const error = {
      error: INVALID_TOKEN,
      error_description: "The access token expired",
    };
    return { ok: false, error };
  }
  return { ok: true, payload: tokenState.payload };
};
