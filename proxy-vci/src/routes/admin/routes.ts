import Router from "koa-router";

import adminHandler from "../../../../common/src/routes/admin/handler.js"

const init = () => {
  const router = new Router();
  adminHandler.setupRoute(router)
  return router;
};

export default init;
