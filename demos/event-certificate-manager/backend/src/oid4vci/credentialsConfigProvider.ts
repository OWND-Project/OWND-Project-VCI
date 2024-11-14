import { StoredAccessToken } from "ownd-vci/dist/store/authStore.js";
import {
  CredentialIssuerConfig,
  DecodedProofJwt,
  IssueJwtVcJsonCredential,
} from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";

import { ErrorPayload, Result } from "ownd-vci/dist/types.js";
import { updateNonce } from "ownd-vci/dist/oid4vci/credentialEndpoint/defaults/nonce.js";
import { accessTokenStateProvider } from "ownd-vci/dist/oid4vci/credentialEndpoint/defaults/accessToken.js";
import { issueTicketCertificate } from "./ticketCertificate.js";
import { issueParticipationCertificate } from "./participationCertificate.js";
import { CredentialRequestJwtVcJson } from "ownd-vci/src/oid4vci/types/types";

const issueJwtJsonVcCredential: IssueJwtVcJsonCredential = async (
  preAuthorizedCode: string,
  payload: CredentialRequestJwtVcJson,
  proofOfPossession?: DecodedProofJwt,
): Promise<Result<string, ErrorPayload>> => {
  console.log(`payload : ${JSON.stringify(payload)}`);
  const type = payload.credential_definition?.type;

  if (!type) {
    const error = {
      error: "missing_credential_definition",
    };
    return { ok: false, error };
  }

  console.debug({ payload });

  const error = {
    error: "unsupported_credential_type",
  };

  if (type.length !== 1) {
    return { ok: false, error };
  }

  if (type[0] == "ParticipationCertificate") {
    return await issueParticipationCertificate(preAuthorizedCode);
  } else if (type[0] == "EventTicketCredential") {
    return await issueTicketCertificate(preAuthorizedCode);
  } else {
    return { ok: false, error };
  }
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
