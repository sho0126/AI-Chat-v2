const fs = require("fs");
const axios = require("axios");
const { reply } = require("../utils/replyHelper");

// クイックリプライ定義（共通で使う）
const quickReplyItems = [
  { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
  { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
  { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
  { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
  { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } }
];

const route = async (event, userMessage, userId, userContext) => {
  try {
    const context = userContext[userId];
    if (context?.mode !== "hojokin" || !context.source) return false;

    if (!fs.existsSync(context.source)) {
      await reply(event.replyToken, {
        type: "text",
        text: "補助金の資料が見つかりませんでした。"
      });
      return true;
    }

    const hojokinText = fs.readFileSync(context.source, "utf8");

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
  } catch (err) {
    console.error("hojokinInfo error:", err);
    await reply(event.replyToken, {
      type: "text",
      text: "補助金の回答中にエラーが発生しました。"
    });
    return true;
  }
};

module.exports = { route };
