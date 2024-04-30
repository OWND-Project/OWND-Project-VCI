import { ErrorPayload, Result } from "../../types.js";
import { HttpRequest } from "../types.js";
import { isExpired } from "../utils.js";
import { PayloadAtExists, AuthCodeStateProvider } from "./types.js";

/**
 * `validate` is an asynchronous function that takes an HTTP request and a function providing the state of a authorized code,
 * and performs the validation of the request.
 *
 * @param request - The HTTP request to be validated.
 * @param authCodeStateProvider - A function that provides the state of a authorized code.
 * @returns Promise<Result<PayloadAtExists<T>, ErrorPayload>> -
 *           A promise that returns PayloadAtExists<T> upon successful validation,
 *           or a Result containing an ErrorPayload if the validation fails.
 *
 * This function uses the `authCodeStateProvider` to determine if the HTTP request is valid and
 * to check if the authorized code exists. If the request is valid and the authorized code exists,
 * it returns PayloadAtExists<T> containing the associated payload. If the validation fails for any reason,
 * an ErrorPayload containing details of the error is returned.
 *
 * This function is used in the authentication and authorization process to verify that the request has the correct parameters
 * and a valid pre-authorized code.
 */
const validate = async (
  request: HttpRequest,
  authCodeStateProvider: AuthCodeStateProvider,
): Promise<Result<PayloadAtExists, ErrorPayload>> => {
  /*
    1. example of a Token Request in an Authorization Code Flow:

    POST /token HTTP/1.1
      Host: server.example.com
      Content-Type: application/x-www-form-urlencoded
      Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW

        grant_type=authorization_code
        &code=SplxlOBeZQQYbYS6WxSbIA
        &code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
        &redirect_uri=https%3A%2F%2FWallet.example.org%2Fcb


    2. example of a Token Request in a Pre-Authorized Code Flow (without Client Authentication):

    POST /token HTTP/1.1
    Host: server.example.com
    Content-Type: application/x-www-form-urlencoded

      grant_type=urn:ietf:params:oauth:grant-type:pre-authorized_code
      &pre-authorized_code=SplxlOBeZQQYbYS6WxSbIA
      &user_pin=493536
  */

  // https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
  const body = request.getBody();
  if (!body) {
    const error = {
      error: "invalid_request",
      error_description: "Invalid data received!",
    };
    return { ok: false, error };
  }
  const grantType = body["grant_type"];
  if (grantType !== "urn:ietf:params:oauth:grant-type:pre-authorized_code") {
    const error = {
      error: "unsupported_grant_type",
      error_description: "Unsupported grant_type",
    };
    return { ok: false, error };
  }
  // get `pre-authorized_code` from body
  const code = body["pre-authorized_code"];
  if (!code) {
    const error = {
      error: "invalid_grant",
      error_description: "Missing pre-authorized_code",
    };
    return { ok: false, error };
  }

  /*
  https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-token-error-response

  invalid_request:
    - the Authorization Server does not expect a PIN in the pre-authorized flow but the client provides a PIN
    - the Authorization Server expects a PIN in the pre-authorized flow but the client does not provide a PIN

    invalid_grant:
    - the Authorization Server expects a PIN in the pre-authorized flow but the client provides the wrong PIN
    - the End-User provides the wrong Pre-Authorized Code or the Pre-Authorized Code has expired
  */
  const authCodeState = await authCodeStateProvider(code);
  if (!authCodeState.exists) {
    const error = {
      error: "invalid_grant",
      error_description: "Wrong Pre-Authorized Code is provided",
    };
    return { ok: false, error };
  }
  const { authorizedCode } = authCodeState.payload;

  const createdAt = new Date(authorizedCode.createdAt + "Z");
  if (isExpired(createdAt, authorizedCode.expiresIn)) {
    const error = {
      error: "invalid_grant",
      error_description: "the Pre-Authorized Code has expired",
    };
    return { ok: false, error };
  }

  if (authorizedCode.userPin) {
    const userPin = body["user_pin"];

    if (!userPin) {
      const error = {
        error: "invalid_request",
        error_description: "the Authorization Server expects a PIN",
      };
      return { ok: false, error };
    } else if (userPin !== authorizedCode.userPin) {
      const error = {
        error: "invalid_grant",
        error_description: "Invalid user_pin",
      };
      return { ok: false, error };
    }
    if (authorizedCode.isUsed) {
      const error = {
        error: "invalid_request",
        error_description: "the PIN is already used",
      };
      return { ok: false, error };
    }
  } else {
    const userPin = body["user_pin"];
    if (userPin) {
      const error = {
        error: "invalid_request",
        error_description: "the Authorization Server does not expect a PIN",
      };
      return { ok: false, error };
    }
  }
  const { payload } = authCodeState;
  return { ok: true, payload };
};

export default validate;
