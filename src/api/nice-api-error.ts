import { NiceKycApiRequest, NiceKycApiResult } from "./nice-kyc-api";

export class NiceApiError extends Error {
  constructor(result: NiceKycApiResult, message?: string) {
    super(
      `Error during request to ${result.request.path}\nNiceKycApiError: ${result.responseBody.dataHeader.GW_RSLT_CD} ${result.responseBody.dataHeader.GW_RSLT_MSG}\n${message}`,
    );
  }
}
