import { StoredAccessToken } from "ownd-vci/dist/store/authStore.js";
import {
  CredentialIssuerConfig,
  IssueSdJwtVcCredential,
  DecodedProofJwt,
} from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";
import { CredentialRequestVcSdJwt } from "ownd-vci/dist/oid4vci/types/protocol.types.js";

import employeeCredential from "./employeeCredential.js";
import { updateNonce } from "ownd-vci/dist/oid4vci/credentialEndpoint/defaults/nonce.js";
import { accessTokenStateProvider } from "ownd-vci/dist/oid4vci/credentialEndpoint/defaults/accessToken.js";

const issueSdJwtVcCredential: IssueSdJwtVcCredential = async (
  authorizedCode: string,
  payload: CredentialRequestVcSdJwt,
  proofOfPossession?: DecodedProofJwt,
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
  const vct = payload.vct;
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

export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
  return {
    credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
    supportAnonymousAccess: true,
    accessTokenStateProvider: accessTokenStateProvider,
    issuingExecutor: { sdJwtVc: issueSdJwtVcCredential },
    updateNonce,
  };
};
