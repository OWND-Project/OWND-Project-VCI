import Koa from "koa";
import Router from "koa-router";
import { koaBody } from "koa-body";

import { TokenIssuerConfig } from "ownd-vci/dist/oid4vci/tokenEndpoint/types.js";
import { CredentialIssuerConfig } from "ownd-vci/dist/oid4vci/credentialEndpoint/types.js";
import { NonceIssuerConfig } from "ownd-vci/dist/oid4vci/nonceEndpoint/types.js";
import { StoredAccessToken } from "../../store/authStore.js";
import { IMetadataRepository } from "ownd-vci/dist/metadata/IMetadataRepository.js";
import routesHandler from "./routesHandler.js";

export const setupCommonRoute = (
  router: Router<any, {}>,
  tokenConfigGenerator: () => TokenIssuerConfig,
  credentialConfigGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
  nonceConfigGenerator: () => NonceIssuerConfig,
  metadataRepository: IMetadataRepository,
  dirname: string,
  availableLocales: string[] = ["en-US", "ja-JP"],
  defaultLocale: string = "ja-JP",
) => {
  router.get(
    "/.well-known/openid-credential-issuer",
    async (ctx: Koa.Context) => {
      await routesHandler.handleIssueMetadata(
        ctx,
        metadataRepository,
        availableLocales,
        defaultLocale,
      );
    },
  );
  router.get(
    "/.well-known/oauth-authorization-server",
    async (ctx: Koa.Context) => {
      await routesHandler.handleAuthServer(ctx, metadataRepository);
    },
  );
  router.post("/token", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleToken(ctx, tokenConfigGenerator);
  });
  router.post("/credentials", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleCredential(ctx, credentialConfigGenerator);
  });
  router.post("/nonce", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleNonce(ctx, nonceConfigGenerator);
  });
};

export default {
  setupCommonRoute,
};
