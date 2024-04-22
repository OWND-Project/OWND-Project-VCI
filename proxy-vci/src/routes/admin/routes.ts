import Router from "koa-router";

import adminRoutes from "../../../../common/src/routes/admin/routes.js";

const init = () => {
  const router = new Router();
  adminRoutes.setupCommonRoute(router);
  return router;
};

export default init;
