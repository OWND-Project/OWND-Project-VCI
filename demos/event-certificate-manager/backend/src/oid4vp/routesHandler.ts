import url from "url";
import * as querystring from "querystring";

import store from "../store.js";

import { Result } from "ownd-vci/dist/types";
import { NotSuccessResult } from "ownd-vci/dist/routes/common";
import { getEcKeyPair, getX509Chain } from "ownd-vci/dist/store/keyStore.js";

import {
  generatePresentationDefinition,
  generateRequestObjectJwt,
  GenerateRequestObjectOptions,
  generateRequestObjectPayload,
  getClientMetadata,
} from "./authRequest.js";
import { InputDescriptor, PresentationSubmission } from "./types";
import {
  verifyDescriptorMap,
  verifyVcForW3CVcDataV1,
  verifyVpForW3CVcDataV1,
} from "./verify.js";
import { getCertificatesInfo } from "./x509.js";
import { snakeToCamel, VC_FORMAT_JWT_VC_JSON } from "./index.js";
import { memorySession } from "../app.js";

import getLogger from "../logging.js";

const logger = getLogger();

export interface AuthorizationRequest {
  clientId: string;
  requestUri: string;
  authRequest: string;
}

export const submissionRequirementTicket = {
  name: "Ticket",
  rule: "pick",
  count: 1,
  from: "A",
};

export const generateAuthRequest = async (): Promise<
  Result<AuthorizationRequest, NotSuccessResult>
> => {
  logger.info("generateAuthRequest start");
  // https://openid.net/specs/openid-connect-core-1_0.html#RequestObject
  /*
  So that the request is a valid OAuth 2.0 Authorization Request,
  values for the response_type and client_id parameters MUST be included using the OAuth 2.0 request syntax,
  since they are REQUIRED by OAuth 2.0.

  The values for these parameters MUST match those in the Request Object, if present.

  // https://www.rfc-editor.org/rfc/rfc9101.html#name-authorization-request
   */
  const env = process.env.ENVIRONMENT;
  const baseUrl = process.env.OID4VP_HOST || "";
  const responseUri = process.env.OID4VP_RESPONSE_URI || "";
  const requestUri = process.env.OID4VP_REQUEST_URI || "";
  const clientId = process.env.OID4VP_RESPONSE_URI || "";
  const responseType = "vp_token";

  let authRequest = "";
  if (env === "prod") {
    const encodedClientId = encodeURIComponent(clientId);
    const encodedRequestUri = encodeURIComponent(requestUri);
    authRequest = url.resolve(
      "openid4vp://",
      `/vp/auth-request?client_id=${encodedClientId}&request_uri=${encodedRequestUri}`,
    );
  } else {
    const clientMetadata = getClientMetadata(clientId, baseUrl);

    const presentationDefinition = generatePresentationDefinition(
      [INPUT_DESCRIPTOR_TICKET],
      submissionRequirementTicket,
    );

    if (!memorySession.presentationDefinitions) {
      memorySession.presentationDefinitions = {};
    }
    memorySession.presentationDefinitions[presentationDefinition.id] =
      presentationDefinition;

    const opts: GenerateRequestObjectOptions = {
      responseType,
      clientIdScheme: "redirect_uri",
      responseUri: responseUri,
      clientMetadata,
      presentationDefinition,
    };
    const payload = generateRequestObjectPayload(clientId, opts);
    const processedPayload: Record<string, any> = {};
    for (const key in payload) {
      if (typeof payload[key] === "object") {
        processedPayload[key] = JSON.stringify(payload[key]);
      } else {
        processedPayload[key] = payload[key];
      }
    }
    const queryString = querystring.stringify(processedPayload);

    authRequest = url.resolve(
      "openid4vp://",
      `/vp/auth-request?${queryString}`,
    );
  }

  const responseData = {
    clientId,
    requestUri,
    authRequest,
  };
  logger.info("generateAuthRequest end");
  return { ok: true, payload: responseData };
};

