export enum NiceHttpStatusCode {
  OK = 200,
  BadRequest = 400,
  AuthorizeRequired = 401,
  Unauthorized = 402,
  ServiceDisabled = 403,
  ServiceNotFound = 404,
  InternalServerError = 500,
  AccessDeniedByProtectedService = 501,
  BadResponseFromProtectedService = 502,
  ServiceTemporarilyUnavailable = 503,
}

export enum NiceApiResultCode {
  Success = "1200",
}
