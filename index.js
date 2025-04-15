const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();
const fs = require("fs");

const hojokinMenu = require("./services/hojokinMenu");
const hojokinShindan = require("./services/hojokinShindan");
const hojokinInfo = require("./services/hojokinInfo");
const toiawase = require("./services/toiawase");

const { reply } = require("./utils/replyHelper");

const app = express();
app.use(bodyParser.json());

const userContext = {}; // 状態保持（mode, source）

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    try {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        const userId = event.source.userId;

        // === モードの起点コマンド ===
        if (userMessage === "補助金メニュー") {
          userContext[userId] = { mode: "hojokin" };
          await hojokinMenu.route(event, userMessage, userId, userContext);
          continue;
        }

        if (userMessage === "補助金診断") {
          userContext[userId] = { mode: "hojokin" };
          await hojokinShindan.route(event, userMessage, userId, userContext);
          continue;
        }

        if (userMessage === "補助金について知る") {
          userContext[userId] = { mode: "hojokin" };
          await hojokinInfo.route(event, userMessage, userId, userContext);
          continue;
        }

        if (userMessage === "お問い合わせ") {
          userContext[userId] = { mode: "hojokin" };
          await toiawase.route(event, userMessage, userId, userContext);
          continue;
        }

        // === 補助金メニュー選択・診断・自由質問・問い合わせルーティング ===
        if (userContext[userId]?.mode === "hojokin") {
          if (
            await hojokinMenu.route(event, userMessage, userId, userContext) ||
            await hojokinShindan.route(event, userMessage, userId, userContext) ||
            await hojokinInfo.route(event, userMessage, userId, userContext) ||
            await toiawase.route(event, userMessage, userId, userContext)
          ) {
            continue;
          }

          // === 補助金モード中の自由質問（.txtをもとにGPT応答） ===
          const sourcePath = userContext[userId]?.source;
          if (sourcePath && fs.existsSync(sourcePath)) {
            const hojokinText = fs.readFileSync(sourcePath, "utf8");

            const systemPrompt = `
あなたは補助金専門のAIアシスタントです。
以下の資料（.txt）のみを参照して回答してください。
資料に記載のない内容や判断できないことについては、「わかりません」と正直に答えてください。
ネット検索や憶測は禁止です。
`;

            const messages = [
              { role: "system", content: `${systemPrompt}\n\n【資料】\n${hojokinText}` },
              { role: "user", content: userMessage }
            ];

            const gptResponse = await axios.post(
              "https://api.openai.com/v1/chat/completions",
              {
                model: "gpt-4",
                messages
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json"
                }
              }
            );

            const replyMessage = gptResponse.data.choices[0].message.content;
            await reply(event.replyToken, {
              type: "text",
              text: replyMessage
            });

            continue;
          }
        }

        // === モード外（未設定 or 補助金外）の場合 → 無視 or 固定応答
        await reply(event.replyToken, {
          type: "text",
          text: "補助金メニューからスタートしてください。\nメニューが表示されていない場合は「補助金メニュー」と入力してください。"
        });
      }
    } catch (err) {
      console.error("index.js error:", err);
      await reply(event.replyToken, {
        type: "text",
        text: "エラーが発生しました。しばらくしてから再度お試しください。"
      });
    }
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("補助金Bot is running!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot is running on port ${port}`);
});
