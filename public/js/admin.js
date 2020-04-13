
var gameContent;
var onTimeout = false;
var questionTimeout;
var configHistory = [];
var titleOptions = [];

document.addEventListener('DOMContentLoaded', function() {
  authAdmin(init);
});

function init() {
  $("#console-container").show();

  var db = firebase.firestore();

  db.collection("games").doc("game1").get().then(function(doc) {
    gameContent = JSON.parse(doc.data().content);
    $(".question-control-block").show();

    gameContent.themes.forEach(theme => {
      $("#title-input").append($('<option>', {
          value: titleOptions.length,
          text: theme.themeName
      }));
      titleOptions.push({
        "text": theme.themeName,
        "image": theme.image
      });
    });
  });

  var configRef = db.collection("configs").doc("global");
  configRef.onSnapshot(function(doc) {
    showConfig(doc.data());
  });

  $('body').keyup(function(e){
    if(e.keyCode == 32) {
      next();
    }
  });
}

function next() {
  getConfig(config => {
    // if(questionTimeout) {
    //   return;
    // }

    switch(config.type) {
      case "WAIT":
        var theme = getQuestionTheme(config.questionId);
        if (config.questionId < theme.lastQuestionId) {
          goToQuestion(config.questionId + 1);
        }
        break;
      case "REVIEW":
        if (!config.showAnswer) {
        //   goToQuestionReview(config.questionId, true, false);
        // } else if (!config.showScores) {
          goToQuestionReview(config.questionId, true, true);
        } else {
          var theme = getQuestionTheme(config.questionId);
          if (config.questionId < theme.lastQuestionId) {
            goToQuestionReview(config.questionId + 1, false, false);
          }
        }
        break;
      }
  });
}

function previous() {
  if (configHistory.length >= 2) {
    setConfig(configHistory[configHistory.length - 2]);
  }
}

function goToLobby() {
  setConfig({
    type: "LOBBY",
    questionId: 0
  });
}

function goToWait(questionId) {
  questionId = questionId ? questionId : getQuestionIdFromInput();

  var theme = getQuestionTheme(questionId);

  setConfig({
    type: "WAIT",
    questionId: questionId,
    themeContent: JSON.stringify(theme)
  });
}

function goToQuestion(questionId) {
  questionId = questionId ? questionId : getQuestionIdFromInput();
  if (!questionId || questionId <= 0) {
    return;
  }

  var questionContent = gameContent.questions.filter(question => question.id == questionId)[0].content;

  var theme = getQuestionTheme(questionId);

  setConfig({
    type: "QUESTION",
    questionId: questionId,
    content: JSON.stringify(questionContent),
    themeContent: JSON.stringify(theme),
    showTimer: true,
    showAnswer: false,
    showScores: false
  });

  questionTimeout = window.setTimeout(() => {
    questionTimeout = null;
    goToWait(questionId);
  }, questionContent.timeout * 1000 + 1000);
}

function goToQuestionReview(questionId, showAnswer, showScores) {
  questionId = questionId ? questionId : getQuestionIdFromInput();
  if (!questionId || questionId <= 0) {
    return;
  }

  var theme = getQuestionTheme(questionId);

  setConfig({
    type: "REVIEW",
    questionId: questionId,
    content: JSON.stringify(gameContent.questions.filter(question => question.id === questionId)[0].content),
    themeContent: JSON.stringify(theme),
    showTimer: false,
    showAnswer: showAnswer,
    showScores: showScores,
    leaderboardFirstId: theme.firstQuestionId,
    leaderboardLastId: showScores ? questionId : questionId - 1
  });
}

function goToLeaderboard() {
  setConfig({
    type: "LEADERBOARD",
    showTimer: false,
    showAnswer: false,
    showScores: false,
    leaderboardFirstId: gameContent.questions[0].id,
    leaderboardLastId: gameContent.questions[gameContent.questions.length - 1].id
  });
}

function goToTitle() {
  var title = titleOptions[$("#title-input").val()];

  setConfig({
    type: "TITLE",
    text: title.text,
    image: title.image
  });
}

function setConfig(config) {
  clearQuestionTimeout();

  var configRef = firebase.firestore().collection("configs").doc("global");

  configRef.set(config)
  .then(function() {
    configHistory.push(config);
  })
  .catch(logError);
}

function getConfig(callback) {
  var configRef = firebase.firestore().collection("configs").doc("global");
  configRef.get().then((doc) => callback(doc.data()));
}

function showConfig(config) {
  var questionText;
  if (config.type === "WAIT" || config.type === "QUESTION" || config.type === "REVIEW") {
    var themeContent = JSON.parse(config.themeContent);
    questionText = themeContent.themeName + " "
        + (config.questionId - themeContent.firstQuestionId + 1) + " / "
        + (themeContent.lastQuestionId - themeContent.firstQuestionId + 1) + " (total: "
        + config.questionId + " / " + gameContent.questions.length + ")";
  }

  if (config.questionId) {
    $("#question-id-input").val(config.questionId.toString());
  }

  $("#next-button").prop("disabled", true);
  if (config.type === "WAIT" || config.type === "REVIEW") {
    var theme = getQuestionTheme(config.questionId);
    if (config.questionId < theme.lastQuestionId) {
      $("#next-button").prop("disabled", false);
    } else if (config.type === "REVIEW" && !config.showAnswer) {
      $("#next-button").prop("disabled", false);
    }
  }
  
  var text;
  switch(config.type) {
    case "LOBBY":
      text = "Accueil";
      break;
    case "WAIT":
      text = questionText + " - Temps écoulé";
      break;
    case "QUESTION":
      text = questionText;
      break;
    case "REVIEW":
      text = "Correction de " + questionText;
      break;
    case "LEADERBOARD":
      text = "Scores";
      break;
    case "TITLE":
      text = "Titre: " + config.text;
      break;
  }
  $("#config-display").text(text);
}

function clearQuestionTimeout() {
  window.clearTimeout(questionTimeout);
  questionTimeout = null;
}

function getQuestionIdFromInput() {
  return parseInt($("#question-id-input").val());
}

function getQuestionTheme(questionId) {
  for (var theme of gameContent.themes) {
    if (questionId >= theme.firstQuestionId && questionId <= theme.lastQuestionId) {
      return theme;
    }
  }
}

