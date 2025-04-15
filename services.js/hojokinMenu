const fs = require("fs");
const { reply, pushMessage } = require("../utils/replyHelper");

// クイックリプライ定義（毎回表示）
const quickReplyItems = [
  { type: "action", action: { type: "message", label: "よくある質問", text: "よくある質問" } },
  { type: "action", action: { type: "message", label: "申請の流れ", text: "申請の流れ" } },
  { type: "action", action: { type: "message", label: "対象経費", text: "対象経費" } },
  { type: "action", action: { type: "message", label: "補助率と上限額", text: "補助率と上限額" } },
  { type: "action", action: { type: "message", label: "補助金相談を終了する", text: "補助金相談を終了する" } }
];

// 補助金カルーセルUI
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

// QuickReply付きPush送信
const pushMessageWithQuickReply = async (to, message) => {
  await pushMessage(to, {
    type: "text",
    text: message,
    quickReply: { items: quickReplyItems }
  });
};

// ルーティング関数（index.jsから呼ばれる）
const route = async (event, userMessage, userId, userContext) => {
  try {
    // ① 補助金メニューの起動（カルーセル表示）
    if (userMessage === "補助金メニュー") {
      userContext[userId] = { mode: "hojokin" };
      await reply(event.replyToken, getHojokinCarousel());
      return true;
    }

    // ② 補助金を選択した場合 → .txtを記憶
    if (userMessage === "[小規模事業者持続化補助金]") {
      userContext[userId] = {
        mode: "hojokin",
        source: "/etc/secrets/hojokin_shokibo.txt"
      };
      await pushMessageWithQuickReply(userId, "小規模事業者持続化補助金を選択しました。ご質問をどうぞ！");
      return true;
    }

    if (userMessage === "[ものづくり補助金]") {
      userContext[userId] = {
        mode: "hojokin",
        source: "/etc/secrets/hojokin_monozukuri.txt"
      };
      await pushMessageWithQuickReply(userId, "ものづくり補助金を選択しました。ご質問をどうぞ！");
      return true;
    }

    // ③ 補助金相談の終了
    if (userMessage === "補助金相談を終了する") {
      delete userContext[userId];
      await pushMessage(userId, {
        type: "text",
        text: "補助金相談モードを終了しました。メニューから再度お選びください。"
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error("hojokinMenu error:", err);
    await reply(event.replyToken, {
      type: "text",
      text: "メニュー処理中にエラーが発生しました。"
    });
    return true;
  }
};

module.exports = { route };
