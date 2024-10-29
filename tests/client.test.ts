import { NiceKycApi } from "../src";
import "dotenv/config";
import task from "tasuku";

console.log("NICE_CLIENT_ID", process.env.NICE_CLIENT_ID);
console.log("NICE_CLIENT_SECRET", process.env.NICE_CLIENT_SECRET);

task("create-client", async () => {
  const api = await NiceKycApi.create({
    clientId: process.env.NICE_CLIENT_ID!,
    clientSecret: process.env.NICE_CLIENT_SECRET!,
  });
});

task("check-name", async () => {
  const api = await NiceKycApi.create({
    clientId: process.env.NICE_CLIENT_ID!,
    clientSecret: process.env.NICE_CLIENT_SECRET!,
  });
  const res = await api.nationalCheck({
    juminId: "9901011234567",
    name: "홍길동",
  });
  console.log(res);
});
