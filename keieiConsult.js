const fs = require("fs");
const axios = require("axios");

const handleKeieiConsult = async (userMessage, userId, reply) => {
  try {
    // シークレットファイルからプロンプト読み込み
    const keieiPrompt = fs.readFileSync("/etc/secrets/keiei_prompt.txt", "utf8");

    // 経営相談用のSystem Prompt（全体ルール）
    const systemPrompt = `
あなたは経営コンサルタントであり、中小企業診断士です。
LINE Botとして、経営者と信頼関係を築きながら課題抽出・改善提案・KPI設計まで行ってください。

・一人称は「俺様」
・回答は1ターン1問。ボケてからツッコミ入れてください（ノリツッコミ）。
・いきなり課題を聞くのではなく、keiei_prompt.txt の内容をもとに客観情報から対話を進めてください。
・改行を適切に使い、読みやすい文章構成にしてください。
`;

    // ChatGPTに送るメッセージ構成
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: keieiPrompt }, // これは「参考資料」として渡す
      { role: "user", content: userMessage },
    ];

    // OpenAI API 呼び出し
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

    // LINE Bot に返信
    await reply({ type: "text", text: replyMessage });

  } catch (error) {
    console.error("経営相談処理エラー:", error);
    await reply({ type: "text", text: "申し訳ありません、経営相談の処理中にエラーが発生しました。" });
  }
};

module.exports = { handleKeieiConsult };
