import crypto from "node:crypto";
import axios, { AxiosInstance } from "axios";
import moment from "moment";

import { NiceHttpStatusCode, NiceApiError, NiceApiResultCode, NiceClientError } from ".";
import { NiceCryptoTokenResponse, NiceIssueAccessTokenResponse, NiceRrnMatchCheckResponse } from "../types";
import { toBase64, toEucKr } from "../util";
import {
  NiceApiSeedCalculateProvider,
  NiceApiSeedCalculatorVer1,
  NiceApiSeedCalculatorVer2,
  NiceKycApiCryptoKeyParameters,
} from "../lib/crypto";

const NICE_KYC_API_BASE_URL = "https://svc.niceapi.co.kr:22001";

export enum NiceApiProductCode {
  NationalNameKyc,
  IdentityVerification,
}

interface NiceApiProductCredential {
  clientId: string;
  clientSecret: string;
}

export interface NiceApiProductInfo extends NiceApiProductCredential {
  code: NiceApiProductCode;
  productId: string;
}

interface NiceApiProduct {
  info: NiceApiProductInfo;
  accessToken: string;
}

export class NiceKycApi {
  private _client: AxiosInstance;
  private _products: NiceApiProduct[];

  constructor(products: NiceApiProductInfo[] = []) {
    this._client = axios.create({
      baseURL: NICE_KYC_API_BASE_URL,
      validateStatus: () => true,
    });
    this._products = products.map((product) => ({ info: product, accessToken: "" }));
  }

  async checkRrnMatch(req: NiceApiRrnCheckRequest) {
    const product = this.getProduct(NiceApiProductCode.NationalNameKyc);
    const productId = product.info.productId;

    const token = await this.generateCryptoToken(product, new NiceApiSeedCalculatorVer2());
    const accessToken = this.getAuthorization(product);

    const encryptedRRN = NiceKycApi.encrypt(Buffer.from(req.rrn), token);
    const encryptedName = NiceKycApi.encrypt(toEucKr(req.name), token);

    const res = await this.request<NiceRrnMatchCheckResponse>({
      path: "/digital/niceid/api/v1.0/name/national/check",
      body: {
        dataBody: {
          token_version_id: token.tokenVersionId,
          enc_jumin_id: encryptedRRN,
          enc_name: encryptedName,
          integrity_value: NiceKycApi.hmac(`${token.tokenVersionId.trim()}${encryptedRRN}${encryptedName}`, token),
        },
      },
      headers: {
        Authorization: `bearer ${accessToken}`,
        ProductID: productId,
      },
    });
    const { dataBody } = res.responseBody;

    if (dataBody.rsp_cd !== "P000") {
      throw new NiceClientError(`National name check failed\nCode: ${dataBody.rsp_cd}\nMessage: ${dataBody.res_msg}`);
    }
    return { match: dataBody.result_cd === "1" };
  }

  async checkIdentityVerification(req: unknown) {
    // const productId = this.getProductId(NiceApiProductCode.IdentityVerification);
    //
    // const token = await this.generateCryptoToken(productId, new NiceApiSeedCalculatorVer1());
    // const accessToken = this.getAuthorization(this._accessToken);
  }

