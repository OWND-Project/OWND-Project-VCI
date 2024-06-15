import { assert } from "chai";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { readLocalIssuerMetadata } from "../../src/utils/resourceUtils";

describe("readLocalIssuerMetadata", () => {
  /*
    The presence of test code for `readLocalIssuerMetadata` in the library is appropriate,
    but the placement of the file to be read under `demos` requires further consideration.
   */

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename).split("/tests")[0];

  it("metadata for sd-jwt credential", async () => {
    const dirName = path.join(__dirname, "demos/employee-vci/metadata/dev");
    const fname = "credential_issuer_metadata.json";

    assert.isObject(await readLocalIssuerMetadata(dirName, fname));
  });

  it("metadata for jwt-vc credential", async () => {
    const dirName = path.join(
      __dirname,
      "demos/participation-cert-vci/metadata/dev",
    );
    const fname = "credential_issuer_metadata.json";

    assert.isObject(await readLocalIssuerMetadata(dirName, fname));
  });
});
