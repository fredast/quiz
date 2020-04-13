
var gameContent;
var answerMap;
var users = [];
var usersInLobby;

// var displayedUsers;
var unsubscribe = function() {};

var currentConfig;
var previousConfig;

document.addEventListener('DOMContentLoaded', function() {
  authAdmin(init);
});

function init() {
  var db = firebase.firestore();

  db.collection("games").doc("game1").get().then(function(doc) {
    gameContent = JSON.parse(doc.data().content);
    answerMap = [];
    gameContent.questions.forEach(question => answerMap[question.id] = question.answer);
  });

  db.collection("users").onSnapshot(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      users[doc.id] = doc.data();
    });
  });

  db.collection("configs").doc("global").onSnapshot(function(doc) {
    var config = doc.data();
    previousConfig = currentConfig;
    currentConfig = config;
    switch(config.type) {
      case "LOBBY":
        showLobby();
        break;
      case "WAIT":
        break;
      case "QUESTION":
        showQuestion(config);
        break;
      case "REVIEW":
        showReview(config);
        break;
      case "LEADERBOARD":
        showLeaderboard(config);
        break;
      case "TITLE":
        showTitle(config);
        break;
      default:
        console.log("Unsupported config: " + config.type);
    }
  });
}

function showLobby() {
  clearUI();
  $("body").addClass("lobby-background");

  usersInLobby = [];

  firebase.firestore().collection("users").onSnapshot(function(querySnapshot) {
    querySnapshot.docChanges().forEach(function(change) {
      var lobbyUser = change.doc.data();
      if (change.type === "added" && !usersInLobby.includes(lobbyUser.userId)) {
        addLobbyUser(change.doc.data());
        usersInLobby.push(lobbyUser.userId);
      }
    });
  });

  $("#lobby-block").show();
}

function addLobbyUser(lobbyUser) {
  var $lobbyUserBlock = $("#templates .lobby-user-block").clone();
  $(".lobby-user-name", $lobbyUserBlock).text(lobbyUser.name);
  $lobbyUserBlock.appendTo("#lobby-users-container");
}

function showQuestion(config) {
  clearUI();

  showQuestionContent(config);

  unsubscribe();
  populatePendingAnswers();
  // displayedUsers = []
  unsubscribe = firebase.firestore().collection("answers")
    .where("questionId", "==", config.questionId)
    .onSnapshot(function(snapshot) {
      var newAnswers = [];
      snapshot.docChanges().forEach(function(change) {
        if (change.type === "added") {
          newAnswers.push(change.doc.data());
        }
      });
      showNewAnswers(newAnswers);
    });

  $("#left-panel").show();
  $("#right-panel").show();
  $("#question-header-block").show();
  $("#question-block").show();
  $("#answers-block").show();
  $("#timer-block").show();
  $("#timer-icon-block").show();
  $("#live-answers-table-block").show();
}

function populatePendingAnswers() {
  Object.values(users).sort((a, b) => a.name > b.name ? 1 : -1).forEach(user => {
    var $liveAnswerBlock = $("#templates .live-answer").clone();
    $(".live-answer-username", $liveAnswerBlock).text(users[user.userId].name);
    $liveAnswerBlock.attr("data-user-id", user.userId);
    $liveAnswerBlock.appendTo("#pending-answers-container");
  });
}

function showNewAnswers(newAnswers) {
  newAnswers.sort(sortTimestamp).forEach(function(answer) {
    $("#pending-answers-container [data-user-id='" + answer.userId + "']")
      .detach()
      .appendTo("#live-answers-container");
    // if (displayedUsers.includes(answer.userId)) {
    //   return;
    // }
    // displayedUsers.push(answer.userId);
    // var $liveAnswerBlock = $("#templates .live-answer").clone();
    // $(".live-answer-username", $liveAnswerBlock).text(users[answer.userId].name);
    // $liveAnswerBlock.appendTo("#live-answers-container");
  });
}

function showReview(config) {
  var questionId = config.questionId;
  var leaderboardCutoffId = config.leaderboardCutoffId;

  if (!previousConfig || previousConfig.type != "REVIEW" || previousConfig.questionId != questionId) {
    clearUI();
    showQuestionContent(config);
  }
  $(".answer-count").empty();

  if (config.showAnswer) {
    var answer = gameContent.questions.filter(question => question.id === questionId)[0].answer;
    selectAnswer(questionId, answer);
  } else {
    $(".answer-selected").removeClass("answer-selected");
  }

  $("#leaderboard-table").addClass("leaderboard-table-review");
  $("#leaderboard-table").removeClass("leaderboard-table-leaderboard");
  refreshLeaderboardTable(config);

  $("#left-panel").show();
  $("#right-panel").show();
  $("#question-header-block").show();
  $("#question-block").show();
  $("#answers-block").show();
}

