# Ptotocol Schema

The schema definitions in this directory are automatically generated using `typescript-json-schema`.
Example command to generate schema for `IssuerMetadataJwtVcWithoutJsonLd`:

```
$ yarn typescript-json-schema --strictNullChecks true --noExtraProps true ./src/oid4vci/protocol.types.ts IssuerMetadataJwtVcWithoutJsonLd > ./src/oid4vci/protocolSchema/IssuerMetadataJwtVcWithoutJsonLd.json
```
