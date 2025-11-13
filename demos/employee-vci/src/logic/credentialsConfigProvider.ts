import { StoredAccessToken } from "ownd-vci-common/dist/store/authStore.js";
import {
  CredentialIssuerConfig,
  IssueSdJwtVcCredential,
  DecodedProofJwt,
} from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";
import {
  CredentialRequestVcSdJwt,
  IssuerMetadataVcSdJwt,
} from "ownd-vci/dist/oid4vci/types/protocol.types.js";

import employeeCredential from "./employeeCredential.js";
import { accessTokenStateProvider } from "ownd-vci-common/dist/oid4vci/credentialEndpoint/defaults/accessToken.js";
import authStore from "ownd-vci-common/dist/store/authStore.js";

const issueSdJwtVcCredential: IssueSdJwtVcCredential = async (
  sub: string,
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
      sub,
      proofOfPossession.jwt.header.jwk,
    );
  } else {
    const error = {
      error: "unsupported_credential_type",
    };
    return { ok: false, error };
  }
};

const issuerMetadata: IssuerMetadataVcSdJwt = {
  credential_issuer: process.env.CREDENTIAL_ISSUER || "",
  credential_endpoint: `${process.env.CREDENTIAL_ISSUER}/credentials`,
  credential_configurations_supported: {
    EmployeeIdentificationCredential: {
      format: "dc+sd-jwt",
      scope: "EmployeeIdentificationCredential",
      cryptographic_binding_methods_supported: ["jwk"],
      credential_signing_alg_values_supported: ["ES256"],
      proof_types_supported: {
        jwt: {
          proof_signing_alg_values_supported: ["ES256"],
        },
      },
      vct: "EmployeeIdentificationCredential",
      credential_metadata: {
        companyName: {},
        employeeNo: {},
        division: {},
        givenName: {},
        familyName: {},
        gender: {},
      },
    },
  },
};

export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
  return {
    credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
    issuerMetadata: issuerMetadata,
    supportAnonymousAccess: true,
    accessTokenStateProvider: accessTokenStateProvider,
    issuingExecutor: { sdJwtVc: issueSdJwtVcCredential },
    getCNonce: authStore.getCNonce,
  };
};
