import Koa from "koa";
import auth from "koa-basic-auth";
import { koaBody } from "koa-body";
import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import adminRoutes from "../../../../common/src/routes/admin/routes.js";
import { basicAuthOpts } from "../../../../common/src/routes/common.js";

const init = () => {
  const router = new Router();

  adminRoutes.setupRoute(router);

  router.post(
    "/admin/employees/new",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleNewEmployee(ctx);
    },
  );

  router.post(
    "/admin/employees/:employeeNo/credential-offer",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeCredentialOffer(ctx);
    },
  );

  return router;
};

export default init;
