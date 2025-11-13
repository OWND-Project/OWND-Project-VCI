import { ErrorPayload, ErrorResponse, Result } from "../../types.js";
import { NonceResponse } from "../types/protocol.types.js";

export interface NonceIssuerConfig {
  nonceIssuer: NonceIssuer;
}

export type IssueResult = Result<NonceResponse, ErrorResponse>;

/* eslint-disable no-unused-vars */
/**
 * NonceIssuer is a function that issues a new c_nonce.
 *
 * @returns Promise<Result<NonceResponse, ErrorPayload>> -
 *           A promise that returns a NonceResponse upon successful nonce issuance,
 *           or a Result containing an ErrorPayload if the issuance fails.
 *
 * This function asynchronously issues a new c_nonce (client nonce).
 * If the issuance process is successful, a NonceResponse containing the nonce information is returned.
 * If the issuance fails for any reason, an ErrorPayload containing details of the error is returned.
 */
export type NonceIssuer = () => Promise<Result<NonceResponse, ErrorPayload>>;
/* eslint-enable no-unused-vars */
