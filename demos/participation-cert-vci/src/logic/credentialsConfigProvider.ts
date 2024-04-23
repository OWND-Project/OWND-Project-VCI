import { StoredAccessToken } from "../../../../src/store/authStore.js";
import {
  CredentialIssuerConfig,
  IssueJwtVcJsonCredential,
  PayloadJwtVc,
  ProofOfPossession,
} from "../../../../src/oid4vci/credentialEndpoint/types.js";

import { ErrorPayload, Result } from "../../../../src/types";
import participationCertificate from "./participationCertificate.js";
import { updateNonce } from "../../../../src/oid4vci/credentialEndpoint/defaults/nonce.js";
import { accessTokenStateProvider } from "../../../../src/oid4vci/credentialEndpoint/defaults/accessToken.js";

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

export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
  return {
    credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
    supportAnonymousAccess: true,
    accessTokenStateProvider: accessTokenStateProvider,
    issuingExecutor: { jwtVcJson: issueJwtJsonVcCredential },
    updateNonce,
  };
};
