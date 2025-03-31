const { reply } = require("../utils/replyHelper");

const route = async (event, userMessage, userId, userContext) => {
  if (userContext[userId] !== "mini") return false;

  try {
    // 仮の簡易ロジック（ステップ1〜3の進行管理）
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
      default:
        nextQuestion = "ありがとうございました！診断は以上です。必要であれば改善のアドバイスもできますよ！";
        nextStep = 1; // リセット
        break;
    }

    userContext[`step_${userId}`] = nextStep;

    await reply(event.replyToken, {
      type: "text",
      text: nextQuestion,
    });

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
