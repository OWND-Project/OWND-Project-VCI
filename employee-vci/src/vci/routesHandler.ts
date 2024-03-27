import { fileURLToPath } from "url";
import path, { dirname } from "path";

import Koa from "koa";

import { TokenIssuer } from "../../../common/src/oid4vci/tokenEndpoint/TokenIssuer.js";
import { readLocalMetadataResource } from "../../../common/src/utils/resourceUtils.js";
import { CredentialIssuer } from "../../../common/src/oid4vci/credentialEndpoint/CredentialIssuer.js";

import { tokenConfigure } from "./vciConfigProvider.js";
import { configure } from "./credentialsConfigProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

export async function handleIssueMetadata(ctx: Koa.Context) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(__dirname, "metadata", environment),
      "credential_issuer_metadata.json",
    );
    console.debug(metadataJson);

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
  const tokenRequest = new TokenIssuer(tokenConfigure());
  const result = await tokenRequest.issue({
    getHeader: (name: string) => ctx.get(name),
    getBody: () => ctx.request.body,
  });

  if (!result.ok) {
    const { status, payload } = result.error;
    ctx.status = status;
    ctx.body = payload;
    return;
  }

  // return access token
  ctx.body = result.payload;
  ctx.status = 200;
  ctx.set("Cache-Control", "no-store");
  ctx.set("Content-Type", "application/json");
}

export async function handleCredential(ctx: Koa.Context) {
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
  handleIssueMetadata,
  handleAuthServer,
  handleToken,
  handleCredential,
};
