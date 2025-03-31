const fs = require("fs");
const axios = require("axios");
const { reply, pushMessageWithQuickReply, pushMessage } = require("../utils/replyHelper");

const route = async (event, userMessage, userId, userContext) => {
  // 小規模事業者持続化補助金
  if (userMessage === "[小規模事業者持続化補助金]") {
    userContext[userId] = "/etc/secrets/hojokin_shokibo.txt";
    await pushMessageWithQuickReply(userId, "小規模事業者持続化補助金を選択しました。ご質問をどうぞ！");
    return true;
  }

  // ものづくり補助金
  if (userMessage === "[ものづくり補助金]") {
    userContext[userId] = "/etc/secrets/hojokin_monozukuri.txt";
    await pushMessageWithQuickReply(userId, "ものづくり補助金を選択しました。ご質問をどうぞ！");
    return true;
  }

  // 補助金相談終了
  if (userMessage === "補助金相談を終了する") {
    delete userContext[userId];
    await pushMessage(userId, "補助金相談モードを終了しました。メニューから再度お選びください。");
    return true;
  }

  // 補助金モード中のやりとり
  if (userContext[userId] && typeof userContext[userId] === "string" && userContext[userId].includes("hojokin")) {
    const hojokinText = fs.readFileSync(userContext[userId], "utf8");
    const systemPrompt = "あなたは補助金専門のAIアシスタントです。以下の資料（.txt）のみを参照して回答してください。資料に記載のない内容や判断できないことについては、「わかりません」と正直に答えてください。ネット検索や憶測は禁止です。";

    const messages = [
      { role: "system", content: `${systemPrompt}\n\n【資料】\n${hojokinText}` },
      { role: "user", content: userMessage }
    ];

    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
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
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
          { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
          { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
          { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
          { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } }
        ]
      }
    });

    return true;
  }

  return false; // このモジュールで処理しなかった場合は false を返す
};

module.exports = { route };

