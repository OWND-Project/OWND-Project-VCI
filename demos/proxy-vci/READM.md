# MyNumber Card Info VCI API
## MyNumber Card Info VCI API Summary

### Common API
For details on the common API, please see [README.md](../common/README.md).

- POST `/admin/keys/new`
- POST `/admin/keys/:kid/revoke`
- POST `/admin/keys/:kid/csr`
- POST `/admin/keys/:kid/signselfcert`
- POST `/admin/keys/:kid/registercert`
- GET `/admin/keys/:kid`
- GET `/.well-known/openid-credential-issuer`
- GET `/.well-known/oauth-authorization-server`
- POST `/token`
- POST `/credentials`

### Specific API
This application does not have any specific APIs.

## Preparing the .env File
Create the `.env` file based on the `.env.template`. Please adjust the content as necessary.

| Key                                 | Value                                               | 
| ----------------------------------- | --------------------------------------------------- | 
| APP_PORT                            | 3000                                                | 
| BASIC_AUTH_USERNAME                 | username                                            | 
| BASIC_AUTH_PASSWORD                 | password                                            | 
| DATABASE_FILEPATH                   | ./database.sqlite                                   | 
| ISS_ENTITY_NAME                     | The name of the issuer displayed on the UI at the start of the OAuth2 authorization flow. | 
| CREDENTIAL_ISSUER_IDENTIFIER        | Set the same value as described in the `credential_issuer` section of the Credential Issuer Metadata file. | 
| CREDENTIAL_OFFER_ENDPOINT           | openid-credential-offer://                          | 
| OAUTH2_AUTH_ENDPOINT                | Please obtain it from xID Inc. (https://xid.inc).   | 
| OAUTH2_TOKEN_ENDPOINT               | Please obtain it from xID Inc. (https://xid.inc).   | 
| OAUTH2_CLIENT_ID                    | Please obtain it from xID Inc. (https://xid.inc).   | 
| OAUTH2_CLIENT_SECRET                | Please obtain it from xID Inc. (https://xid.inc).   | 
| OAUTH2_REDIRECT_URI                 | The callback URL provided during the application to xID Inc. (https://xid.inc). | 
| OAUTH2_SCOPE                        | Please receive the available values from xID Inc. (https://xid.inc). | 
| VCI_PRE_AUTH_CODE_EXPIRES_IN        | 86400                                               | 
| VCI_ACCESS_TOKEN_EXPIRES_IN         | 86400                                               | 
| VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN | 86400                                               | 
| WALLET_NAME                         | The name of the client displayed on the UI at the start of the OAuth2 authorization flow. | 
| X_ID_CLIENT_KEY_PAIR_PRIVATE        | The private key generated during the application to xID Inc. (https://xid.inc). | 
| X_ID_CLIENT_KEY_PAIR_PUBLIC         | The public key generated during the application to xID Inc. (https://xid.inc). | 
| X_ID_API_BASE_URL                   | Please obtain it from xID Inc. (https://xid.inc).   | 
