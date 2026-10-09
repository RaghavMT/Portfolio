// Prints the value for ADMIN_PASSWORD_HASH: base64(bcrypt hash, cost 12) (SPEC §12.1).
//   pnpm hash-password
// Input is hidden. The password is never written to disk or logged.
import { createRequire } from "node:module";

const bcrypt = createRequire(import.meta.url)(
  "bcryptjs",
) as typeof import("bcryptjs");

const MIN_LENGTH = 8;

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("Run this in an interactive terminal."));
      return;
    }
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await readHidden("New admin password: ");
if (password.length < MIN_LENGTH) {
  console.error(`Password must be at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}
if (password !== (await readHidden("Repeat password: "))) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.info("\nADMIN_PASSWORD_HASH=" + Buffer.from(hash).toString("base64"));
