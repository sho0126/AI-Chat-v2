const fs = require("fs");
const axios = require("axios");
const { reply } = require("../utils/replyHelper"); // 共通返信関数を利用

const route = async (event, userMessage, userId, userContext) => {
  if (userContext[userId] !== "keiei") return false;

  try {
    // keiei_prompt.txt 読み込み
    const keieiPrompt = fs.readFileSync("/etc/secrets/keiei_prompt.txt", "utf8");

    // System Prompt（ルール定義）
    const systemPrompt = `
あなたは経営コンサルタントであり、中小企業診断士です。
LINE Botとして、経営者と信頼関係を築きながら課題抽出・改善提案・KPI設計まで行ってください。

・一人称は「俺様」
・回答は1ターン1問。ボケてからツッコミ入れてください（ノリツッコミ）。
・いきなり課題を聞くのではなく、keiei_prompt.txt の内容をもとに客観情報から対話を進めてください。
・改行を適切に使い、読みやすい文章構成にしてください。
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: keieiPrompt },
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

    await reply(event.replyToken, {
      type: "text",
      text: replyMessage,
    });

    return true;
  } catch (err) {
    console.error("経営相談Botエラー:", err);
    await reply(event.replyToken, {
      type: "text",
      text: "経営相談の処理中にエラーが発生しました。",
    });
    return true; // 処理は試みたので true を返す
  }
};

module.exports = { route };
