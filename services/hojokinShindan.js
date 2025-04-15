const { reply } = require("../utils/replyHelper");

const route = async (event, userMessage, userId, userContext) => {
  const ctx = userContext[userId];

  if (!ctx || ctx.mode !== "hojokin") return false;

  // 診断スタート
  if (userMessage === "補助金診断") {
    userContext[userId] = {
      mode: "hojokin",
      diagnosis: { step: 1, answers: {} }
    };

    await reply(event.replyToken, {
      type: "text",
      text: "まず、あなたの事業の規模を教えてください！",
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "小規模事業者", text: "小規模事業者" } },
          { type: "action", action: { type: "message", label: "中堅以上", text: "中堅以上" } }
        ]
      }
    });

    return true;
  }

  // 診断中の処理
  if (ctx.diagnosis) {
    const step = ctx.diagnosis.step;
    const answers = ctx.diagnosis.answers;

    if (step === 1) {
      answers.size = userMessage;
      ctx.diagnosis.step = 2;

      await reply(event.replyToken, {
        type: "text",
        text: "どんなことに取り組みたいですか？",
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "販路拡大", text: "販路拡大" } },
            { type: "action", action: { type: "message", label: "IT導入", text: "IT導入" } },
            { type: "action", action: { type: "message", label: "設備投資", text: "設備投資" } }
          ]
        }
      });

      return true;
    }

    if (step === 2) {
      answers.goal = userMessage;
      ctx.diagnosis.step = 3;

      await reply(event.replyToken, {
        type: "text",
        text: "業種を教えてください！",
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "製造業", text: "製造業" } },
            { type: "action", action: { type: "message", label: "サービス業", text: "サービス業" } },
            { type: "action", action: { type: "message", label: "その他", text: "その他" } }
          ]
        }
      });

      return true;
    }

    if (step === 3) {
      answers.industry = userMessage;

      // 診断完了 → 補助金カルーセル表示（判定ロジック）
      const columns = [];

      if (answers.size === "小規模事業者" && answers.goal === "販路拡大") {
        columns.push({
          thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          title: "小規模事業者持続化補助金",
          text: "販路開拓や設備導入の補助金",
          actions: [
            { type: "message", label: "この補助金を選ぶ", text: "[小規模事業者持続化補助金]" }
          ]
        });
      }

      if (answers.goal === "IT導入") {
        columns.push({
          thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          title: "IT導入補助金",
          text: "ITツール導入で生産性向上を支援！",
          actions: [
            { type: "message", label: "この補助金を選ぶ", text: "[IT導入補助金]" }
          ]
        });
      }

      if (answers.goal === "設備投資" && answers.industry === "製造業") {
        columns.push({
          thumbnailImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          title: "ものづくり補助金",
          text: "革新的な製造サービス開発を支援！",
          actions: [
            { type: "message", label: "この補助金を選ぶ", text: "[ものづくり補助金]" }
          ]
        });
      }

      await reply(event.replyToken, {
        type: "template",
        altText: "診断結果：おすすめ補助金",
        template: {
          type: "carousel",
          columns: columns.length > 0 ? columns : [{
            title: "該当する補助金が見つかりませんでした",
            text: "条件を変えて再度お試しください",
            actions: []
          }]
        }
      });

      delete userContext[userId]; // 診断終了＝context初期化

      return true;
    }
  }

  return false;
};

module.exports = { route };
