import path from "path";
import fs from "fs/promises";

let cachedMetadata: string | undefined;

export const readLocalMetadataResource = async (
  dirname: string,
  filename: string,
) => {
  if (!cachedMetadata) {
    const metadataPath = path.join(dirname, filename);
    const fileContents = await fs.readFile(metadataPath, "utf-8");
    cachedMetadata = JSON.parse(fileContents);
  }
  return cachedMetadata
};
