import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import { koaBody } from "koa-body";
import Koa from "koa";
const init = () => {
  const router = new Router();

  // Delete the following routes as soon as the certificate is issued
  router.get(
    "/.well-known/pki-validation/7EC32DFC4930966CB488383792CF5E1F.txt",
    routesHandler.handleSectigoDomainValidation,
  );
  // Delete the above routes as soon as the certificate is issued

  router.get(
    "/.well-known/openid-credential-issuer",
    routesHandler.handleIssueMetadata,
  );
  router.get(
    "/.well-known/oauth-authorization-server",
    routesHandler.handleAuthServer,
  );
  router.get(
    "/issuer-certificate/chain.pem",
    routesHandler.handleCertificateChain,
  );
  router.post("/token", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleToken(ctx);
  });
  router.post("/credentials", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleCredential(ctx);
  });
  return router;
};

export default init;
