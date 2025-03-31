// /services/hojokinSupport.js
const fs = require("fs");
const axios = require("axios");
const { reply } = require("../utils/replyHelper");

const isHojokinUser = (context) => {
  return typeof context === "string" && context.includes("hojokin");
};

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

const getQuickReplyItems = () => ([
  { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
  { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
  { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
  { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
  { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } },
]);

const handleHojokinMessage = async (event, userContext, userId) => {
  const hojokinText = fs.readFileSync(userContext[userId], "utf8");
  const systemPrompt = "あなたは補助金専門のAIアシスタントです。以下の資料（.txt）のみを参照して回答してください。資料に記載のない内容や判断できないことについては、『わかりません』と正直に答えてください。ネット検索や憶測は禁止です。";

  const messages = [
    { role: "system", content: `${systemPrompt}\n\n【資料】\n${hojokinText}` },
    { role: "user", content: event.message.text },
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
    quickReply: { items: getQuickReplyItems() },
  });
};

module.exports = {
  getHojokinCarousel,
  handleHojokinMessage,
  isHojokinUser,
};
