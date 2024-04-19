import { StoredAccessToken } from "../../../common/src/store/authStore.js";
import { generateRandomString } from "../../../common/src/utils/randomStringUtils.js";
import {
  AccessTokenStateProvider,
  CredentialIssuerConfig,
  IssueSdJwtVcCredential,
  PayloadSdJwtVc,
  ProofOfPossession,
  UpdateNonce,
} from "../../../common/src/oid4vci/credentialEndpoint/types";

import store from "../store.js";
import employeeCredential from "./employeeCredential.js";

const accessTokenStateProvider: AccessTokenStateProvider<
  StoredAccessToken
> = async (accessToken: string) => {
  const storedAccessToken = await store.getAccessToken(accessToken);
  if (!storedAccessToken) {
    return { exists: false };
  }
  const { cNonce, cNonceExpiresIn, cNonceCreatedAt } = storedAccessToken;
  const proofElements = storedAccessToken.authorizedCode.needsProof
    ? {
        cNonce: cNonce!,
        createdAt: cNonceCreatedAt!,
        expiresIn: cNonceExpiresIn!,
      }
    : undefined;
  const payload = {
    authorizedCode: {
      code: storedAccessToken.authorizedCode.code,
      proofElements,
    },
    expiresIn: storedAccessToken.expiresIn,
    createdAt: new Date(storedAccessToken.createdAt),
    storedAccessToken,
  };
  return { exists: true, payload };
};
const issueSdJwtVcCredential: IssueSdJwtVcCredential = async (
  authorizedCode: string,
  payload: PayloadSdJwtVc,
  proofOfPossession?: ProofOfPossession,
) => {
  if (
    !proofOfPossession ||
    !proofOfPossession.jwt ||
    !proofOfPossession.jwt.header ||
    !proofOfPossession.jwt.header.jwk
  ) {
    const error = {
      error: "invalid_or_missing_proof",
    };
    return { ok: false, error };
  }
  const { vct } = payload.credential_definition;
  console.debug({ payload });
  if (vct === "EmployeeIdentificationCredential") {
    return await employeeCredential.issueEmployeeCredential(
      authorizedCode,
      proofOfPossession.jwt.header.jwk,
    );
  } else {
    const error = {
      error: "unsupported_credential_type",
    };
    return { ok: false, error };
  }
};

const updateNonce: UpdateNonce<StoredAccessToken> = async (
  storedAccessToken: StoredAccessToken,
) => {
  const nonce = generateRandomString();
  const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN);
  await store.refreshNonce(storedAccessToken.id, nonce, expiresIn);
  return { nonce, expiresIn };
};

export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
  return {
    credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
    supportAnonymousAccess: true,
    accessTokenStateProvider: accessTokenStateProvider,
    issuingExecutor: { sdJwtVc: issueSdJwtVcCredential },
    updateNonce,
  };
};
