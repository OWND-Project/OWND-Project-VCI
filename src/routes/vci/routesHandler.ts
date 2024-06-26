import Koa from "koa";

import { readLocalMetadataResource } from "../../utils/resourceUtils.js";
import path from "path";
import { TokenIssuerConfig } from "../../oid4vci/tokenEndpoint/types.js";
import { TokenIssuer } from "../../oid4vci/tokenEndpoint/TokenIssuer.js";
import { CredentialIssuerConfig } from "../../oid4vci/credentialEndpoint/types.js";
import { StoredAccessToken } from "../../store/authStore.js";
import { CredentialIssuer } from "../../oid4vci/credentialEndpoint/CredentialIssuer.js";

export async function handleIssueMetadata(ctx: Koa.Context, dirname: string) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(dirname, "metadata", environment),
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

export async function handleAuthServer(ctx: Koa.Context, dirname: string) {
  const environment = process.env.ENVIRONMENT || "dev";
  try {
    const metadataJson = await readLocalMetadataResource(
      path.join(dirname, "metadata", environment),
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

export async function handleToken(
  ctx: Koa.Context,
  configGenerator: () => TokenIssuerConfig,
) {
  const tokenRequest = new TokenIssuer(configGenerator());
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

export async function handleCredential(
  ctx: Koa.Context,
  configGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
) {
  const credentialIssuer = new CredentialIssuer(configGenerator());
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
