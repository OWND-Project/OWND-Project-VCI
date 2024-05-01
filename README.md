![OWND Project Logo](https://raw.githubusercontent.com/OWND-Project/.github/main/media/ownd-project-logo.png)

# OWND Project

The OWND Project is a non-profit project that aims to realize more trustworthy communication through the social implementation of individual-centered digital identities.

This project was created as part of the "Trusted Web" use case demonstration project promoted by the Digital Market Competition Headquarters, Cabinet Secretariat.

We will develop a white-label digital identity wallet that complies with international standards and a federated messaging application that supports E2E encryption as open source software, and discuss governance to ensure trust.

[OWND Project Briefing Material](https://github.com/OWND-Project/.github/blob/main/profile/ownd-project.pdf)

[Learn more about Trusted Web](https://trustedweb.go.jp/)

## Project List

### Digital Identity Wallet
- [OWND Wallet Android](https://github.com/OWND-Project/OWND-Wallet-Android)
- [OWND Wallet iOS](https://github.com/OWND-Project/OWND-Wallet-iOS)

### Issuance of Verifiable Credentials
- [OWND Project VCI](https://github.com/OWND-Project/OWND-Project-VCI)

### Messaging Services
- [OWND Messenger Server](https://github.com/OWND-Project/OWND-Messenger-Server)
- [OWND Messenger Client](https://github.com/OWND-Project/OWND-Messenger-Client)
- [OWND Messenger React SDK](https://github.com/OWND-Project/OWND-Messenger-React-SDK)

# OWND Project VCI

## Purpose
The OWND Project VCI provides a reference implementation of a web application compliant with the OpenID for Verifiable Credential Issuance (OID4VCI) standard protocol for issuing Verifiable Credentials.

For more details on the OID4VCI specification, visit [OpenID for Verifiable Credential Issuance](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html).

## Features
This repository contains three web applications:

- My Number Card Information VCI App
- Employee ID VCI App
- Event Participation Certificate VCI App

Each application offers the following features:

## Technical Limitations

### About dependent libraries

This project currently strong depends on [Koa](https://koajs.com/) as a web application framework and sqlite3 as a persistence layer.
If you use this project to develop your applications, you are required to use these library.
In the future, we are considering eliminating our strong dependence and making the core VCI implementation available on its own.

### My Number Card Information VCI App
- A REST API to issue My Number card information as a Verifiable Credential (VC).

### Employee ID VCI App
- A REST API to register employee information.
- A REST API to generate a Credential Offer for issuing an employee ID VC.
- A REST API to issue the employee ID as a VC.

### Event Participation Certificate VCI App
- A REST API to register event participation information.
- A REST API to generate a Credential Offer for issuing an event participation certificate VC.
- A REST API to issue the event participation certificate as a VC.

### Common Features
- A REST API to generate and register a VC Issuer's key pair.
- A REST API to register the Issuer's key pair in X509 format.

## Installation

### Prerequisites
Make sure you have Node.js version 18 or later installed. You can use `nvm` (Node Version Manager) to install and use the required Node.js version:

```commandline
nvm install stable --latest-npm
nvm use 18
```

### Build
To start the application, first ensure that a `.env` file is prepared for each application with the appropriate settings. (Please see the README within each directory for configuration details.) Then, navigate to the directory of each application and run the following command:

```commandline
yarn start
```

## Usage
For detailed instructions on how to use each application, please refer to the README within each app's directory.

## Contributing
Contributions are welcome! The contribution guidelines are currently under consideration. Please check back soon for updates on how you can contribute to this project.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

The MIT License is a permissive license that is short and to the point. It lets people do anything they want with your code as long as they provide attribution back to you and don’t hold you liable.

For more information on the MIT License, please visit [MIT License](https://opensource.org/licenses/MIT).
