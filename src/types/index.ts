export interface NiceIdentifyClientPayload {
  requestno: string;
  returnurl: string;
  sitecode: string;
}

/**
 * NICE API Access Token Response
 */
export interface NiceIssueAccessTokenResponse {
  /** 사용자 엑세스 토큰 값(모든 API 요청시 헤더에 access_token을 포함하여 전송) */
  access_token: string;
  /** bearer로 고정 */
  token_type: string;
  /** access token 만료까지 남은시간(초) */
  expires_in: number;
  /** 요청한 scope값(기본 default) */
  scope: string;
}

/**
 * NICE API 암호화 토큰 응답
 */
export interface NiceCryptoTokenResponse {
  /** 응답 코드 (P000: 성공, EAPI로 시작하는 경우 오류) */
  rsp_cd: string;
  /**
   * 상세 결과 코드 (rsp_cd가 P000일 때)
   * - 0000: 발급 성공
   * - 0001: 필수입력값 오류
   * - 0003: OTP 발급 대상 회원사 아님
   * - 0099: 기타오류
   */
  result_cd: string;
  /** 사이트 코드 */
  site_code: string;
  /** 서버 토큰 버전 */
  token_version_id: string;
  /** 암복호화를 위한 서버 토큰 값 */
  token_val: string;
  /** 토큰의 만료까지 남은 시간 (초) */
  period: number;
}

export interface NiceRrnMatchCheckResponse {
  /** 응답 코드 (P000: 성공, EAPI로 시작하는 경우 오류) */
  rsp_cd: "P000" | string;
  res_msg?: string;
  /**
   * 검증 결과 코드
   * - 1: 성명 일치
   * - 2: 성명 불일치
   * - 3: 당사 성명 미보유
   * - 7: 명의도용 차단
   * - 8: 부정사용 의심 정보 차단
   */
  result_cd?: "1" | string;
}

export interface NiceIdentifyResponseData {
  responseno: string;
  birthdate: string;
  gender: string;
  di: string;
  mobileco: string;
  ci: string;
  receivedata: string;
  mobileno: string;
  requestno: string;
  nationalinfo: string;
  authtype: string;
  sitecode: string;
  utf8_name: string;
  enctime: string;
  name: string;
  resultcode: string;
}
