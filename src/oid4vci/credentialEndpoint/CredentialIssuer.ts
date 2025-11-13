import {
  CredentialIssuerConfig,
  ErrorPayloadWithStatusCode,
  IssueResult,
  DecodedProofJwt,
} from "./types";
import {
  CredentialRequest,
  CredentialRequestJwtVcJson,
  CredentialRequestVcSdJwt,
  HttpRequest,
  Proof,
} from "../types/types.js";
import { authenticate } from "./authenticate.js";
import { validateProof } from "./validateProof.js";
import { Result } from "../../types.js";
import { toError } from "../utils.js";
// import authStore from "../../../demos/common/src/authStore.js";
import {
  credentialRequestJwtVcJsonValidator,
  credentialRequestValidator,
  credentialRequestVcSdJwtValidator,
} from "../types/validator.js";

const UNEXPECTED_ERROR = "unexpected_error";
const INVALID_REQUEST = "invalid_request";
const UNSUPPORTED_CREDENTIAL_FORMAT = "unsupported_credential_format";

export class CredentialIssuer<T> {
  // eslint-disable-next-line no-unused-vars
  constructor(private config: CredentialIssuerConfig<T>) {}
  async issue(httpRequest: HttpRequest): Promise<IssueResult> {
    /*
    https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-error-response

    invalid_request:
      - Credential Request was malformed. One or more of the parameters (i.e. format, proof) are missing or malformed.
     */
    const authResult = await authenticate(
      httpRequest.getHeader("Authorization"),
      this.config.accessTokenStateProvider,
    );
    if (!authResult.ok) {
      const { ok, error } = authResult;
      return { ok, error: { status: 401, payload: error } };
    }

    const credentialRequest = (() => {
      try {
        return credentialRequestValidator(httpRequest.getBody());
      } catch (e) {
        return undefined;
      }
    })();

    if (!credentialRequest) {
      const error = toError(INVALID_REQUEST, "Invalid data received!");
      return { ok: false, error: { status: 400, payload: error } };
    }

    // Check for credential_configuration_id or credential_identifier
    if (
      !credentialRequest.credential_configuration_id &&
      !credentialRequest.credential_identifier
    ) {
      const error = toError(
        INVALID_REQUEST,
        "Missing credential_configuration_id or credential_identifier",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }

    // credential_identifier is not yet supported
    if (credentialRequest.credential_identifier) {
      const error = toError(
        "invalid_credential_request",
        "credential_identifier is not yet supported",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }

    // Resolve credential configuration from metadata
    const credentialConfigId = credentialRequest.credential_configuration_id!;
    const credentialConfig =
      this.config.issuerMetadata.credential_configurations_supported[
        credentialConfigId
      ];

    if (!credentialConfig) {
      const error = toError(
        "unknown_credential_configuration",
        `Unknown credential_configuration_id: ${credentialConfigId}`,
      );
      return { ok: false, error: { status: 400, payload: error } };
    }

    const { authorizedCode } = authResult.payload;

    // Validate that sub is present
    if (!authorizedCode.sub) {
      const error = toError(
        INVALID_REQUEST,
        "Missing subject identifier (sub)",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }

    let proofOfPossession = undefined;

    // Support both new proofs and legacy proof parameter
    let proofToValidate: Proof | undefined = undefined;

    if (credentialRequest.proofs) {
      // proofs: New format. Object containing proofs of possession of the key material.
      // For now, we only support jwt proofs and process only the first one
      if (
        credentialRequest.proofs.jwt &&
        credentialRequest.proofs.jwt.length > 0
      ) {
        const jwtProof = credentialRequest.proofs.jwt[0];
        proofToValidate = {
          proof_type: "jwt",
          jwt: jwtProof,
        };
      }
    } else if (credentialRequest.proof) {
      // proof: Legacy format. Still supported for backward compatibility.
      proofToValidate = credentialRequest.proof;
    }

    if (proofToValidate) {
      const validateProofResult = await validateProof(
        proofToValidate,
        this.config.credentialIssuer,
        {
          preAuthorizedFlow: true, // TODO: get from checkFlow after design change
          supportAnonymousAccess: this.config.supportAnonymousAccess || false,
        },
        this.config.getCNonce,
      );
      if (!validateProofResult.ok) {
        const { ok, error } = validateProofResult;
        return { ok, error: { status: 400, payload: error } };
      }
      proofOfPossession = validateProofResult.payload;
    }
    const issueResult = await this._issue(
      credentialRequest,
      credentialConfig,
      authorizedCode.sub,
      proofOfPossession,
    );

    if (!issueResult.ok) {
      const { ok, error } = issueResult;
      return { ok, error };
    }

    return {
      ok: true,
      payload: {
        credential: issueResult.payload,
      },
    };
  }

  async _issueJwtVcJson(
    credentialRequest: CredentialRequestJwtVcJson,
    sub: string,
    proofOfPossession?: DecodedProofJwt,
  ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
    console.log(`credential request: ${JSON.stringify(credentialRequest)}`);
    if (!credentialRequest.credential_definition) {
      const error = toError(
        INVALID_REQUEST,
        "credential_definition is REQUIRED when the format parameter is present in the Credential Request",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }
    const { type } = credentialRequest.credential_definition;
    if (!type) {
      // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-ID1.html#appendix-A.1.1.4
      const error = toError(
        INVALID_REQUEST,
        "The payload needs `type` in the credential_definition",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }
    if (!this.config.issuingExecutor.jwtVcJson) {
      const error = toError(
        UNEXPECTED_ERROR,
        "No issuing function is provided",
      );
      return { ok: false, error: { status: 500, payload: error } };
    }
    const result = await this.config.issuingExecutor.jwtVcJson(
      sub,
      credentialRequest,
      proofOfPossession,
    );
    if (result.ok) {
      return result;
    } else {
      return { ok: false, error: { status: 500, payload: result.error } };
    }
  }

  async _issueVcSdJwt(
    credentialRequest: CredentialRequestVcSdJwt,
    credentialConfig: any, // TODO: Type this properly
    sub: string,
    proofOfPossession?: DecodedProofJwt,
  ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
    // Get vct from credentialConfig (resolved from metadata)
    const vct = credentialConfig.vct;
    if (!vct) {
      const error = toError(
        INVALID_REQUEST,
        "The credential configuration does not contain vct",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }
    if (!this.config.issuingExecutor.sdJwtVc) {
      const error = toError(
        UNEXPECTED_ERROR,
        "No issuing function is provided",
      );
      return { ok: false, error: { status: 500, payload: error } };
    }

    // Add vct to credentialRequest for backward compatibility with issuingExecutor
    const requestWithVct = { ...credentialRequest, vct };

    const result = await this.config.issuingExecutor.sdJwtVc(
      sub,
      requestWithVct,
      proofOfPossession,
    );
    if (result.ok) {
      return result;
    } else {
      return { ok: false, error: { status: 500, payload: result.error } };
    }
  }

  async _issue(
    credentialRequest: CredentialRequest,
    credentialConfig: any, // TODO: Type this properly based on IssuerMetadata
    sub: string,
    proofOfPossession?: DecodedProofJwt,
  ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
    /*
    https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-error-response

    invalid_request:
      - Credential Request was malformed. One or more of the parameters (i.e. format, proof) are missing or malformed.

    unsupported_credential_type:
      - requested credential type is not supported

    unsupported_credential_format:
      - requested credential format is not supported
     */

    const unsupportedFormatError: Result<string, ErrorPayloadWithStatusCode> = {
      ok: false,
      error: {
        status: 400,
        payload: toError(
          UNSUPPORTED_CREDENTIAL_FORMAT,
          "Unsupported Credential Format",
        ),
      },
    };

    // Use format from credentialConfig resolved from metadata
    switch (credentialConfig.format) {
      case "jwt_vc_json": {
        const jwtVcJsonRequest =
          credentialRequestJwtVcJsonValidator(credentialRequest);
        return this._issueJwtVcJson(jwtVcJsonRequest, sub, proofOfPossession);
      }
      case "dc+sd-jwt": {
        const vcSdJwtRequest =
          credentialRequestVcSdJwtValidator(credentialRequest);
        return this._issueVcSdJwt(
          vcSdJwtRequest,
          credentialConfig,
          sub,
          proofOfPossession,
        );
      }
      case "ldp_vc":
        return unsupportedFormatError;
      case "jwt_vc_json-ld":
        return unsupportedFormatError;
      default:
        return unsupportedFormatError;
    }
  }
}
