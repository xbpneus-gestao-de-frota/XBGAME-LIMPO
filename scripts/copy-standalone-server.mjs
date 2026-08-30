import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await copyFile("server/standalone-server.mjs", "dist/standalone-server.mjs");
console.log("Servidor autônomo copiado para dist/standalone-server.mjs");
