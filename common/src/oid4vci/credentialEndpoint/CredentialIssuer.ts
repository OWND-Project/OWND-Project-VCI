import {
  CredentialIssuerConfig,
  ErrorPayloadWithStatusCode,
  IssueResult,
  ProofOfPossession,
} from "./types";
import { HttpRequest } from "../types";
import { authenticate } from "./authenticate.js";
import { validateProof } from "./validateProof.js";
import { Result } from "../../types";
import { toError } from "../utils.js";
import authStore from "../../store/authStore.js";

const UNEXPECTED_ERROR = "unexpected_error";
const INVALID_REQUEST = "invalid_request";
const UNSUPPORTED_CREDENTIAL_FORMAT = "unsupported_credential_format";

export class CredentialIssuer<T> {
  // eslint-disable-next-line no-unused-vars
  constructor(private config: CredentialIssuerConfig<T>) {}
  async issue(credentialRequest: HttpRequest): Promise<IssueResult> {
    /*
    https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-error-response

    invalid_request:
      - Credential Request was malformed. One or more of the parameters (i.e. format, proof) are missing or malformed.
     */
    const authResult = await authenticate(
      credentialRequest.getHeader("Authorization"),
      this.config.accessTokenStateProvider,
    );
    if (!authResult.ok) {
      const { ok, error } = authResult;
      return { ok, error: { status: 401, payload: error } };
    }

    const body = credentialRequest.getBody();
    if (!body) {
      const error = toError(INVALID_REQUEST, "Invalid data received!");
      return { ok: false, error: { status: 400, payload: error } };
    }
    if (!body.format) {
      const error = toError(INVALID_REQUEST, "Missing or malformed format");
      return { ok: false, error: { status: 400, payload: error } };
    }

    const { authorizedCode } = authResult.payload;
    let proofOfPossession = undefined;
    if (authorizedCode.proofElements) {
      if (!body.proof) {
        const error = toError(INVALID_REQUEST, "Missing or malformed format");
        return { ok: false, error: { status: 400, payload: error } };
      }
      // proof: OPTIONAL. JSON object containing proof of possession of the key material the issued Credential shall be bound to.
      const checkFlow = await authStore.getAuthCode(authorizedCode.code)
      const validateProofResult = await validateProof(
        body.proof,
        this.config.credentialIssuer,
        authorizedCode.proofElements,
        {
          preAuthorizedFlow: (checkFlow == undefined) ? true : checkFlow.preAuthFlow,
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
      body,
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
          format: body.format,
          credential: issueResult.payload,
          nonce: { nonce, expiresIn },
        },
      };
    } else {
      return {
        ok: true,
        payload: { format: body.format, credential: issueResult.payload },
      };
    }
  }

  async _issue(
    body: any,
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
    if (body.format === "jwt_vc_json") {
      // OpenID for Verifiable Credential Issuance
      //   E.1.1. VC Signed as a JWT, Not Using JSON-LD
      //   E.1.1.5. Credential Request
      //
      //     - credential_definition: REQUIRED.
      //     It consists at least of the following sub claims:
      //
      //       - type: REQUIRED.
      //       - credentialSubject: OPTIONAL.
      //
      const { type, credentialSubject } = body.credential_definition;
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
        body,
        proofOfPossession,
      );
      if (result.ok) {
        return result;
      } else {
        return { ok: false, error: { status: 500, payload: result.error } };
      }
    } else if (body.format === "vc+sd-jwt") {
      const { vct } = body.credential_definition;
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
        body,
        proofOfPossession,
      );
      if (result.ok) {
        return result;
      } else {
        return { ok: false, error: { status: 500, payload: result.error } };
      }
    } else {
      const error = toError(
        UNSUPPORTED_CREDENTIAL_FORMAT,
        "Unsupported Credential Format",
      );
      return { ok: false, error: { status: 400, payload: error } };
    }
  }
}
