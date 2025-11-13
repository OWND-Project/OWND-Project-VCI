import * as jose from "jose";
import { PrivateJwk } from "elliptic-jwk";

import store from "../store.js";
import keyStore from "ownd-vci-common/dist/store/keyStore.js";
import { issueFlatCredential } from "@ownd-project/ts-toolbox";
import { ErrorPayload, Result } from "ownd-vci/dist/types.js";

const issueEmployeeCredential = async (
  sub: string,
  jwk: jose.JWK,
): Promise<Result<string, ErrorPayload>> => {
  const employee = await store.getEmployeeById(sub);
  if (!employee) {
    return { ok: false, error: { error: "NotFound" } }; // todo define constant
  }
  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    const x5c = x509cert ? JSON.parse(x509cert) : [];
    // Extract JWK properties only - cast to PrivateJwk to access inherited properties
    const privateJwk = keyPair as unknown as PrivateJwk;
    const issuerJwk: PrivateJwk = {
      kty: privateJwk.kty,
      crv: privateJwk.crv,
      x: privateJwk.x,
      y: privateJwk.y,
      d: privateJwk.d,
    };
    // issue vc
    const iss = process.env.CREDENTIAL_ISSUER_IDENTIFIER;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 365;
    const vct = "EmployeeIdentificationCredential";
    const { companyName, employeeNo, division, givenName, familyName, gender } =
      employee;
    const claims = {
      companyName,
      employeeNo,
      division,
      givenName,
      familyName,
      gender,
      cnf: { jwk },
      vct,
      iss,
      iat,
      exp,
    };
    const credential = await issueFlatCredential(claims, issuerJwk, x5c);
    return { ok: true, payload: credential };
  } else {
    const error = { status: 500, error: "No keypair exists" };
    return { ok: false, error };
  }
};

export default {
  issueEmployeeCredential,
};
