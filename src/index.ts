import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors"; // CORSミドルウェアをインポート
import {
  main as startWebSocketServer,
  getReceivedMessages,
} from "./webSocket.js";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono();
const port = 3100;

// CORS設定を追加
app.use("*", cors({ origin: "*" }));
app.use("*", prettyJSON());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/ws", (c) => {
  // プレイヤー情報オブジェクトを取得して返す
  const players = getReceivedMessages();
  return c.json(players);
});

const server = serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

startWebSocketServer(server);