export const generateRedirectUri = async (
  ticketNo: string,
): Promise<Result<string, NotSuccessResult>> => {
  logger.info("generateRedirectUri start");
  const baseUri = process.env.OID4VP_REDIRECT_URI_AFTER_DIRECT_POST;
  if (!baseUri) {
    return {
      ok: false,
      error: {
        type: "INTERNAL_ERROR",
        message: "Redirect base URI is not configured",
      },
    };
  }

  logger.info("get event by ticket no: %d", ticketNo);
  const eventId = await store.getEventIdByTicketNo(ticketNo);
  logger.info("got event id: %d", eventId);

  if (!eventId) {
    return {
      ok: false,
      error: {
        type: "NOT_FOUND",
      },
    };
  }

  // `url.resolve` does not work as expected if the URL contains sharp (#) symbol.
  // Also, the `URL` class does not seem to work correctly with the url module imported.
  // Therefore, simple concatenation of strings will be used to handle this.
  // (The value to be concatenated is a trusted value.)
  const result = `${baseUri}/${eventId}`;
  logger.info("redirect url: $s", result);

  logger.info("generateRedirectUri end");
  return { ok: true, payload: result };
};

export const generateRequestObject = async (): Promise<
  Result<string, NotSuccessResult>
> => {
  const baseUrl = process.env.OID4VP_HOST || "";
  const responseUri = process.env.OID4VP_RESPONSE_URI || "";
  const clientId = responseUri;
  const kid = process.env.AUTH_REQUEST_SIGN_KEY_ID || "key-1";
  const privateJwk = await getEcKeyPair(kid);
  if (!privateJwk) {
    return {
      ok: false,
      error: {
        type: "INTERNAL_ERROR",
        message: `KeyPair is not found for id: ${kid}`,
      },
    };
  }

  const presentationDefinition = generatePresentationDefinition(
    [INPUT_DESCRIPTOR_TICKET],
    submissionRequirementTicket,
  );

  // later, get presentationDefinitions by `definition_id` returned in `presentation_submission`
  // Simple implementation for practical use of demo app
  if (!memorySession.presentationDefinitions) {
    memorySession.presentationDefinitions = {};
  }
  memorySession.presentationDefinitions[presentationDefinition.id] =
    presentationDefinition;

  const x5c = await getX509Chain(kid);
  const clientMetadata = getClientMetadata(clientId, baseUrl);

  const opts = {
    responseUri,
    clientIdScheme: "x509_san_dns",
    clientMetadata,
    presentationDefinition,
    x509CertificateInfo: { x5c },
  };

  const jwt = await generateRequestObjectJwt(clientId, privateJwk, opts);

  return {
    ok: true,
    payload: jwt,
  };
};

