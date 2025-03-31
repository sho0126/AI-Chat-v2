const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const hojokinSupport = require("./services/hojokinSupport");
const keieiConsult = require("./services/keieiConsult");
const miniDiagnosis = require("./services/miniDiagnosis");

const app = express();
app.use(bodyParser.json());

const userContext = {}; // ユーザーの状態を保持（補助金/経営相談/ミニ診断）

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;

      // 各モードのルーティング
      if (await hojokinSupport.route(event, userMessage, userId, userContext)) continue;
      if (await keieiConsult.route(event, userMessage, userId, userContext)) continue;
      if (await miniDiagnosis.route(event, userMessage, userId, userContext)) continue;

      // 通常モード（共通チャット対応）
      const systemPrompt = process.env.MY_SYSTEM_PROMPT || "あなたは優秀なLINEボットです。";

      const gptResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const replyMessage = gptResponse.data.choices[0].message.content;
      await reply(event.replyToken, { type: "text", text: replyMessage });
    }
  }

  res.sendStatus(200);
});

// 共通返信関数
const reply = async (replyToken, message) => {
  await axios.post(
    "https://api.line.me/v2/bot/message/reply",
    {
      replyToken,
      messages: [message]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
};

// Push関数（任意で使用可能）
const pushMessage = async (to, message) => {
  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to,
      messages: [{ type: "text", text: message }]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
};

app.get("/", (req, res) => {
  res.send("LINE ChatGPT Bot is running!");
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Bot is running on port ${port}`);
});

