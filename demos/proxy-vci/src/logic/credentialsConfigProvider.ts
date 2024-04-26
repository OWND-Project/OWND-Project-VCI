import {
  AccessTokenStateProvider,
  CredentialIssuerConfig,
  ProofOfPossession,
  IssueSdJwtVcCredential,
  PayloadSdJwtVc,
} from "ownd-vci/dist/oid4vci/credentialEndpoint/types";
import identityCredential from "./identityCredential.js";
import authStore from "ownd-vci/dist/store/authStore.js";
import { Identifiable, VCIAccessToken } from "ownd-vci/dist/oid4vci/types";
import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";

type StoredAccessToken = VCIAccessToken & Identifiable;
const accessTokenStateProvider: AccessTokenStateProvider<
  StoredAccessToken
> = async (accessToken: string) => {
  const storedAccessToken = await authStore.getAccessToken(accessToken);
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
  return {
    exists: true,
    payload: {
      authorizedCode: {
        code: storedAccessToken.authorizedCode.code,
        proofElements,
      },
      expiresIn: storedAccessToken.expiresIn,
      createdAt: new Date(storedAccessToken.createdAt),
      cNonce,
      cNonceCreatedAt,
      cNonceExpiresIn,
      storedAccessToken,
    },
  };
};
const issueSdJwtVcCredential: IssueSdJwtVcCredential = async (
  preAuthorizedCode: string,
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
  if (vct === "IdentityCredential") {
    return await identityCredential.issueIdentityCredential(
      preAuthorizedCode,
      proofOfPossession.jwt.header.jwk,
    );
  } else {
    const error = {
      error: "unsupported_credential_type",
    };
    return { ok: false, error };
  }
};

const updateNonce = async (storedAccessToken: StoredAccessToken) => {
  const nonce = generateRandomString(); // assuming this function exists for c_nonce generation
  const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN);
  await authStore.refreshNonce(storedAccessToken.id, nonce, expiresIn);
  return { nonce, expiresIn };
};

export const configure = (): CredentialIssuerConfig<StoredAccessToken> => {
  return {
    supportAnonymousAccess: true,
    credentialIssuer: process.env.CREDENTIAL_ISSUER || "",
    accessTokenStateProvider: accessTokenStateProvider,
    issuingExecutor: {
      sdJwtVc: issueSdJwtVcCredential,
    },
    updateNonce,
  };
};
