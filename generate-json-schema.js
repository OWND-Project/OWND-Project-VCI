import { exec } from 'child_process';

const typeNames = [
    // IssuerMetadata
    "IssuerMetadataJwtVcJsonLd",
    "IssuerMetadataJwtVcJson",
    "IssuerMetadataLdpVc",
    "IssuerMetadataVcSdJwt",

    // CredentialRequest
    "CredentialRequestVcSdJwt",
    "CredentialRequestJwtVcJson",
    "CredentialRequestLdpVc",
    "CredentialRequestJwtVcJsonLd",
]

const typeDefinitionSrc = "./src/oid4vci/types/protocol.types.ts"
const outputDirectory = "./src/oid4vci/types/protocolSchema"

const execPromise = (cmd) => new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            reject(`Error executing command: ${error}`);
        } else if (stderr) {
            reject(`stderr from command: ${stderr}`);
        } else {
            resolve(stdout);
        }
    });
});

const runCommands = async () => {
    try {
        await Promise.all(
            typeNames.map((typeName, index) => {
                const outputFilePath = `${outputDirectory}/${typeName}.json`;
                const cmd = `yarn typescript-json-schema --strictNullChecks true --noExtraProps true --required ${typeDefinitionSrc} ${typeName} --out ${outputFilePath}`;
                return execPromise(cmd).catch(error => {
                    console.error(`Error in command ${index + 1}:`, error);
                    process.exit(1);
                });
            })
        );
        console.log('All commands executed successfully.');
    } catch (error) {
        console.error('A command failed:', error);
        process.exit(1);
    }
};

runCommands();
