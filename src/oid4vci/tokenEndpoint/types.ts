import { ErrorPayload, ErrorResponse, Result } from "../../types.js";
import { TokenResponse } from "../types/protocol.types.js";
import { Exists, NotExists, AuthorizedCode } from "../types/types.js";

export interface TokenIssuerConfig {
  authCodeStateProvider: AuthCodeStateProvider;
  accessTokenIssuer: AccessTokenIssuer;
}

export type IssueResult = Result<TokenResponse, ErrorResponse>;

export type AuthorizedCodeWithStoredData = AuthorizedCode & {
  storedData?: any;
};
export interface PayloadAtExists {
  authorizedCode: AuthorizedCodeWithStoredData;
}

/* eslint-disable no-unused-vars */
/**
 * AuthCodeStateProvider is a function that provides the issued `authorized_code` and its status.
 *
 * @param authorizedCode - The issued `code` or `pre-authorized_code`.
 * @returns Promise<NotExists | (Exists<PayloadAtExists<T>>)> -
 *           Returns a promise that resolves to NotExists if the code does not exist, or Exists if it does.
 *           In the case of Exists, the payload includes the AuthorizedCode.
 *
 * This function asynchronously provides the status of the specified authorized code.
 * If the code does not exist in the database or cache, it returns an object with { exists: false }.
 * If the code exists and is valid, it returns an object with { exists: true, payload: { ... } },
 * where the payload contains information about the authorized code.
 *
 * This type definition uses generics, allowing the authorizedEntity to be of any type T.
 * This provides a reusable validation function for different types of entities.
 */
export type AuthCodeStateProvider = (
  authorizedCode: string,
) => Promise<NotExists | Exists<PayloadAtExists>>;

/**
 * AccessTokenIssuer is a function that takes the information of a pre-authorized code and issues an access token.
 *
 * @param preAuthorizedCode - The pre-authorized code used to issue the access token.
 * @returns Promise<Result<TokenResponse, ErrorPayload>> -
 *           A promise that returns a TokenResponse upon successful token issuance,
 *           or a Result containing an ErrorPayload if the issuance fails.
 *
 * This function asynchronously issues an access token using the specified pre-authorized code.
 * If the issuance process is successful, a TokenResponse containing the token information is returned.
 * If the issuance fails for any reason, an ErrorPayload containing details of the error is returned.
 */
export type AccessTokenIssuer = (
  authorizedCode: AuthorizedCodeWithStoredData,
) => Promise<Result<TokenResponse, ErrorPayload>>;
/* eslint-enable no-unused-vars */
