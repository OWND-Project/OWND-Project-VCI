# Ptotocol Schema

The schema definitions in this directory are automatically generated using `typescript-json-schema`.
Example command to generate schema for `IssuerMetadataJwtVcWithoutJsonLd`:

```
$ yarn typescript-json-schema --strictNullChecks true --noExtraProps true --required ./src/oid4vci/types/protocol.types.ts IssuerMetadataJwtVcWithoutJsonLd > ./src/oid4vci/types/protocolSchema/IssuerMetadataJwtVcWithoutJsonLd.json
```
