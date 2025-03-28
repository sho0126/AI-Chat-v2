const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// ユーザーごとの選択状況を保持（補助金の種類）
const userContext = {};

// 補助金カルーセルUI
const getHojokinCarousel = () => {
  return {
    type: "template",
    altText: "補助金を選択してください",
    template: {
      type: "carousel",
      columns: [
        {
          thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          title: "小規模事業者持続化補助金",
          text: "販路開拓や設備導入の補助金",
          actions: [
            {
              type: "message",
              label: "この補助金を選ぶ",
              text: "[小規模事業者持続化補助金]",
            },
          ],
        },
        {
          thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          title: "ものづくり補助金",
          text: "革新的サービス開発を支援",
          actions: [
            {
              type: "message",
              label: "この補助金を選ぶ",
              text: "[ものづくり補助金]",
            },
          ],
        },
      ],
    },
  };
};

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;

      // 補助金選択処理
      if (userMessage === "[小規模事業者持続化補助金]") {
        userContext[userId] = "/etc/secrets/hojokin_shokibo.txt";
        await pushMessage(userId, "小規模事業者持続化補助金を選択しました。ご質問をどうぞ！");
        continue;
      }

      if (userMessage === "[ものづくり補助金]") {
        userContext[userId] = "/etc/secrets/hojokin_monozukuri.txt";
        await pushMessage(userId, "ものづくり補助金を選択しました。ご質問をどうぞ！");
        continue;
      }

      // 補助金未選択ならカルーセル表示
      if (!userContext[userId] && userMessage === "補助金メニュー") {
        await reply(event.replyToken, getHojokinCarousel());
        continue;
      }

      // 補助金選択済み → GPTに問い合わせ
      if (userContext[userId]) {
        const hojokinText = fs.readFileSync(userContext[userId], "utf8");

        const systemPrompt =
          "あなたは補助金専門のAIアシスタントです。以下の資料（.txt）のみを参照して回答してください。資料に記載のない内容や判断できないことについては、「わかりません」と正直に答えてください。ネット検索や憶測は禁止です。";

        const messages = [
          { role: "system", content: `${systemPrompt}\n\n【資料】\n${hojokinText}` },
          { role: "user", content: userMessage },
        ];

        const gptResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: messages,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const replyMessage = gptResponse.data.choices[0].message.content;

        await axios.post(
          "https://api.line.me/v2/bot/message/reply",
          {
            replyToken: event.replyToken,
            messages: [{ type: "text", text: replyMessage }],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        continue;
      }

      // その他の通常会話はデフォルト応答
      const systemPrompt = process.env.MY_SYSTEM_PROMPT || "あなたは優秀なLINEボットです。";

      const gptResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const replyMessage = gptResponse.data.choices[0].message.content;

      await axios.post(
        "https://api.line.me/v2/bot/message/reply",
        {
          replyToken: event.replyToken,
          messages: [{ type: "text", text: replyMessage }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  res.sendStatus(200);
});

const reply = async (replyToken, message) => {
  await axios.post(
    "https://api.line.me/v2/bot/message/reply",
    {
      replyToken,
      messages: [message],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

const pushMessage = async (to, message) => {
  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to,
      messages: [{ type: "text", text: message }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
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
