import { exec } from 'child_process';

const typeNames = [
    // IssuerMetadata
    "IssuerMetadataJwtVcJsonLd",
    "IssuerMetadataJwtVcJson",
    "IssuerMetadataLdpVc",
    "IssuerMetadataVcSdJwt",

    // CredentialRequest
    "CredentialRequestVcSdJwt",
    "CredentialRequestJwtVcJson"
]

const typeDefinitionSrc = "./src/oid4vci/types/protocol.types.ts"
const outputDirectory = "./src/oid4vci/types/protocolSchema"

typeNames.forEach((typeName, index) => {
    const outputFilePath = `${outputDirectory}/${typeName}.json`
    const cmd = `yarn typescript-json-schema --strictNullChecks true --noExtraProps true --required ${typeDefinitionSrc} ${typeName} --out ${outputFilePath}`
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command ${index + 1}:`, error);
            return;
        }
        if (stderr) {
            console.error(`stderr from command ${index + 1}:`, stderr);
            return;
        }
    });
});