import * as jose from "jose";

import { ErrorPayload, Result } from "../../types.js";
import { isExpired, toError } from "../utils.js";
import { Proof, ProofJwtHeader, ProofOfPossession } from "./types.js";

const INVALID_OR_MISSING_PROOF = "invalid_or_missing_proof";
const isIatValid = (iat: any): boolean => {
  console.debug(`iat: ${iat}`);
  if (typeof iat !== "number") {
    return false;
  }
  const currentUnixTime = Math.floor(Date.now() / 1000);
  const timeTolerance = 5; // 5秒の許容範囲
  console.debug(`currentUnixTime: ${currentUnixTime}`);

  return iat <= currentUnixTime + timeTolerance;
};

interface Opt {
  preAuthorizedFlow: boolean;
  supportAnonymousAccess: boolean;
}
export const validateProof = async (
  proof: any,
  credentialIssuer: string,
  proofElements: {
    cNonce: string;
    createdAt: string;
    expiresIn: number;
  },
  opt: Opt = {
    preAuthorizedFlow: false,
    supportAnonymousAccess: false,
  },
): Promise<Result<ProofOfPossession, ErrorPayload>> => {
  /*
    https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-error-response

    invalid_or_missing_proof
      - Credential Request did not contain a proof, or proof was invalid, i.e. it was not bound to a Credential Issuer provided nonce

   example proof
  {
    "proof_type": "jwt",
    "jwt": "eyJraWQiOiJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEva2V5cy8
    xIiwiYWxnIjoiRVMyNTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJzNkJoZFJrcXQzIiwiYXVkIjoiaHR
    0cHM6Ly9zZXJ2ZXIuZXhhbXBsZS5jb20iLCJpYXQiOiIyMDE4LTA5LTE0VDIxOjE5OjEwWiIsIm5vbm
    NlIjoidFppZ25zbkZicCJ9.ewdkIkPV50iOeBUqMXCC_aZKPxgihac0aW9EkL1nOzM"
  }
  */
  if (!proof.proof_type || proof.proof_type !== "jwt") {
    const error = toError(
      INVALID_OR_MISSING_PROOF,
      "Missing or malformed proof_type",
    );
    return { ok: false, error };
  }
  let decodedHeader;
  try {
    decodedHeader = jose.decodeProtectedHeader(proof.jwt);
  } catch (err) {
    const error = toError(
      INVALID_OR_MISSING_PROOF,
      "Failed to decode JWT header",
    );
    return { ok: false, error };
  }

  // get public key jwk as `jwk` property defined in jwt header
  if (!decodedHeader.jwk) {
    const error = toError(
      INVALID_OR_MISSING_PROOF,
      "Missing JWK in JWT header",
    );
    return { ok: false, error };
  }
  try {
    // iss: OPTIONAL (string).
    // The value of this claim MUST be the client_id of the client making the credential request.
    // This claim MUST be omitted if the Access Token authorizing the issuance call was obtained
    // from a Pre-Authorized Code Flow through anonymous access to the Token Endpoint.
    //
    // aud: REQUIRED (string).
    // The value of this claim MUST be the Credential Issuer URL of the Credential Issuer.
    //
    // iat: REQUIRED (number).
    // The value of this claim MUST be the time at which the proof was issued using the syntax defined in [RFC7519].
    //
    // nonce: REQUIRED (string).
    // The value type of this claim MUST be a string, where the value is a c_nonce provided by the Credential Issuer.
    //
    const JWKS = jose.createLocalJWKSet({
      keys: [decodedHeader.jwk],
    });

    // A list of algorithms that can be handled by `jose.jwtVerify`.
    // https://github.com/panva/jose/issues/210#jws-alg

    // Ideally, proofs should be created and tested using the algorithms listed above,
    // and should be listed in the metadata `proof_signing_alg_values_supported`.
    const { payload } = await jose.jwtVerify(proof.jwt, JWKS, {
      audience: credentialIssuer,
    });

    // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types
    // todo check header rules

    // check JWT body rules
    const { iss, iat, nonce } = payload as jose.JWTPayload & { nonce: string };
    const { preAuthorizedFlow, supportAnonymousAccess } = opt;
    if (!iss) {
      if (!preAuthorizedFlow || !supportAnonymousAccess) {
        const error = toError(INVALID_OR_MISSING_PROOF, "Failed to verify iss");
        return { ok: false, error };
      }
    }
    if (!isIatValid(iat)) {
      const error = toError(INVALID_OR_MISSING_PROOF, "Failed to verify iat");
      return { ok: false, error };
    }
    const { cNonce, createdAt, expiresIn } = proofElements;
    if (!nonce || nonce !== cNonce) {
      const error = toError(INVALID_OR_MISSING_PROOF, "Failed to verify nonce");
      return { ok: false, error };
    }
    if (isExpired(new Date(createdAt), expiresIn)) {
      const error = toError(INVALID_OR_MISSING_PROOF, "The c_nonce expired");
      return { ok: false, error };
    }
    return {
      ok: true,
      payload: { jwt: { header: decodedHeader as ProofJwtHeader, payload } },
    };
  } catch (e) {
    console.error(e);
    const error = toError(INVALID_OR_MISSING_PROOF, "Failed to verify JWT");
    return { ok: false, error };
  }
};