export const verifyVPResponse = async (
  vpToken: string,
  presentationSubmission: PresentationSubmission,
  inputDescriptorChoices: InputDescriptor[],
): Promise<Result<TicketCredential, NotSuccessResult>> => {
  logger.info("verifyVPResponse start");
  logger.info("verifyDescriptorMap");
  if (!verifyDescriptorMap(presentationSubmission, inputDescriptorChoices)) {
    logger.error("verifyDescriptorMap failure");
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }

  logger.info("verifyVpForW3CVcDataV1");
  let vp = null;
  try {
    vp = await verifyVpForW3CVcDataV1(vpToken);
    logger.info("vp: ", vp);
  } catch (err) {
    logger.error("error occurred", err);
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }

  // todo descriptorMapで指定したpathに従って対象のクレデンシャルを取り出す(暫定的に決め打ちで実装しておく)
  // todo 汎用的にプロトコル準拠を実現する工数がそれなりに必要なので、別タスクにして時間がとれた際に対応する(wakaba)
  const credentials = vp.verifiableCredential;
  if (credentials.length !== 1) {
    logger.error("Required Credential must be a single data.");
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
  logger.info("verifyVcForW3CVcDataV1");
  const env = process.env.ENVIRONMENT;
  try {
    const { header, vc } = await verifyVcForW3CVcDataV1<TicketCredential>(
      credentials[0],
      env == "prod",
    );
    if (header.x5c) {
      logger.info(getCertificatesInfo(header.x5c));
    }
    // todo vcからInputDescriptorのconstraintsを満たす値が取得できる事を検証する
    // todo 汎用的にプロトコル準拠を実現する工数がそれなりに必要なので、別タスクにして時間がとれた際に対応する(wakaba)
    // todo vcのフォーマット別の実装やJSON Pathのクエリを使った実装が必要。(以下を参照)
    // https://identity.foundation/presentation-exchange/#presentation-definition
    return {
      ok: true,
      payload: vc.credentialSubject,
    };
  } catch (err) {
    logger.error(err);
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
};

// todo extends common type
export interface InvalidParameterResult2 {
  type: "INVALID_PARAMETER2";
  message?: string;
}
export type NotSuccessResult2 = NotSuccessResult | InvalidParameterResult2;
export const handleVPResponse = async (
  vpResponse: any,
): Promise<Result<TicketCredential, NotSuccessResult2>> => {
  logger.info("handleVPResponse start");
  // todo validate input

  /*
    https://openid.net/specs/openid-4-verifiable-presentations-1_0-20.html#name-response
    ```
    HTTP/1.1 302 Found
    Location: https://client.example.org/cb#
    presentation_submission=...
    &vp_token=...
    ```
   */
  const vpToken: string = vpResponse.vp_token;
  if (!vpToken || !vpResponse.presentation_submission) {
    const message = "vpToken ,presentation_submission, or both is missing";
    logger.warn(message);
    return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
  }

  logger.info("parse presentation_submission");
  const presentationSubmission: PresentationSubmission = snakeToCamel(
    JSON.parse(vpResponse.presentation_submission),
  );

  if (!memorySession.presentationDefinitions) {
    const message = "presentationDefinitions is undefined";
    logger.warn(message);
    return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
  }

  if (!presentationSubmission.definitionId) {
    const message = "presentationSubmission.definitionId is missing";
    logger.warn(message);
    logger.debug(
      `presentationSubmission: ${JSON.stringify(presentationSubmission)}`,
    );
    return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
  }

  logger.info("get presentation definition specified with id in submission ");
  const pd =
    memorySession.presentationDefinitions[presentationSubmission.definitionId];
  if (!pd) {
    const message = "matching presentation definition is not found";
    logger.warn(message);
    return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
  }

  logger.info("verify vp_token");
  const verifyResult = await verifyVPResponse(
    vpToken,
    presentationSubmission,
    pd.inputDescriptors,
  );
  logger.info("verify vp_token done");
  if (verifyResult.ok) {
    // databaseからチケットIDでデータを検索
    // 存在する場合、行を更新して検証ずみとする
    const { ticketNo } = verifyResult.payload;
    logger.info("get ticket by ticket no: " + ticketNo);
    const row = await store.getTicketByTicketNo(ticketNo);
    if (!row) {
      const message = `No such ticket: ticketNo = "${ticketNo}"`;
      // 存在しない場合は入力エラーとする
      logger.warn(message);
      return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
    }
    // const { authorizedCode } = row;
    logger.info("check where the ticket is consumed or not");
    if (row.consumedAt) {
      const message = `Ticket ${row.id} already consumed`;
      // すでに検証済みの場合は入力エラーとする
      logger.warn(message);
      return { ok: false, error: { type: "INVALID_PARAMETER2", message } };
    }
    logger.info(`Consume the ticket: ticket id = %s`, row.id);
    await store.consumeTicket(row.id);
  } else {
    logger.warn(verifyResult.error);
  }
  return verifyResult;
};

export interface TicketCredential {
  ticketNo: string;
  eventName: string;
}

export const INPUT_DESCRIPTOR_TICKET: InputDescriptor = {
  group: ["A"],
  id: "ticket_input_1",
  name: "チケットをご購入されているかを確認します",
  purpose: "イベント参加証をVCとして発行します",
  format: VC_FORMAT_JWT_VC_JSON,
  constraints: {
    fields: [
      {
        path: ["$.ticketNo"],
        filter: {
          type: "string",
          const: "",
        },
      },
      {
        path: ["$.eventName"],
        filter: {
          type: "string",
          const: "",
        },
      },
    ],
    limit_disclosure: "required",
  },
};
