// index.js - ルーティング・基本制御ファイル

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(bodyParser.json());

// ユーザーの状態を保存する簡易メモリ（セッション的用途）
const userContext = {};

// サービスごとの処理ファイルを読み込み
const { handleKeieiConsult } = require("./services/keieiConsult");
const { handleMiniDiagnosis } = require("./services/miniDiagnosis");
const { handleHojokinSupport } = require("./services/hojokinSupport");
const { reply, pushMessage, pushMessageWithQuickReply } = require("./utils/replyHelper");

// Webhookのエンドポイント
app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;

      // Botの状態によって分岐処理を振り分け
      if (userContext[userId] === "keiei") {
        await handleKeieiConsult(event, userContext, reply);
        continue;
      }

      if (userContext[userId] && userContext[userId].startsWith("mini:")) {
        await handleMiniDiagnosis(event, userContext, reply);
        continue;
      }

      if (userContext[userId] && userContext[userId].startsWith("hojokin:")) {
        await handleHojokinSupport(event, userContext, reply);
        continue;
      }

      // メニュー選択からモード切替などもここで拾う予定
      // 例：「売上・販売戦略」「補助金メニュー」など

      // デフォルトの返信（MY_SYSTEM_PROMPTなど）
      const defaultMessage = "ご質問ありがとうございます。メニューから相談内容を選んでいただくと、より的確にお応えできます。";
      await reply(event.replyToken, { type: "text", text: defaultMessage });
    }
  }

  res.sendStatus(200);
});

// テスト用GETエンドポイント
app.get("/", (req, res) => {
  res.send("LINE ChatGPT Bot is running!");
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Bot is running on port ${port}`);
});
