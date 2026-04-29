import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../app.ts";

const app = createApp();

export const config = {
  runtime: "nodejs",
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
