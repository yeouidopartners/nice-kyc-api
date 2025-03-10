# NICE KYC API

[Nice API](https://www.niceapi.co.kr/#/) Wrapper

## Install

```bash
pnpm i @yeouidopartners/nice-kyc-api
```

## Examples

### Client 생성

```ts
const api = new NiceKycApi(
  {
    code: NiceApiProductCode.NationalNameKyc,
    // Maybe fixed id
    productId: "2101290037",
    clientId: NICE_RRN_CLIENT_ID,
    clientSecret: NICE_RRN_CLIENT_SECRET,
  },
  {
    code: NiceApiProductCode.IdentityVerification,
    // Maybe fixed id
    productId: "2101979031",
    clientId: NICE_IDENTIFY_CLIENT_ID,
    clientSecret: NICE_IDENTIFY_CLIENT_SECRET,
  },
)
```

### 이름-주민번호 매칭 검증

```ts
const res = await api.checkRrnMatch({
  rrn: "9901011234567",
  name: "홍길동",
});
if (!res.match) {
  throw new Error("Name and rrn do not match");
}
```
