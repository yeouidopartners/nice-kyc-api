import task from "tasuku";
import "dotenv/config";
import { NiceApiProductCode, NiceKycApi } from "../src";
import * as process from "node:process";

const NICE_RRN_CLIENT_ID = process.env.NICE_RRN_CLIENT_ID!;
const NICE_RRN_CLIENT_SECRET = process.env.NICE_RRN_CLIENT_SECRET!;
const NICE_IDENTIFY_CLIENT_ID = process.env.NICE_IDENTIFY_CLIENT_ID!;
const NICE_IDENTIFY_CLIENT_SECRET = process.env.NICE_IDENTIFY_CLIENT_SECRET!;

const client = new NiceKycApi([
  {
    code: NiceApiProductCode.NationalNameKyc,
    productId: "2101290037",
    clientId: NICE_RRN_CLIENT_ID,
    clientSecret: NICE_RRN_CLIENT_SECRET,
  },
  {
    code: NiceApiProductCode.IdentityVerification,
    productId: "2101979031",
    clientId: NICE_IDENTIFY_CLIENT_ID,
    clientSecret: NICE_IDENTIFY_CLIENT_SECRET,
  },
]);

task.group((task) => [
  task("prepare", async ({ setError }) => {
    if (!NICE_RRN_CLIENT_ID || !NICE_RRN_CLIENT_SECRET || !NICE_IDENTIFY_CLIENT_ID || !NICE_IDENTIFY_CLIENT_SECRET) {
      setError("More than one of required test env var not set");
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
      if (e instanceof Error) {
        setError(e);
      }
    }
  }),

  task("identify-payload", async ({ setOutput }) => {
    const res = await client.checkIdentityVerification({
      returnURL: "http://localhost:5173/",
    });
    setOutput(JSON.stringify(res));
  }),
]);
