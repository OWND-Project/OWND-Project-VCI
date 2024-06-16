import {
  CredentialIssuerConfig,
  ErrorPayloadWithStatusCode,
  IssueResult,
  ProofOfPossession,
} from "./types";
import {
  CredentialRequest,
  CredentialRequestJwtVcJson,
  CredentialRequestVcSdJwt,
  HttpRequest,
} from "../types/types.js";
import { authenticate } from "./authenticate.js";
import { validateProof } from "./validateProof.js";
import { Result } from "../../types.js";
import { toError } from "../utils.js";
import authStore from "../../store/authStore.js";
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
        return credentialRequestValidator(httpRequest.getBody);
      } catch (e) {
        return undefined;
      }
    })();

    if (!credentialRequest) {
      const error = toError(INVALID_REQUEST, "Invalid data received!");
      return { ok: false, error: { status: 400, payload: error } };
    }

    if (!credentialRequest.format) {
      const error = toError(INVALID_REQUEST, "Missing or malformed format");
      return { ok: false, error: { status: 400, payload: error } };
    }

    const { authorizedCode } = authResult.payload;
    let proofOfPossession = undefined;
    if (authorizedCode.proofElements) {
      if (!credentialRequest.proof) {
        const error = toError(INVALID_REQUEST, "Missing or malformed format");
        return { ok: false, error: { status: 400, payload: error } };
      }
      // proof: OPTIONAL. JSON object containing proof of possession of the key material the issued Credential shall be bound to.
      const checkFlow = await authStore.getAuthCode(authorizedCode.code);
      const validateProofResult = await validateProof(
        credentialRequest.proof,
        this.config.credentialIssuer,
        authorizedCode.proofElements,
        {
          preAuthorizedFlow:
            checkFlow == undefined ? true : checkFlow.preAuthFlow,
          supportAnonymousAccess: this.config.supportAnonymousAccess || false,
        },
      );
      if (!validateProofResult.ok) {
        const { ok, error } = validateProofResult;
        return { ok, error: { status: 400, payload: error } };
      }
      proofOfPossession = validateProofResult.payload;
    }
    const issueResult = await this._issue(
      credentialRequest,
      authorizedCode.code,
      proofOfPossession,
    );

    if (!issueResult.ok) {
      const { ok, error } = issueResult;
      return { ok, error };
    }

    // update nonce
    if (authorizedCode.proofElements) {
      const { nonce, expiresIn } = await this.config.updateNonce(
        authResult.payload.storedAccessToken,
      );
      return {
        ok: true,
        payload: {
          format: credentialRequest.format,
          credential: issueResult.payload,
          nonce: { nonce, expiresIn },
        },
      };
    } else {
      return {
        ok: true,
        payload: {
          format: credentialRequest.format,
          credential: issueResult.payload,
        },
      };
    }
  }

  async _issueJwtVcJson(
    credentialRequest: CredentialRequestJwtVcJson,
    preAuthorizedCode: string,
    proofOfPossession?: ProofOfPossession,
  ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
    if (!credentialRequest.credential_definition) {
      const error = toError(
        INVALID_REQUEST,
        "credential_definition is REQUIRED when the format parameter is present in the Credential Request",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }
    const { type, credentialSubject } = credentialRequest.credential_definition;
    if (!type || !credentialSubject) {
      const error = toError(
        INVALID_REQUEST,
        "The payload needs types and credentialSubject",
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
      preAuthorizedCode,
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
    preAuthorizedCode: string,
    proofOfPossession?: ProofOfPossession,
  ): Promise<Result<string, ErrorPayloadWithStatusCode>> {
    const vct = credentialRequest.vct;
    if (!vct) {
      const error = toError(INVALID_REQUEST, "The payload needs vct");
      return { ok: false, error: { status: 400, payload: error } };
    }
    if (!this.config.issuingExecutor.sdJwtVc) {
      const error = toError(
        UNEXPECTED_ERROR,
        "No issuing function is provided",
      );
      return { ok: false, error: { status: 500, payload: error } };
    }
    const result = await this.config.issuingExecutor.sdJwtVc(
      preAuthorizedCode,
      credentialRequest,
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
    preAuthorizedCode: string,
    proofOfPossession?: ProofOfPossession,
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

    switch (credentialRequest.format) {
      case "jwt_vc_json": {
        const jwtVcJsonRequest =
          credentialRequestJwtVcJsonValidator(credentialRequest);
        return this._issueJwtVcJson(
          jwtVcJsonRequest,
          preAuthorizedCode,
          proofOfPossession,
        );
      }
      case "vc+sd-jwt": {
        const vcSdJwtRequest =
          credentialRequestVcSdJwtValidator(credentialRequest);
        return this._issueVcSdJwt(
          vcSdJwtRequest,
          preAuthorizedCode,
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
