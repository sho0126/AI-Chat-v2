const fs = require("fs");
const axios = require("axios");
const { reply, pushMessage } = require("../utils/replyHelper");

// クイックリプライ（補助金モード用）
const quickReplyItems = [
  { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
  { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
  { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
  { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
  { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } }
];

// カルーセルテンプレート
const getHojokinCarousel = () => ({
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
          { type: "message", label: "この補助金を選ぶ", text: "[小規模事業者持続化補助金]" }
        ]
      },
      {
        thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        title: "ものづくり補助金",
        text: "革新的サービス開発を支援",
        actions: [
          { type: "message", label: "この補助金を選ぶ", text: "[ものづくり補助金]" }
        ]
      }
    ]
  }
});

// QuickReply付きPush送信関数
const pushMessageWithQuickReply = async (to, message) => {
  await pushMessage(to, {
    type: "text",
    text: message,
    quickReply: { items: quickReplyItems }
  });
};

// メイン処理ルーティング関数
const route = async (event, userMessage, userId, userContext) => {
  try {
    // メニュー表示（カルーセル）
    if (userMessage === "補助金メニュー") {
      delete userContext[userId]; // モード初期化
      await reply(event.replyToken, getHojokinCarousel());
      return true;
    }

    // 補助金選択
    if (userMessage === "[小規模事業者持続化補助金]") {
      userContext[userId] = "/etc/secrets/hojokin_shokibo.txt";
      await pushMessageWithQuickReply(userId, "小規模事業者持続化補助金を選択しました。ご質問をどうぞ！");
      return true;
    }

    if (userMessage === "[ものづくり補助金]") {
      userContext[userId] = "/etc/secrets/hojokin_monozukuri.txt";
      await pushMessageWithQuickReply(userId, "ものづくり補助金を選択しました。ご質問をどうぞ！");
      return true;
    }

    // 補助金モード終了
    if (userMessage === "補助金相談を終了する") {
      delete userContext[userId];
      await pushMessage(userId, {
        type: "text",
        text: "補助金相談モードを終了しました。メニューから再度お選びください。"
      });
      return true;
    }

    // 補助金モード中の質問対応
    if (userContext[userId]?.includes("hojokin")) {
      const hojokinText = fs.readFileSync(userContext[userId], "utf8");

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
        text: replyMessage,
        quickReply: { items: quickReplyItems }
      });

      return true;
    }

    return false;

  } catch (err) {
    console.error("hojokinSupport error:", err);
    await reply(event.replyToken, {
      type: "text",
      text: "補助金相談中にエラーが発生しました。"
    });
    return true;
  }
};

module.exports = { route };
