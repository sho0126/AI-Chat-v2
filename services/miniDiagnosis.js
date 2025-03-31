const { reply } = require("../utils/replyHelper");
const axios = require("axios");

const route = async (event, userMessage, userId, userContext) => {
  if (userContext[userId] !== "mini") return false;

  try {
    const step = userContext[`step_${userId}`] || 1;
    let nextQuestion = "";
    let nextStep = step;

    switch (step) {
      case 1:
        nextQuestion = "売上に関して、今感じているお悩みや課題はありますか？";
        nextStep = 2;
        break;
      case 2:
        nextQuestion = "その課題はいつ頃から感じていますか？";
        nextStep = 3;
        break;
      case 3:
        nextQuestion = "その背景や原因として思い当たる点はありますか？";
        nextStep = 4;
        break;
      case 4:
        nextQuestion = "理想の状態（目指す姿）を教えてください。";
        nextStep = 5;
        break;
      case 5: {
        // 回答のまとめ
        const summary = `📝 診断まとめ（仮）\n\n` +
          `📌 現在の課題：${userContext[`q1_${userId}`] || "未回答"}\n` +
          `⏱ 発生時期：${userContext[`q2_${userId}`] || "未回答"}\n` +
          `🔍 背景や原因：${userContext[`q3_${userId}`] || "未回答"}\n` +
          `🎯 理想の状態：${userContext[`q4_${userId}`] || "未回答"}\n`;

        await reply(event.replyToken, {
          type: "text",
          text: summary
        });

        // 次の質問へ（確認と改善提案フェーズ）
        await reply(event.replyToken, {
          type: "text",
          text: "この内容をもとに、改善提案をお出ししてもよろしいですか？（はい / いいえ）"
        });

        nextStep = 6;
        break;
      }

      case 6:
        if (userMessage.trim().toLowerCase() === "はい") {
          const prompt = `
あなたは中小企業診断士です。
以下のヒアリング内容をもとに、経営課題に対する改善案を提案してください。

【ヒアリング内容】
課題・悩み：${userContext[`q1_${userId}`] || ""}
発生時期：${userContext[`q2_${userId}`] || ""}
原因・背景：${userContext[`q3_${userId}`] || ""}
理想の状態：${userContext[`q4_${userId}`] || ""}
`;

          const gptResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4",
              messages: [
                { role: "system", content: "あなたは経営コンサルタントです。" },
                { role: "user", content: prompt }
              ]
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
              }
            }
          );

          const gptAnswer = gptResponse.data.choices[0].message.content;

          await reply(event.replyToken, { type: "text", text: gptAnswer });
        } else {
          await reply(event.replyToken, {
            type: "text",
            text: "承知しました。またいつでも相談してくださいね！"
          });
        }

        // リセット
        userContext[`step_${userId}`] = 1;
        return true;

      default:
        nextQuestion = "ありがとうございました！診断は以上です。必要であれば改善のアドバイスもできますよ！";
        nextStep = 1;
        break;
    }

    // ステップ1〜4の回答保存
    if (step >= 1 && step <= 4) {
      userContext[`q${step}_${userId}`] = userMessage;
    }

    userContext[`step_${userId}`] = nextStep;

    if (step < 5) {
      await reply(event.replyToken, {
        type: "text",
        text: nextQuestion
      });
    }

    return true;
  } catch (error) {
    console.error("ミニ診断エラー:", error);
    await reply(event.replyToken, {
      type: "text",
      text: "申し訳ありません、ミニ診断中にエラーが発生しました。",
    });
    return true;
  }
};

module.exports = { route };
