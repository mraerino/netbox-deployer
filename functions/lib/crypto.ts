import crypto from "crypto";

const algorithm = "aes256";
const inputEncoding = "utf8";
const outputEncoding = "hex";

export const encryptToken = (token: string, key: string): string => {
  const cipher = crypto.createCipher(algorithm, key);
  return (
    cipher.update(token, inputEncoding, outputEncoding) +
    cipher.final(outputEncoding)
  );
};

export const decryptToken = (token: string, key: string): string => {
  const decipher = crypto.createDecipher(algorithm, key);
  return (
    decipher.update(token, outputEncoding, inputEncoding) +
    decipher.final(inputEncoding)
  );
};
