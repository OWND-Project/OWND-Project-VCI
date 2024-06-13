import {
  AbstractDisplay,
  ClaimDisplay,
  CredentialDisplay,
  IssuerDisplay,
  IssuerMetadata,
} from "../oid4vci/protocol.types.js";

const localizeDisplay = <T extends AbstractDisplay>(
  displays: T[],
  locale: string,
  defaultLocale: string,
): T[] => {
  const defaultDisplay = displays.find(
    (display) => display.locale === defaultLocale,
  );
  const localeDisplay = displays.find((display) => display.locale === locale);
  return localeDisplay
    ? [localeDisplay]
    : defaultDisplay
    ? [defaultDisplay]
    : displays;
};

const localizeIssuerDisplay = (
  issuerDisplays: IssuerDisplay[],
  locale: string,
  defaultLocale: string,
): IssuerDisplay[] => {
  return localizeDisplay(issuerDisplays, locale, defaultLocale);
};

const localizeCredentialDisplay = (
  credentialDisplays: CredentialDisplay[],
  locale: string,
  defaultLocale: string,
): CredentialDisplay[] => {
  return localizeDisplay(credentialDisplays, locale, defaultLocale);
};

const localizeClaimDisplay = (
  claimDisplays: ClaimDisplay[],
  locale: string,
  defaultLocale: string,
): ClaimDisplay[] => {
  return localizeDisplay(claimDisplays, locale, defaultLocale);
};

export const localizeIssuerMetadata = (
  metadata: IssuerMetadata,
  locale: string,
  defaultLocale: string,
): IssuerMetadata => {
  const localizedMetadata = { ...metadata };

  if (metadata.display) {
    localizedMetadata.display = localizeIssuerDisplay(
      metadata.display,
      locale,
      defaultLocale,
    );
  }

  Object.keys(metadata.credential_configurations_supported).forEach((key) => {
    const config = metadata.credential_configurations_supported[key];

    if (config.display) {
      config.display = localizeCredentialDisplay(
        config.display,
        locale,
        defaultLocale,
      );
    }

    if (
      "credential_definition" in config &&
      config.credential_definition.credentialSubject
    ) {
      Object.keys(config.credential_definition.credentialSubject).forEach(
        (claimKey) => {
          const claim =
            config.credential_definition.credentialSubject![claimKey];
          if (claim.display) {
            claim.display = localizeClaimDisplay(
              claim.display,
              locale,
              defaultLocale,
            );
          }
        },
      );
    }

    if ("claims" in config) {
      Object.keys(config.claims).forEach((claimKey) => {
        const claim = config.claims![claimKey];
        if (claim.display) {
          claim.display = localizeClaimDisplay(
            claim.display,
            locale,
            defaultLocale,
          );
        }
      });
    }
  });

  return localizedMetadata;
};
