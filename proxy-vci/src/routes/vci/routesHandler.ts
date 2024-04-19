import { fileURLToPath } from "url";
import path, { dirname } from "path";
import fs from "fs/promises";

import Koa from "koa";
import { v4 as uuidv4 } from "uuid";

import oauth2 from "../../auth.js";
import store from "../../store.js";
import authStore, { getAuthCode } from "../../../../common/src/store/authStore.js";
import { CredentialIssuer } from "../../../../common/src/oid4vci/credentialEndpoint/CredentialIssuer.js";
import { configure } from "../../logic/credentialsConfigProvider.js";
import { readLocalMetadataResource } from "../../../../common/src/utils/resourceUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

export async function handleRootPath(ctx: Koa.Context) {
  const { oauth2AuthorizationUrl, state } = oauth2.buildAuthCodeFlowURL();
  const walletName = process.env.WALLET_NAME || "";
  const issEntityName = process.env.ISS_ENTITY_NAME || "";

  const sessionId = uuidv4();
  await store.addSession(sessionId, state);
  ctx.cookies.set("session_id", sessionId, { httpOnly: true });

  await ctx.render("index", {
    oauth2AuthorizationUrl,
    walletName,
    issEntityName,
  });
}
export async function handleRootPathCallback(ctx: Koa.Context) {
  const credentialOfferEndpoint = process.env.CREDENTIAL_OFFER_ENDPOINT || "";
  const { code, state } = ctx.query;

  if (!code || typeof code !== "string") {
    console.debug(`valid auth code is not sent. code: ${code}`);
    return ctx.redirect(`${credentialOfferEndpoint}?result=error`);
  }

  const sessionId = ctx.cookies.get("session_id");
  if (!sessionId) {
    console.debug(`valid session_id is not sent. session_id: ${sessionId}`);
    return ctx.redirect(`${credentialOfferEndpoint}?result=error`);
  }

  const session = await store.getSession(sessionId);
  if (!session || session.state !== state) {
    console.debug(`valid state is not sent. state: ${state}`);
    return ctx.redirect(`${credentialOfferEndpoint}?result=error`);
  }
  if (session.checkedAt) {
    console.debug(`this session is already checked at ${session.checkedAt}`);
    return ctx.redirect(`${credentialOfferEndpoint}?result=error`);
  }
  await store.updateSession(sessionId);

  try {
    const tokenResponse = await oauth2.getAccessToken(code);
    const preAuthCode = oauth2.generateRandomString();
    const expiresIn = process.env.VCI_PRE_AUTH_CODE_EXPIRES_IN || "30";
    const preAuthorizedCodeId = await authStore.addAuthCode(
      preAuthCode,
      Number(expiresIn),
      true,
      "",
      true,
    );
    await store.addXIDAccessToken(tokenResponse, preAuthorizedCodeId!);

    // todo VCI関連のコードはどこかに移動してまとめる
    const credentialIssuer = process.env.CREDENTIAL_ISSUER_IDENTIFIER || "";
    const credentialOffer = {
      credential_issuer: credentialIssuer,
      credentials: ["IdentityCredential"],
      grants: {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": preAuthCode,
          user_pin_required: false,
        },
      },
    };

    const serializedCredentialOffer = JSON.stringify(credentialOffer);
    const encodedCredentialOffer = encodeURIComponent(
      serializedCredentialOffer,
    );
    ctx.redirect(
      `${credentialOfferEndpoint}?credential_offer=${encodedCredentialOffer}`,
    );
  } catch (error) {
    console.error("Token request error:", error);
    const errorPage = new URL(
      "/path/to/?result=error",
      process.env.CREDENTIAL_ISSUER_IDENTIFIER,
    ).toString();
    ctx.redirect(errorPage);
  }
}

export async function handleIssueMetadata(ctx: Koa.Context) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(__dirname, "metadata", environment),
      "credential_issuer_metadata.json",
    );
    console.debug(metadataJson);

    // 読み込んだJSONをHTTPレスポンスで返す
    ctx.body = metadataJson;
    ctx.status = 200;
    ctx.set("Content-Type", "application/json");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}

