import Router from "koa-router";

import commonVciRoutes from "ownd-vci-common/dist/routes/vci/routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { tokenConfigure } from "../../logic/vciConfigProvider.js";
import { configure } from "../../logic/credentialsConfigProvider.js";
import { nonceConfigure } from "../../logic/nonceConfigProvider.js";
import { MetadataRepository } from "../../metadata/MetadataRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

const init = () => {
  const router = new Router();

  // 環境変数からクレデンシャル発行者URLを取得
  const credentialIssuer =
    process.env.CREDENTIAL_ISSUER || "http://localhost:3000";

  // メタデータリポジトリのインスタンス化（employee-vci固有の実装）
  const metadataRepository = new MetadataRepository(credentialIssuer);

  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    nonceConfigure,
    metadataRepository,
    __dirname,
  );

  return router;
};

export default init;
