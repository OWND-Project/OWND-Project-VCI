import Router from "koa-router";
import auth from "koa-basic-auth";
import { basicAuthOpts } from "../common.js";
import Koa from "koa";
import { koaBody } from "koa-body";
import {
  handleCsr,
  handleGetKey,
  handleNewKey,
  handleRegisterCert,
  handleRevokeKey,
  handleSignSelfCert,
} from "./routesHandler.js";

const routeDefinitions = {
  get: {
    "/admin/keys/:kid": handleGetKey,
  },
  post: {
    "/admin/keys/new": handleNewKey,
    "/admin/keys/:kid/revoke": handleRevokeKey,
    "/admin/keys/:kid/csr": handleCsr,
    "/admin/keys/:kid/signselfcert": handleSignSelfCert,
    "/admin/keys/:kid/registercert": handleRegisterCert,
  },
};
export const setupCommonRoute = (router: Router<any, {}>) => {
  const forGetMethod = routeDefinitions.get;
  const forPostMethod = routeDefinitions.post;
  for (const [path, handler] of Object.entries(forGetMethod)) {
    router.get(path, auth(basicAuthOpts()), async (ctx: Koa.Context) => {
      await handler(ctx);
    });
  }
  for (const [path, handler] of Object.entries(forPostMethod)) {
    router.post(
      path,
      auth(basicAuthOpts()),
      koaBody(),
      async (ctx: Koa.Context) => {
        await handler(ctx);
      },
    );
  }
};

export default {
  setupCommonRoute,
};
