const axios = require("axios");
require("dotenv").config();

// LINEへの返信
const reply = async (replyToken, message) => {
  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken,
        messages: Array.isArray(message) ? message : [message]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error("reply error:", err.response?.data || err.message);
  }
};

// ユーザーへのPush通知
const pushMessage = async (to, message) => {
  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to,
        messages: Array.isArray(message) ? message : [message]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error("pushMessage error:", err.response?.data || err.message);
  }
};

module.exports = {
  reply,
  pushMessage
};
