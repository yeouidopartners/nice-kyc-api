import crypto from "node:crypto";

export interface NiceApiSeedCalculateProvider {
  calculateSeed(seed: string): NiceKycApiCryptoKeyParameters;
}

/**
 * HMAC이 앞에서부터 32byte.
 */
export class NiceApiSeedCalculatorVer1 implements NiceApiSeedCalculateProvider {
  calculateSeed(seed: string): NiceKycApiCryptoKeyParameters {
    const hash = crypto.createHash("sha256").update(seed).digest("base64");

    const key = Buffer.from(hash.slice(0, 16));
    const iv = Buffer.from(hash.slice(-16));
    const hmac = Buffer.from(hash.slice(0, 32));
    return {
      key,
      iv,
      hmac,
    };
  }
}

/**
 * HMAC이 뒤에서부터 32byte.
 */
export class NiceApiSeedCalculatorVer2 implements NiceApiSeedCalculateProvider {
  calculateSeed(seed: string): NiceKycApiCryptoKeyParameters {
    const hash = crypto.createHash("sha256").update(seed).digest("base64");

    const key = Buffer.from(hash.slice(0, 16));
    const iv = Buffer.from(hash.slice(-16));
    const hmac = Buffer.from(hash.slice(-32));
    return {
      key,
      iv,
      hmac,
    };
  }
}

export interface NiceKycApiCryptoKeyParameters {
  key: Buffer;
  iv: Buffer;
  hmac: Buffer;
}
