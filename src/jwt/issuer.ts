import { JWTHeaderParameters, JWTPayload, SignJWT, importJWK } from "jose";
import { PrivateJwk } from "elliptic-jwk";

import { getKeyAlgorithm } from "../crypto/util.js";

export interface X509CertificateInfo {
  x5u?: string;
  x5c?: string[];
}

export const selectX509CertificateInfo = (
  info: X509CertificateInfo,
): { [key: string]: any } | undefined => {
  if (info.x5u != undefined && info.x5u != "") {
    return { x5u: info.x5u };
  }
  if (info.x5c != undefined && info.x5c.length > 0) {
    return { x5c: info.x5c };
  }
  return undefined;
};

export const issueJwtCredential = async (
  claims: JWTPayload,
  issuerJwk: PrivateJwk,
  x509CertificateInfo: X509CertificateInfo,
) => {
  const alg = getKeyAlgorithm(issuerJwk);
  const basicHeader: JWTHeaderParameters = { alg: alg, typ: "JWT" };
  const info = selectX509CertificateInfo(x509CertificateInfo);
  const header = info != undefined ? { ...basicHeader, ...info } : basicHeader;
  const { kty, crv, x, y, d } = issuerJwk;
  const key = await importJWK(
    {
      kty,
      crv,
      x,
      y,
      d,
    },
    alg,
  );

  const jwt = await new SignJWT(claims).setProtectedHeader(header).sign(key);

  return jwt;
};
