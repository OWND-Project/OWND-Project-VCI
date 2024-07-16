import { importJWK, JWTHeaderParameters, SignJWT } from "jose";
import { PrivateJwk } from "elliptic-jwk";

import { getKeyAlgorithm } from "ownd-vci/dist/crypto/util.js";
import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";
import {
  selectX509CertificateInfo,
  X509CertificateInfo,
} from "ownd-vci/dist/credentials/jwt/issuer.js";
import {
  ClientMetadata,
  InputDescriptor,
  SubmissionRequirements,
} from "./types";
import { camelToSnake } from "./index.js";
import { v4 as uuidv4 } from "uuid";

export interface GenerateRequestObjectOptions {
  nonce?: string;
  state?: string;
  scope?: any;
  responseType?: string;
  responseMode?: string;
  redirectUri?: string;
  responseUri?: string;
  clientIdScheme?: string;
  clientMetadata?: ClientMetadata;
  presentationDefinition?: any;
  x509CertificateInfo?: X509CertificateInfo;
}

class UnsupportedClientIdSchemeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedClientIdSchemeError";
  }
}

class MissingUriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingUriError";
  }
}

export const generateRequestObjectPayload = (
  clientId: string,
  options: GenerateRequestObjectOptions = {},
): any => {
  const allowedSchemes = ["x509_san_dns", "x509_san_uri", "redirect_uri"];
  if (
    !options.clientIdScheme ||
    !allowedSchemes.includes(options.clientIdScheme)
  ) {
    throw new UnsupportedClientIdSchemeError(
      "The provided client_id_scheme is not supported in the current implementation.",
    );
  }

  if (!options.redirectUri && !options.responseUri) {
    throw new MissingUriError(
      "Either redirectUri or responseUri must be provided.",
    );
  }
  if (options.redirectUri && options.responseUri) {
    throw new MissingUriError(
      "Both redirectUri and responseUri cannot be provided simultaneously.",
    );
  }

  const payload: Record<string, any> = {
    client_id: clientId,
    nonce: options.nonce || generateRandomString(),
    state: options.state || generateRandomString(),
    response_type: options.responseType || "vp_token",
    response_mode: options.responseMode || "direct_post",
    client_id_scheme: options.clientIdScheme || "x509_san_dns",
  };

  if (options.scope) {
    payload.scope = camelToSnake(options.scope);
  }

  if (options.responseUri) {
    payload.response_uri = options.responseUri;
  } else if (options.redirectUri) {
    payload.redirect_uri = options.redirectUri;
  }

  if (options.clientMetadata) {
    payload.client_metadata = camelToSnake(options.clientMetadata);
  }

  if (options.presentationDefinition) {
    payload.presentation_definition = camelToSnake(
      options.presentationDefinition,
    );
  }
  return payload;
};

export const generateRequestObjectJwt = async (
  clientId: string,
  issuerJwk: PrivateJwk,
  options: GenerateRequestObjectOptions = {},
): Promise<string> => {
  const alg = getKeyAlgorithm(issuerJwk);
  const basicHeader: JWTHeaderParameters = { alg: alg, typ: "JWT" };
  const info = selectX509CertificateInfo(options.x509CertificateInfo || {});

  const header = info ? { ...basicHeader, ...info } : basicHeader;
  const { kty, crv, x, y, d } = issuerJwk;
  const key = await importJWK({ kty, crv, x, y, d }, alg);

  const payload = generateRequestObjectPayload(clientId, options);
  return await new SignJWT(payload).setProtectedHeader(header).sign(key);
};

export function getClientMetadata(clientId: string, baseUrl: string) {
  const clientMetadata: ClientMetadata = {
    clientId,
    clientName: "ParticipationCertificateIssuer",
    // todo: change this to the actual logo image
    logoUri:
      "https://example.com/images/issuer.png",
    policyUri: `${baseUrl}/policy`,
    tosUri: `${baseUrl}/tos`,
    vpFormats: {
      jwt_vp: {
        alg: ["ES256"],
      },
    },
  };
  return clientMetadata;
}

export function generatePresentationDefinition(
  inputDescriptors: InputDescriptor[],
  submissionRequirementTicket: SubmissionRequirements,
) {
  return {
    id: uuidv4(),
    inputDescriptors,
    submissionRequirements: [submissionRequirementTicket],
  };
}
