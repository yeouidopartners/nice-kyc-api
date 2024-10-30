import crypto from "node:crypto";
import axios, { AxiosInstance } from "axios";
import moment from "moment";

import { NiceHttpStatusCode, NiceApiError, NiceApiResultCode, NiceClientError } from ".";
import { NiceCryptoTokenResponse, NiceIssueAccessTokenResponse, NiceKycPersonnalCheckResponse } from "../types";
import { toBase64, toEucKr } from "../util";
import { NiceApiSeedCalculateProvider, NiceApiSeedCalculatorVer2, NiceKycApiCryptoToken } from "./crypto";

const NICE_KYC_API_BASE_URL = "https://svc.niceapi.co.kr:22001";

export enum NiceApiProductId {
  NationalNameKyc = "2101290037",
}

export class NiceKycApi {
  private _client: AxiosInstance;
  private _accessToken: string;

  constructor(private _credential: NiceKeyApiCredential) {
    this._client = axios.create({
      baseURL: NICE_KYC_API_BASE_URL,
      validateStatus: () => true,
    });
    this._accessToken = "";
  }

  setAccessToken(token: string) {
    this._accessToken = token;
  }

  async nationalCheck(req: NiceApiNationalCheckRequest) {
    const token = await this.generateCryptoToken(NiceApiProductId.NationalNameKyc, new NiceApiSeedCalculatorVer2());
    const accessToken = this.getAuthorization(this._accessToken);

    const encryptedJuminId = NiceKycApi.encrypt(Buffer.from(req.juminId), token);
    const encryptedName = NiceKycApi.encrypt(toEucKr(req.name), token);

    const res = await this.request<NiceKycPersonnalCheckResponse>({
      path: "/digital/niceid/api/v1.0/name/national/check",
      body: {
        // dataHeader: {
        //   CNTY_CD: "ko",
        // },
        dataBody: {
          token_version_id: token.tokenVersionId,
          enc_jumin_id: encryptedJuminId,
          enc_name: encryptedName,
          integrity_value: NiceKycApi.hmac(`${token.tokenVersionId.trim()}${encryptedJuminId}${encryptedName}`, token),
        },
      },
      headers: {
        Authorization: `bearer ${accessToken}`,
        ProductID: NiceApiProductId.NationalNameKyc,
      },
    });
    const { dataBody } = res.responseBody;

    if (dataBody.rsp_cd !== "P000") {
      throw new NiceClientError(`National name check failed\nCode: ${dataBody.rsp_cd}\nMessage: ${dataBody.res_msg}`);
    }
    return { match: dataBody.result_cd === "1" };
  }

  private async requestOAuthToken() {
    const res = await this.request<NiceIssueAccessTokenResponse>({
      path: "/digital/niceid/oauth/oauth/token",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "default",
      }),
      headers: {
        Authorization: `Basic ${this.getEntranceAuthorization()}`,
      },
    });
    return res;
  }

  private async generateCryptoToken(
    productId: string,
    provider: NiceApiSeedCalculateProvider,
  ): Promise<NiceKycApiCryptoInfo> {
    if (!this._accessToken) {
      throw new NiceClientError("Access token is not set");
    }
    const authorization = this.getAuthorization(this._accessToken);
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
        ProductID: productId,
      },
    });
    const { dataBody } = res.responseBody;
    const hashSeed = `${requestDateTime}${requestNo}${dataBody.token_val}`;

    const token = provider.calculateSeed(hashSeed);

    return { tokenVersionId: dataBody.token_version_id, ...token };
  }

  private static encrypt(data: Buffer, token: NiceKycApiCryptoInfo) {
    const cipher = crypto.createCipheriv("aes-128-cbc", token.key, token.iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return encrypted.toString("base64");
  }

  private static hmac(data: string, token: NiceKycApiCryptoInfo) {
    const hmac = crypto.createHmac("sha256", token.hmac);
    const hash = hmac.update(data, "utf-8").digest("base64");
    return hash;
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

  private getEntranceAuthorization(): string {
    return toBase64(`${this._credential.clientId}:${this._credential.clientSecret}`);
  }

  private getAuthorization(accessToken: string) {
    return toBase64(`${accessToken}:${NiceKycApi.getTimestamp()}:${this._credential.clientId}`);
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
  public static async create(credential: NiceKeyApiCredential) {
    const api = new NiceKycApi(credential);
    const token = await api.requestOAuthToken();

    api.setAccessToken(token.responseBody.dataBody.access_token);

    return api;
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

export interface NiceKycApiResponseBody<T = unknown> {
  dataHeader: {
    GW_RSLT_CD: string;
    GW_RSLT_MSG: string;
  };
  dataBody: T;
}

export interface NiceApiNationalCheckRequest {
  /**
   * 주민번호 13자리
   */
  juminId: string;
  /**
   * 이름
   */
  name: string;
}

export interface NiceKycApiCryptoInfo extends NiceKycApiCryptoToken {
  tokenVersionId: string;
}

export enum NiceKycApiEncMode {
  AES128 = "1",
  CBC = "CBC",
  PKCS7 = "PKCS7",
}
