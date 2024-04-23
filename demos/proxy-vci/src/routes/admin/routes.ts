import Router from "koa-router";

import commonAdminRoutes from "ownd-vci/dist/routes/admin/routes.js";

const init = () => {
  const router = new Router();
  commonAdminRoutes.setupCommonRoute(router);
  return router;
};

export default init;
