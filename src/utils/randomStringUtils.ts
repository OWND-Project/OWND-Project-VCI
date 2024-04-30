export const generateRandomString = (length = 32) => {
  const possibleCharacters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * possibleCharacters.length);
    result += possibleCharacters[randomIndex];
  }

  return result;
};

export const generateRandomNumericString = (length = 8) => {
  const possibleCharacters = "0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * possibleCharacters.length);
    result += possibleCharacters[randomIndex];
  }

  return result;
};