export async function handleAuthServer(ctx: Koa.Context) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(__dirname, "metadata", environment),
      "authorization_server.json",
    );
    console.debug(metadataJson);

    // 読み込んだJSONをHTTPレスポンスで返す
    ctx.body = metadataJson;
    ctx.status = 200;
    ctx.set("Content-Type", "application/json");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: "Internal Server Error" };
  }
}
export async function handleToken(ctx: Koa.Context) {
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

    400 error pattern
    https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
    https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-token-error-response
    | grant-type          | user_pin_required | user_pin  | Pre-Authorized Code  | Client ID | error           |
    | ------------------- | ----------------- | --------- | -------------------- | --------- | --------------- |
    | pre-authorized_code | false             | sent      | (No Care)            | (No Care) | invalid_request |
    | pre-authorized_code | true              | not sent  | (No Care)            | (No Care) | invalid_request |
    | pre-authorized_code | true              | wrong PIN | (No Care)            | (No Care) | invalid_grant   |
    | pre-authorized_code | (No Care)         | (No Care) | wrong code           | (No Care) | invalid_grant   |
    | pre-authorized_code | (No Care)         | (No Care) | the code has expired | (No Care) | invalid_grant   |
    | pre-authorized_code | (No Care)         | (No Care) | sent (*1)            | not sent  | invalid_client  |

    *1: but the Authorization Server does not support anonymous access

    3. example of a Token Response:

    HTTP/1.1 200 OK
    Content-Type: application/json
    Cache-Control: no-store

      {
        "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6Ikp..sHQ",
        "token_type": "bearer",
        "expires_in": 86400,
        "c_nonce": "tZignsnFbp",
        "c_nonce_expires_in": 86400
      }

  */
  if (!ctx.request.body) {
    ctx.body = {
      error: "invalid_request",
      error_description: "Invalid data received!",
    };
    ctx.status = 400;
    return;
  }
  // todo とりあえずpre-auth前提で実装します。
  const grantType = ctx.request.body["grant_type"];
  if (grantType !== "urn:ietf:params:oauth:grant-type:pre-authorized_code") {
    ctx.body = {
      error: "unsupported_grant_type",
      error_description: "Unsupported grant_type",
    };
    ctx.status = 400;
    return;
  }
  // get `pre-authorized_code` from body
  const preAuthorizedCode = ctx.request.body["pre-authorized_code"];
  if (!preAuthorizedCode) {
    ctx.body = {
      error: "invalid_grant",
      error_description: "Missing pre-authorized_code",
    };
    ctx.status = 400;
    return;
  }

  // get access token using store.getAccessToken(preAuthorizedCode)
  const accessTokenData = await store.getXIDAccessToken(preAuthorizedCode);
  if (!accessTokenData) {
    ctx.body = {
      error: "invalid_grant",
      error_description: "Invalid pre-authorized_code",
    };
    ctx.status = 400;
    return;
  }

  // if access.expiresIn is over current time, set status code to 400 and return
  const createdAt = new Date(accessTokenData.createdAt); // データベースから取得した値をDateオブジェクトに変換

  // DateオブジェクトをUnix時間（ミリ秒）に変換し、有効期間（秒）を加算して、再びミリ秒に変換
  const expirationTime =
    Math.floor(createdAt.getTime() / 1000) + accessTokenData.expiresIn; // 有効期限（Unix時間、秒）

  const currentTime = Math.floor(Date.now() / 1000); // 現在のUnix時間（秒）

  if (expirationTime < currentTime) {
    ctx.body = {
      error: "invalid_grant",
      error_description: "Invalid pre-authorized_code",
    };
    ctx.status = 400;
    return;
  }

  // create own access token using oauth2.generateRandomString()
  const newAccessToken = oauth2.generateRandomString(); // assuming this function exists

  const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_EXPIRES_IN);
  const cNonce = oauth2.generateRandomString(); // assuming this function exists for c_nonce generation
  const cNonceExpiresIn = Number(
    process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN,
  );

  const authorizedCode = await authStore.getAuthCode(preAuthorizedCode);
  if (!authorizedCode) {
    ctx.body = {
      error: "invalid_request",
      error_description: "Invalid data received!",
    };
    ctx.status = 400;
    return;
  }

  // Assuming we save the new access token and its details
  await authStore.addAccessToken(
    newAccessToken,
    expiresIn,
    cNonce,
    cNonceExpiresIn,
    authorizedCode.id,
  );

  // return access token
  ctx.body = {
    access_token: newAccessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    c_nonce: cNonce,
    c_nonce_expires_in: cNonceExpiresIn,
  };

  ctx.status = 200;
  ctx.set("Cache-Control", "no-store");
  ctx.set("Content-Type", "application/json");
}

export async function handleCredential(ctx: Koa.Context) {
  /*
  1. example of a Credential Request for a credential in JWT VC format (JSON encoding) with a proof type jwt:

  POST /credential HTTP/1.1
  Host: server.example.com
  Content-Type: application/json
  Authorization: BEARER czZCaGRSa3F0MzpnWDFmQmF0M2JW

  {
     "format":"jwt_vc_json",
     "types":[
        "VerifiableCredential",
        "UniversityDegreeCredential"
     ],
     "proof":{
        "proof_type":"jwt",
        "jwt":"eyJraWQiOiJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEva2V5cy8
        xIiwiYWxnIjoiRVMyNTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJzNkJoZFJrcXQzIiwiYXVkIjoiaHR
        0cHM6Ly9zZXJ2ZXIuZXhhbXBsZS5jb20iLCJpYXQiOiIyMDE4LTA5LTE0VDIxOjE5OjEwWiIsIm5vbm
        NlIjoidFppZ25zbkZicCJ9.ewdkIkPV50iOeBUqMXCC_aZKPxgihac0aW9EkL1nOzM"
     }
  }

  */
  // get access token from Authorization Header
  const credentialIssuer = new CredentialIssuer(configure());
  const result = await credentialIssuer.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });
  if (!result.ok) {
    console.debug({ error: result.error });
    ctx.status = result.error.status;
    ctx.body = result.error.payload;
    return;
  }

  const { format, credential, nonce } = result.payload;
  const responseBody = { format, credential };
  ctx.body = nonce
    ? {
        ...responseBody,
        c_nonce: nonce.nonce,
        c_nonce_expires_in: nonce.expiresIn,
      }
    : responseBody;
  ctx.status = 200;
}

export default {
  handleRootPath,
  handleRootPathCallback,
  handleIssueMetadata,
  handleAuthServer,
  handleToken,
  handleCredential,
};
