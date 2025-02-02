import task from "tasuku";
import "dotenv/config";
import { NiceApiProductCode, NiceKycApi } from "../src";

let client: NiceKycApi;

task.group((task) => [
  task("prepare", async ({ setError }) => {
    if (!process.env.NICE_CLIENT_ID || !process.env.NICE_CLIENT_SECRET) {
      setError("NICE_CLIENT_ID or NICE_CLIENT_SECRET is not set");
    }
  }),
  task("create-client", async ({ setError }) => {
    try {
      client = await NiceKycApi.create(
        {
          clientId: process.env.NICE_CLIENT_ID!,
          clientSecret: process.env.NICE_CLIENT_SECRET!,
        },
        [
          {
            code: NiceApiProductCode.NationalNameKyc,
            id: "2101290037",
          },
        ],
      );
    } catch (e) {
      setError(e);
    }
  }),
  task("rrn-match-check", async ({ setError, setOutput }) => {
    try {
      const rrnRes = await client.checkRrnMatch({
        rrn: "9901011234567",
        name: "홍길동",
      });
      setOutput(`Matched: ${rrnRes.match}`);
    } catch (e) {
      setError(e);
    }
  }),
]);
