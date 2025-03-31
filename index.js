const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const userContext = {};

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

      // 経営相談モード開始
      if (userMessage === "経営相談") {
        userContext[userId] = "keiei";
        await pushMessage(userId, "まず、現在の事業内容を簡単にお聞かせください。\n\n※「経営相談を終了する」で通常モードに戻ります。");
        continue;
      }

      // 経営相談モード終了
      if (userMessage === "経営相談を終了する") {
        delete userContext[userId];
        await pushMessage(userId, "経営相談モードを終了しました。メニューからご希望の内容を選んでください。");
        continue;
      }

      // 経営相談モード対応
      if (userContext[userId] === "keiei") {
        const keieiPrompt = fs.readFileSync("/etc/secrets/keiei_prompt.txt", "utf8");

        const systemPrompt = `
あなたは経営コンサルタントであり、中小企業診断士です。
経営者とLINE上で対話しながら、以下のフレームに沿って順を追ってヒアリングを行い、
経営課題の明確化、改善策の提案、KPIの設計までを一貫して支援してください。

【進行フレームワーク】
1. 事業内容の把握
2. 財務状況の確認
3. 経営者の悩みや現場の課題
4. 原因分析と背景の特定
5. 潜在課題の深掘り
6. 改善方向性の提示
7. 経営理論に基づく施策の提案
8. KPIの設計と目標設定

【対話のスタイル】
― ユーザーが回答しやすいように、一度に複数の質問をしないでください。
― 改行を適切に使い、読みやすい文章構成にしてください。
― 短い簡潔な文章で質問してください。
― 経営者が答えやすいように、言葉を噛み砕いて質問してください。
― 段落や改行を使って読みやすい出力にしてください。
― 会話の流れで、フレームから脱線することは許容しますが、必ずフレームに戻ってください。
― いきなり課題を聞くのではなく、客観情報から対話を進めてください。

【補助資料】
参考として、事前に与えられた「keiei_prompt.txt」も熟読してください。
`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content:`以下は参考資料です。\n${keieiPrompt}` },
          { role: "user", content: userMessage },
        ];

        const gptResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4-turbo",
            messages,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const replyMessage = gptResponse.data.choices[0].message.content;
        await reply(event.replyToken, { type: "text", text: replyMessage });
        continue;
      }

      // 補助金選択
      if (userMessage === "[小規模事業者持続化補助金]") {
        userContext[userId] = "/etc/secrets/hojokin_shokibo.txt";
        await pushMessageWithQuickReply(userId, "小規模事業者持続化補助金を選択しました。ご質問をどうぞ！");
        continue;
      }

      if (userMessage === "[ものづくり補助金]") {
        userContext[userId] = "/etc/secrets/hojokin_monozukuri.txt";
        await pushMessageWithQuickReply(userId, "ものづくり補助金を選択しました。ご質問をどうぞ！");
        continue;
      }

      // 補助金モード終了
      if (userMessage === "補助金相談を終了する") {
        delete userContext[userId];
        await pushMessage(userId, "補助金相談モードを終了しました。メニューから再度お選びください。");
        continue;
      }

      // 補助金メニュー表示
      if (userMessage === "補助金メニュー") {
        delete userContext[userId];
        await reply(event.replyToken, getHojokinCarousel());
        continue;
      }

      // 他のメニュー選択で補助金モード終了（経営相談を除く）
      const otherMenus = ["業務改善Tips", "お問い合わせ"];
      if (otherMenus.includes(userMessage)) {
        if (typeof userContext[userId] === "string" && userContext[userId].includes("hojokin")) {
          delete userContext[userId];
          await pushMessage(userId, "補助金相談モードを終了しました。他のご相談をどうぞ！");
        }
        continue;
      }

      // 補助金モードでの質問処理
      if (userContext[userId] && typeof userContext[userId] === "string" && userContext[userId].includes("hojokin")) {
        const hojokinText = fs.readFileSync(userContext[userId], "utf8");
        const systemPrompt = "あなたは補助金専門のAIアシスタントです。以下の資料（.txt）のみを参照して回答してください。資料に記載のない内容や判断できないことについては、『わかりません』と正直に答えてください。ネット検索や憶測は禁止です。";

        const messages = [
          { role: "system", content: `${systemPrompt}\n\n【資料】\n${hojokinText}` },
          { role: "user", content: userMessage },
        ];

        const gptResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const replyMessage = gptResponse.data.choices[0].message.content;

        await reply(event.replyToken, {
          type: "text",
          text: replyMessage,
          quickReply: {
            items: [
              { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
              { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
              { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
              { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
              { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } },
            ]
          }
        });
        continue;
      }

      // 通常モード（汎用）
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
      await reply(event.replyToken, { type: "text", text: replyMessage });
    }
  }

  res.sendStatus(200);
});

// LINEへの返信関数
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

// 通常Push
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

// QuickReply付きPush
const pushMessageWithQuickReply = async (to, message) => {
  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to,
      messages: [
        {
          type: "text",
          text: message,
          quickReply: {
            items: [
              { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
              { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
              { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
              { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
              { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } },
            ]
          }
        }
      ]
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
