# NICE KYC API

[Nice API](https://www.niceapi.co.kr/#/) Wrapper

## Install

```bash
pnpm i @yeouidopartners/nice-kyc-api
```

## Examples

### Client 생성

```ts
const api = await NiceKycApi.create({
  clientId: process.env.NICE_CLIENT_ID!,
  clientSecret: process.env.NICE_CLIENT_SECRET!,
});
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
