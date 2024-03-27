import Koa from "koa";
import auth from "koa-basic-auth";
import { koaBody } from "koa-body";
import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import { handleNotSuccessResult } from "../../../common/src/routerCommon.js";
import keys, {
  createCsr,
  createSelfCert,
  registerCert,
} from "../../../common/src/keys.js";

const basicAuthOpts = () => {
  const name = process.env.BASIC_AUTH_USERNAME || "";
  const pass = process.env.BASIC_AUTH_PASSWORD || "";
  return { name, pass };
};

const init = () => {
  const router = new Router();

  router.post(
    "/admin/keys/new",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      if (!ctx.request.body) {
        ctx.body = { status: "error", message: "Invalid data received!" };
        ctx.status = 400;
        return;
      }
      const kid = ctx.request.body.kid;
      const curve = ctx.request.body.curve || "P-256";
      const result = await keys.genKey(kid, curve);
      if (result.ok) {
        ctx.body = { status: "success", message: "Data created successfully!" };
        ctx.status = 201;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );
  router.post(
    "/admin/keys/:kid/revoke",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      // await routesHandler.handleRevokeKey(ctx);
      const { kid } = ctx.params;
      const result = await keys.revokeKey(kid);
      if (result.ok) {
        ctx.body = { status: "success", message: "Data revoked successfully!" };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.post(
    "/admin/keys/:kid/csr",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      // await routesHandler.handleCsr(ctx);
      const { kid } = ctx.params;
      const subject = ctx.request.body.subject;
      const result = await createCsr(kid, subject);
      if (result.ok) {
        ctx.body = { status: "success", payload: result.payload };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.post(
    "/admin/keys/:kid/signselfcert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      // await routesHandler.handleSignSelfCert(ctx);
      const { kid } = ctx.params;
      const csr = ctx.request.body.csr;
      const result = await createSelfCert(kid, csr);
      if (result.ok) {
        ctx.body = { status: "success", payload: result.payload };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.post(
    "/admin/keys/:kid/registercert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      // await routesHandler.handleRegisterCert(ctx);
      const { kid } = ctx.params;
      const certificates = ctx.request.body.certificates || [];
      const result = await registerCert(kid, certificates);
      if (result.ok) {
        ctx.body = {
          status: "success",
          message: "certificate registration succeeded",
        };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.get(
    "/admin/keys/:kid",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      // await routesHandler.handleGetKey(ctx);
      const { kid } = ctx.params;
      const result = await keys.getKey(kid);
      if (result.ok) {
        ctx.body = { status: "success", payload: result.payload };
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.post(
    "/admin/conferences/new",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleNewConference(ctx);
    },
  );

  router.post(
    "/admin/conferences/:conferenceId/credential-offer",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleConferenceCredentialOffer(ctx);
    },
  );

  return router;
};

export default init;
