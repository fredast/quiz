
var firstQuestion = true;

document.addEventListener('DOMContentLoaded', function() {
  window.setTimeout(init, 2000);
});

function init() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      loadUser();
    } else {
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      firebase.auth().signInAnonymously().catch(logError);
    }
  });
}

function loadUser() {
  var user = firebase.auth().currentUser;
  var userRef = firebase.firestore().collection("users").doc(user.uid);

  userRef.get().then(function(doc) {
    if (doc.exists) {
      $("#lobby-username").text(doc.data().name);
      loadGame();
    } else {
      clearUI();
      $("#username-input-block").show();
    }
  });
}

function submitUsername() {
  var user = firebase.auth().currentUser;
  var userRef = firebase.firestore().collection("users").doc(user.uid);
  var userName = $("#username-input").val();

  $("#lobby-username").text(userName);
  $("#username-input").prop("disabled", true);
  $("#username-input-block button").prop("disabled", true);

  userRef.set({
    userId: user.uid,
    name: userName
  })
  .then(loadGame)
  .catch(logError);
}

function loadGame() {
  var configRef = firebase.firestore().collection("configs").doc("global");

  configRef.onSnapshot(function(doc) {
    var config = doc.data();
    switch(config.type) {
      case "LOBBY":
        showLobby();
        break;
      case "QUESTION":
        showQuestion(config);
        break;
      case "TITLE":
        showTitle(config);
        break;
      default:
        showWaitPage();
    }
  });
}

function showLobby() {
  clearUI();
  $("body").addClass("lobby-background");
  $("#lobby-block").show();
}

function showWaitPage() {
  clearUI();

  showTitleBlock("Patientez...", "simpson-wait.jpeg");
}

function showQuestion(config) {
  clearUI();

  showQuestionContent(config);

  $("#answers-block").addClass("question-unanswered");
  $(".answer-background").click(function(event) {
    $answerBlock = $(event.target).closest(".answer-block");
    var questionId = parseInt($answerBlock.attr("data-question-id"));
    var answerId = $answerBlock.attr("data-answer-id");
    selectAndSaveAnswer(answerId, config);
  });

  if (firstQuestion) {
    firstQuestion = false;
    var user = firebase.auth().currentUser;

    firebase.firestore().collection("answers")
      .where("userId", "==", user.uid)
      .where("questionId", "==", config.questionId)
      .get()
      .then(function(querySnapshot) {
        if(!querySnapshot.empty) {
          var answer = querySnapshot.docs[0].data();
          selectAnswer(answer.questionId, answer.answer);
        }
      });
  }

  $("#question-header-block").show();
  $("#question-block").show();
  $("#answers-block").show();
  $("#timer-block").show();
  $("#timer-icon-block").show();
}

function selectAndSaveAnswer(answerId, config) {
  selectAnswer(config.questionId, answerId);

  var user = firebase.auth().currentUser;
  var content = JSON.parse(config.content);

  firebase.firestore().collection("answers").add({
    userId: user.uid,
    questionId: config.questionId,
    answer: answerId,
    questionTimeout: content.timeout,
    answerTimeout: getCurrentTimeout(),
    submissionTime: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(function() {
    console.log("Answer saved!");
  });
}
