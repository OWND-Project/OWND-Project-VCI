import { StoredAccessToken } from "../../../common/src/store/authStore.js";
import { generateRandomString } from "../../../common/src/utils/randomStringUtils.js";
import {
  AccessTokenStateProvider,
  CredentialIssuerConfig,
  IssueJwtVcJsonCredential,
  PayloadJwtVc,
  ProofOfPossession,
  UpdateNonce,
} from "../../../common/src/oid4vci/credentialEndpoint/types";

import store from "../store.js";
import { ErrorPayload, Result } from "../../../common/src/types";
import participationCertificate from "./participationCertificate.js";

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

const issueJwtJsonVcCredential: IssueJwtVcJsonCredential = async (
  preAuthorizedCode: string,
  payload: PayloadJwtVc,
  proofOfPossession?: ProofOfPossession,
): Promise<Result<string, ErrorPayload>> => {
  console.log(`payload : ${JSON.stringify(payload)}`);
  const { type } = payload.credential_definition;

  console.debug({ payload });

  const error = {
    error: "unsupported_credential_type",
  };

  if (type.length !== 1) {
    return { ok: false, error };
  }

  if (type[0] != "ParticipationCertificate") {
    return { ok: false, error };
  }

  return await participationCertificate.issueParticipationCertificate(
    preAuthorizedCode,
  );
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
    issuingExecutor: { jwtVcJson: issueJwtJsonVcCredential },
    updateNonce,
  };
};
