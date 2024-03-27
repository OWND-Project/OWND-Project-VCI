import path from "path";
import fs from "fs/promises";

export const readLocalMetadataResource = async (
  dirname: string,
  filename: string,
) => {
  const metadataPath = path.join(dirname, filename);
  const fileContents = await fs.readFile(metadataPath, "utf-8");
  return JSON.parse(fileContents);
};
