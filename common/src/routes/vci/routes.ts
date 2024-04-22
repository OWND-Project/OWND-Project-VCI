import Koa from "koa";
import Router from "koa-router";
import { koaBody } from "koa-body";

import { TokenIssuerConfig } from "../../oid4vci/tokenEndpoint/types.js";
import { CredentialIssuerConfig } from "../../oid4vci/credentialEndpoint/types.js";
import { StoredAccessToken } from "../../store/authStore.js";
import routesHandler from "./routesHandler.js";

export const setupCommonRoute = (
  router: Router<any, {}>,
  tokenConfigGenerator: () => TokenIssuerConfig,
  credentialConfigGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
  dirname: string,
) => {
  router.get(
    "/.well-known/openid-credential-issuer",
    async (ctx: Koa.Context) => {
      await routesHandler.handleIssueMetadata(ctx, dirname);
    },
  );
  router.get(
    "/.well-known/oauth-authorization-server",
    async (ctx: Koa.Context) => {
      await routesHandler.handleAuthServer(ctx, dirname);
    },
  );
  router.post("/token", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleToken(ctx, tokenConfigGenerator);
  });
  router.post("/credentials", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleCredential(ctx, credentialConfigGenerator);
  });
};

export default {
  setupCommonRoute,
};
