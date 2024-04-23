import Router from "koa-router";

import routesHandler from "./routesHandler.js";

import { tokenConfigure } from "../../logic/vciConfigProvider.js";
import { configure } from "../../logic/credentialsConfigProvider.js";
import commonVciRoutes from "../../../../../src/routes/vci/routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

const init = () => {
  const router = new Router();
  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    __dirname,
  );

  router.get(
    "/issuer-certificate/chain.pem",
    routesHandler.handleCertificateChain,
  );

  return router;
};

export default init;
