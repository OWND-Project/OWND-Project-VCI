import { ErrorPayload, Result } from "../../types.js";
import {
  CredentialRequestJwtVcJson,
  CredentialRequestVcSdJwt,
  CredentialResponse,
  Exists,
  NotExists,
} from "../types/types.js";
import * as jose from "jose";

export interface ValidAccessTokenState<T> {
  expiresIn: number;
  createdAt: Date;
  authorizedCode: {
    code: string; // todo Issue実行時にSubjectを特定するために持っているが、storedAccessTokenに各実施に固有の持ち方ができるので多分無くせる
    proofElements?: {
      cNonce: string;
      expiresIn: number;
      createdAt: string;
    };
  };
  storedAccessToken: T;
}

export interface CredentialIssuerConfig<T> {
  credentialIssuer: string;
  supportAnonymousAccess?: boolean;
  accessTokenStateProvider: AccessTokenStateProvider<T>;
  issuingExecutor: {
    jwtVcJson?: IssueJwtVcJsonCredential;
    sdJwtVc?: IssueSdJwtVcCredential;
  };
  updateNonce: UpdateNonce<T>;
}

export interface ErrorPayloadWithStatusCode {
  status: number;
  payload: ErrorPayload;
}

export type IssueResult = Result<
  CredentialResponse,
  ErrorPayloadWithStatusCode
>;

export interface DecodedProofJwtHeader {
  typ: "openid4vci-proof+jwt";
  alg: string;
  kid?: string;
  jwk?: jose.JWK;
  x5c?: string;
}
export interface DecodedProofJwt {
  jwt: { header: DecodedProofJwtHeader; payload: jose.JWTPayload };
}

/* eslint-disable no-unused-vars */
// todo add parameter of pre_auth_flow: boolean
/**
 * AccessTokenStateProvider is a function that receives an access token string and provides its state.
 *
 * @param accessToken - The string of the access token whose state is to be checked.
 * @returns Promise<NotExists | Exists<ValidAccessTokenState<T>>> -
 *           A promise that returns NotExists if the token does not exist, or
 *           Exists containing a ValidAccessTokenState<T> if the token exists and is valid.
 *
 * This function asynchronously checks whether the provided access token exists and is valid within the database or cache.
 * If the token does not exist, it returns an object with { exists: false }.
 * If the token exists and is in a valid state, it returns an object with { exists: true, state: { ... } },
 * where state contains information about the valid state of the token.
 *
 * This function is used in the process of validating access tokens and checking access permissions.
 * It uses a generic type T, allowing it to include information of any type related to the state of the token.
 */
export type AccessTokenStateProvider<T> = (
  accessToken: string,
) => Promise<NotExists | Exists<ValidAccessTokenState<T>>>;

/**
 * IssueJwtVcJsonCredential is a function that takes a pre-authorized code, a payload, and proof information to issue a JWT formatted VC (Verifiable Credential).
 *
 * @param preAuthorizedCode - The pre-authorized code used to issue the JWT VC.
 * @param payload - The payload containing the information to be included in the VC.
 * @param proofOfPossession - The proof information required to issue the VC.
 * @returns Promise<Result<string, ErrorPayload>> -
 *           A promise that returns the JWT string of the VC upon successful issuance,
 *           or a Result containing an ErrorPayload if the issuance fails.
 *
 * This function asynchronously issues a JWT formatted VC based on the specified pre-authorized code, payload, and proof information.
 * If the issuance is successful, it returns the JWT string of the VC. If the issuance fails for any reason,
 * an ErrorPayload containing details of the error is returned.
 */
export type IssueJwtVcJsonCredential = (
  preAuthorizedCode: string,
  payload: CredentialRequestJwtVcJson,
  proofOfPossession?: DecodedProofJwt,
) => Promise<Result<string, ErrorPayload>>;

/**
 * IssueSdJwtVcCredential is a function that takes a pre-authorized code, a payload, and proof information to issue a JWT formatted VC (Verifiable Credential).
 *
 * @param preAuthorizedCode - The pre-authorized code used to issue the JWT VC.
 * @param payload - The payload containing the information to be included in the VC.
 * @param proofOfPossession - The proof information required to issue the VC.
 * @returns Promise<Result<string, ErrorPayload>> -
 *           A promise that returns the JWT string of the VC upon successful issuance,
 *           or a Result containing an ErrorPayload if the issuance fails.
 *
 * This function asynchronously issues a SD-JWT formatted VC based on the specified pre-authorized code, payload, and proof information.
 * If the issuance is successful, it returns the SD-JWT string of the VC. If the issuance fails for any reason,
 * an ErrorPayload containing details of the error is returned.
 */
export type IssueSdJwtVcCredential = (
  preAuthorizedCode: string,
  payload: CredentialRequestVcSdJwt,
  proofOfPossession?: DecodedProofJwt,
) => Promise<Result<string, ErrorPayload>>;

/**
 * UpdateNonce is a function that takes a stored access token and updates it with a new nonce value and its expiration time.
 *
 * @param storedAccessToken - The stored access token to be updated.
 * @returns Promise<{ nonce: string; expiresIn: number }> -
 *           A promise that returns an object containing the new nonce value and its expiration time.
 *
 * This function is used to update the nonce value associated with an access token.
 * A nonce is a number intended for one-time use and is utilized to enhance security.
 * The function generates a new nonce value and an expiresIn value indicating how long the nonce is valid,
 * and returns an object containing these values.
 */
export type UpdateNonce<T> = (
  storedAccessToken: T,
) => Promise<{ nonce: string; expiresIn: number }>;
/* eslint-enable no-unused-vars */