function showLeaderboard(config) {
  clearUI();
  $("body").addClass("leaderboard-background");
  showScoresInTable(false);

  $("#leaderboard-table").addClass("leaderboard-table-leaderboard");
  $("#leaderboard-table").removeClass("leaderboard-table-review");
  refreshLeaderboardTable(config);

  $("#right-panel").show();
}

function refreshLeaderboardTable(config) {
  if (previousConfig
      && previousConfig.type === config.type
      && previousConfig.leaderboardFirstId === config.leaderboardFirstId
      && previousConfig.leaderboardLastId === config.leaderboardLastId) {
    showScoresInTable(config.showScores);
    $("#leaderboard-block").show();
    return;
  }

  firebase.firestore().collection("answers")
      .where("questionId", ">=", config.leaderboardFirstId)
      .where("questionId", "<=", config.leaderboardLastId)
      .get()
      .then(function(querySnapshot) {
        var answers = [];
        querySnapshot.forEach(doc => answers.push(doc.data()));
        computeLeaderboard(answers, config);

        showScoresInTable(config.showScores);
        $("#leaderboard-block").show();
      });
}

function computeLeaderboard(answers, config) {
  var scoresMap = [];
  Object.values(users).forEach(user => scoresMap[user.userId] = {
    userId: user.userId,
    name: user.name,
    score: 0,
    answerToLastQuestion: null,
    goodAnswerLastQuestion: false,
    answers: []
  });

  answers.sort(sortTimestamp).forEach(answer => processAnswer(answer, scoresMap[answer.userId], config.leaderboardLastId));

  var rankedUsers = Object.values(scoresMap).sort((a, b) => b.score - a.score);
  $("#leaderboard-table tbody").empty();
  var rank = 1;
  rankedUsers.forEach(userScore => {
    var $leaderboardRowBlock = $("#templates .leaderboard-row").clone();
    $(".leaderboard-row-rank", $leaderboardRowBlock).text(rank);
    $(".leaderboard-row-name", $leaderboardRowBlock).text(userScore.name);
    $(".leaderboard-row-score", $leaderboardRowBlock).text(userScore.score);
    if (userScore.goodAnswerLastQuestion) {
      $leaderboardRowBlock.addClass("good-answer-last-question");
    }
    $leaderboardRowBlock.appendTo("#leaderboard-rows-container");
    rank += 1;
  });

  // Show answer count under each answer.
  if (config.showAnswer) {
    var answerCounts = {};
    Object.values(scoresMap).forEach(userScore => {
      if (userScore.answerToLastQuestion) {
        if (answerCounts[userScore.answerToLastQuestion]) {
          answerCounts[userScore.answerToLastQuestion] += 1;
        } else {
          answerCounts[userScore.answerToLastQuestion] = 1;
        }
      }
    });

    $("#answers-container .answer-block").each((i, answerBlock) => {
      var answerId = $(answerBlock).attr("data-answer-id");
      $(".answer-count", answerBlock).text(answerCounts[answerId] ? answerCounts[answerId] : 0);
    });
  }
}

function processAnswer(answer, userScore, leaderboardLastId) {
  if (userScore.answers.some(otherAnswer => otherAnswer.questionId === answer.questionId)) {
    return;
  }
  if (answer.answer === answerMap[answer.questionId]) {
    userScore.score += 6 + Math.floor(Math.max(0, Math.min(4, (answer.answerTimeout * 5 - 1) / answer.questionTimeout)));
    if (answer.questionId === leaderboardLastId) {
      userScore.goodAnswerLastQuestion = true;
    }
  }
  if (answer.questionId === leaderboardLastId) {
    userScore.answerToLastQuestion = answer.answer;
  }
  userScore.answers.push(answer);
}

function showScoresInTable(showScores) {
  if (showScores) {
    $("#leaderboard-table").addClass("show-scores");
  } else {
    $("#leaderboard-table").removeClass("show-scores");
  }
}