  /**
   * Nice API Entrance 인증 토큰 발급
   */
  private async requestEntranceToken(
    credential: NiceApiProductCredential,
  ): Promise<NiceKycApiResult<NiceIssueAccessTokenResponse>> {
    const res = await this.request<NiceIssueAccessTokenResponse>({
      path: "/digital/niceid/oauth/oauth/token",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "default",
      }),
      headers: {
        Authorization: `Basic ${NiceKycApi.getEntranceAuthorization(credential)}`,
      },
    });
    return res;
  }

  private async generateCryptoToken(
    product: NiceApiProduct,
    provider: NiceApiSeedCalculateProvider,
  ): Promise<NiceKycApiCryptoToken> {
    if (!product.accessToken) {
      const requestEntranceTokenRes = await this.requestEntranceToken(product.info);
      const status = requestEntranceTokenRes.responseBody.dataHeader.GW_RSLT_CD;

      if (status !== NiceApiResultCode.Success) {
        throw new NiceApiError(requestEntranceTokenRes, `Failed to request entrance token`);
      }
      product.accessToken = requestEntranceTokenRes.responseBody.dataBody.access_token;
    }
    const authorization = this.getAuthorization(product);
    const requestNo = NiceKycApi.generateRequestNo();
    const requestDateTime = NiceKycApi.generateRequestDateTime();

    const res = await this.request<NiceCryptoTokenResponse>({
      path: "/digital/niceid/api/v1.0/common/crypto/token",
      body: {
        dataBody: {
          req_dtim: requestDateTime,
          req_no: requestNo,
          enc_mode: NiceKycApiEncMode.AES128,
        },
      },
      headers: {
        Authorization: `bearer ${authorization}`,
        ProductID: product.info.productId,
      },
    });
    const { dataBody } = res.responseBody;
    const hashSeed = `${requestDateTime}${requestNo}${dataBody.token_val}`;

    const token = provider.calculateSeed(hashSeed);

    return { tokenVersionId: dataBody.token_version_id, ...token };
  }

  private static encrypt(data: Buffer, token: NiceKycApiCryptoToken) {
    const cipher = crypto.createCipheriv("aes-128-cbc", token.key, token.iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return encrypted.toString("base64");
  }

  private static hmac(data: string, token: NiceKycApiCryptoToken) {
    const hmac = crypto.createHmac("sha256", token.hmac);
    return hmac.update(data, "utf-8").digest("base64");
  }

  protected async request<T = unknown>(request: NiceKycApiRequest): Promise<NiceKycApiResult<T>> {
    const res = await this._client.request<NiceKycApiResponseBody<T>>({
      method: request.method || "POST",
      url: request.path,
      data: request.body,
      headers: request.headers,
    });
    const result: NiceKycApiResult<T> = {
      request: request,
      responseBody: res.data,
    };
    if (
      res.status !== NiceHttpStatusCode.OK ||
      result.responseBody.dataHeader.GW_RSLT_CD !== NiceApiResultCode.Success
    ) {
      throw new NiceApiError(result);
    }
    return result;
  }

  private static getEntranceAuthorization(credential: NiceApiProductCredential): string {
    return toBase64(`${credential.clientId}:${credential.clientSecret}`);
  }

  private getAuthorization(product: NiceApiProduct) {
    return toBase64(`${product.accessToken}:${NiceKycApi.getTimestamp()}:${product.info.clientId}`);
  }

  private getProduct(code: NiceApiProductCode) {
    const product = this._products.find((p) => p.info.code === code);

    if (!product) {
      throw new NiceClientError(`Product ID for ${NiceApiProductCode[code]} is not set`);
    }
    return product;
  }

  private static getTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
  }

  private static generateRequestNo() {
    return `REQ${Date.now().toString()}${Math.random().toString().slice(-6)}`;
  }

  private static generateRequestDateTime() {
    return moment().format("YYYYMMDDHHmmss");
  }
}

export interface NiceKeyApiCredential {
  clientId: string;
  clientSecret: string;
}

export interface NiceKycApiRequest {
  method?: "GET" | "POST";
  path: string;
  headers?: Record<string, string>;
  body: unknown;
}

export interface NiceKycApiResult<T = unknown> {
  request: NiceKycApiRequest;
  responseBody: NiceKycApiResponseBody<T>;
}

export type NiceKycApiAsyncResult<T = unknown> = Promise<NiceKycApiResult<T>>;

export interface NiceKycApiResponseBody<T = unknown> {
  dataHeader: {
    GW_RSLT_CD: string;
    GW_RSLT_MSG: string;
  };
  dataBody: T;
}

export interface NiceApiRrnCheckRequest {
  /**
   * 주민번호 13자리
   */
  rrn: string;
  /**
   * 이름
   */
  name: string;
}

export interface NiceKycApiCryptoToken extends NiceKycApiCryptoKeyParameters {
  tokenVersionId: string;
}

export enum NiceKycApiEncMode {
  AES128 = "1",
  CBC = "CBC",
  PKCS7 = "PKCS7",
}
