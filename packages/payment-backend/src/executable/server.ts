import { FakeIamportBackend } from "fake-iamport-server";
import { FakeTossBackend } from "fake-toss-payments-server";
import fs from "fs";
import { Singleton, randint } from "tstl";

import { PaymentBackend } from "../PaymentBackend";
import { PaymentGlobal } from "../PaymentGlobal";
// import { PaymentUpdator } from "../PaymentUpdator";
import { ErrorUtil } from "../utils/ErrorUtil";

const EXTENSION = __filename.substr(-2);
if (EXTENSION === "js") require("source-map-support/register");

const directory = new Singleton(async () => {
  await mkdir(`${__dirname}/../../assets`);
  await mkdir(`${__dirname}/../../assets/logs`);
  await mkdir(`${__dirname}/../../assets/logs/errors`);
});

function cipher(val: number): string {
  if (val < 10) return "0" + val;
  else return String(val);
}

async function mkdir(path: string): Promise<void> {
  try {
    await fs.promises.mkdir(path);
  } catch {}
}

async function handle_error(exp: any): Promise<void> {
  try {
    const date: Date = new Date();
    const fileName: string = `${date.getFullYear()}${cipher(
      date.getMonth() + 1,
    )}${cipher(date.getDate())}${cipher(date.getHours())}${cipher(
      date.getMinutes(),
    )}${cipher(date.getSeconds())}.${randint(0, Number.MAX_SAFE_INTEGER)}`;
    const content: string = JSON.stringify(ErrorUtil.toJSON(exp), null, 4);

    await directory.get();
    await fs.promises.writeFile(
      `${__dirname}/../../assets/logs/errors/${fileName}.log`,
      content,
      "utf8",
    );
  } catch {}
}

async function main(): Promise<void> {
  if (
    PaymentGlobal.mode === "local" &&
    process.argv.some((str) => str === "testing")
  )
    PaymentGlobal.testing = true;
  else if (PaymentGlobal.mode === "local")
    for (const server of [new FakeIamportBackend(), new FakeTossBackend()])
      await server.open();

  // BACKEND SEVER LATER
  const backend: PaymentBackend = new PaymentBackend();
  await backend.open();

  //----
  // POST-PROCESSES
  //----
  // UNEXPECTED ERRORS
  global.process.on("uncaughtException", handle_error);
  global.process.on("unhandledRejection", handle_error);

  // // SCHEDULER ONLY WHEN MASTER
  // if (PaymentGlobal.mode !== "real" || process.argv[3] === "master") {
  //   if (PaymentGlobal.mode === "local")
  //     try {
  //       await PaymentUpdator.master();
  //     } catch {}
  //   await Scheduler.repeat();
  // }
}
main().catch((exp) => {
  console.log(exp);
  process.exit(-1);
});
