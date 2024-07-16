# Event Certificate Manager Backend
## Installation

### Prerequisites
Make sure you have Node.js version 18 or later installed. You can use `nvm` (Node Version Manager) to install and use the required Node.js version:

```commandline
nvm install stable --latest-npm
nvm use 18
```

### Build

To start the application, first ensure that a `.env` file is prepared with the appropriate settings. 

#### Preparing the .env File
Create the `.env` file based on the `.env.template`. Please adjust the content as necessary.

| Key                                 | Sample Value    | 
|-------------------------------------|-----------------| 
| ENVIRONMENT                         | dev             | 
| DATABASE_FILEPATH                   | ./database.sqlite | 
| APP_NAME                            | event-certificate-manager                | 
| APP_PORT                            | 3001            | 
| BASIC_AUTH_USERNAME                 | username        | 
| BASIC_AUTH_PASSWORD                 | password        | 
| ADMIN_AUTH_USERNAME                 | admin           | 
| ADMIN_AUTH_PASSWORD                 | password        | 
| CREDENTIAL_ISSUER_IDENTIFIER        | https://demo-vci.exemple.com | 
| CREDENTIAL_ISSUER                   | https://demo-vci.exemple.com | 
| CREDENTIAL_OFFER_ENDPOINT           | openid-credential-offer:// | 
| VCI_PRE_AUTH_CODE_EXPIRES_IN        | 86400           | 
| VCI_ACCESS_TOKEN_EXPIRES_IN         | 86400           | 
| VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN | 86400           | 

#### Start app
```commandline
yarn
yarn start
```

## VCI API Summary
### OWND-Project-VCI API
For details on the common API, please see [README.md](https://github.com/OWND-Project/OWND-Project-VCI/tree/main/src).

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
