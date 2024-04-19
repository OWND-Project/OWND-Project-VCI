import crypto from "crypto";
import { DisclosureFrame, issueSDJWT } from "@meeco/sd-jwt";
import { importJWK, JWTHeaderParameters, JWTPayload, SignJWT } from "jose";
import { PrivateJwk } from "elliptic-jwk";

import { getKeyAlgorithm } from "../crypto/util.js";

export const AlwaysDisclosedClaimNames = [
  "iss",
  "iat",
  "cnf",
  "vct",
  "nbf",
  "exp",
  "aud",
  "jti",
];

export const getDisclosableClaims = (claims: any): string[] => {
  // @ts-ignore
  const credentialKeys = Object.keys(claims);
  return credentialKeys.filter(
    (key) => !AlwaysDisclosedClaimNames.includes(key),
  );
};

export const issueFlatCredential = async (
  claims: JWTPayload,
  issuerJwk: PrivateJwk,
  x5c: string[],
) => {
  return await issueCredentialCore(
    claims,
    { _sd: getDisclosableClaims(claims) },
    issuerJwk,
    x5c,
  );
};

export const issueCredentialCore = async (
  payload: JWTPayload,
  disclosureFrame: DisclosureFrame,
  issuerJwk: PrivateJwk,
  x5c: string[],
) => {
  const hashAlgorithm = "sha256";
  const header: JWTHeaderParameters = { alg: getKeyAlgorithm(issuerJwk) };

  if (x5c.length > 0) {
    header.x5c = x5c;
  }

  const { kty, crv, x, y, d } = issuerJwk;

  const signer = async (header: JWTHeaderParameters, payload: JWTPayload) => {
    const issuerPrivateKey = await importJWK({ kty, crv, x, y, d }, header.alg);
    return new SignJWT(payload)
      .setProtectedHeader(header)
      .sign(issuerPrivateKey);
  };

  const hasher = (data: string) => {
    const digest = crypto.createHash(hashAlgorithm).update(data).digest();
    return Buffer.from(digest).toString("base64url");
  };

  const workaround = (sdj: string): string => {
    const parts = sdj.split(".");
    if (parts.length >= 5) {
      return parts.slice(2).join(".");
    }
    return sdj;
  };

  const sdjwt = await issueSDJWT(header, payload, disclosureFrame, {
    hash: {
      alg: hashAlgorithm,
      callback: hasher,
    },
    signer,
  });

  return workaround(sdjwt);
};
