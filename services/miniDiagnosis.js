// /services/miniDiagnosis.js

const fs = require("fs");
const axios = require("axios");

const categorySteps = {
  "売上・販売戦略": [
    "売上に関して、今感じているお悩みや課題はありますか？",
    "その課題が起きている背景や原因として、何か思い当たることはありますか？",
    "過去にその課題に対して何か対策を講じたことはありますか？結果はどうでしたか？",
    "どのような売上の状態が理想的だと感じていますか？",
    "理想に近づけるために、取り組んでみたいことはありますか？"
  ]
  // 他カテゴリも順次追加予定
};

const userSteps = {}; // userId ごとにステップを管理

const handleMiniDiagnosis = async (userId, userMessage, category, reply) => {
  if (!userSteps[userId]) {
    userSteps[userId] = { step: 0, category };
  } else if (userSteps[userId].category !== category) {
    // カテゴリが変わった場合はリセット
    userSteps[userId] = { step: 0, category };
  }

  const currentStep = userSteps[userId].step;
  const steps = categorySteps[category];

  // ステップに応じた質問を送る
  if (currentStep < steps.length) {
    await reply({ type: "text", text: steps[currentStep] });
    userSteps[userId].step++;
  } else {
    await reply({
      type: "text",
      text: "一通りのヒアリングが完了しました。他にも気になる点があれば教えてください！"
    });
    delete userSteps[userId];
  }
};

module.exports = { handleMiniDiagnosis };
