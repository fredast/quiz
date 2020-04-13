
var timer;
var timerInterval;

function showTitle(config) {
  clearUI();

  showTitleBlock(config.text, config.image);
}

function showTitleBlock(text, image) {
  $("#title-text").html(text);
  $("#title-image").removeAttr('src');
  $("#title-image").attr("src", "/img/" + image);
  $("#title-image-block").show();
  $("#title-block").show();
}

function showQuestionContent(config) {
  var content = JSON.parse(config.content);
  var themeContent = JSON.parse(config.themeContent);

  $("#question-text").html(content.text);
  $("#question-theme").text(themeContent.themeName);
  $("#question-id").text(config.questionId - themeContent.firstQuestionId + 1);
  $("#question-count").text(themeContent.lastQuestionId - themeContent.firstQuestionId + 1);
  if (content.image) {
    $("#question-image").removeAttr('src');
    $("#question-image").attr("src", "/img/" + content.image);
    $("#question-image").show();
  } else {
    $("#question-image").hide();
  }

  var maxAnswerLength = 0;
  content.answers.forEach(function(answerContent) {
    maxAnswerLength = Math.max(maxAnswerLength, answerContent.text.length);
  });

  content.answers.forEach(function(answerContent) {
    var $answerBlock = $("#templates .answer-block").clone();
    $answerBlock.attr("data-question-id", config.questionId);
    $answerBlock.attr("data-answer-id", answerContent.id);
    $(".answer-text", $answerBlock).html(answerContent.text);
    if (maxAnswerLength > 40) {
      $(".answer-text", $answerBlock).addClass("h5");
    } else if (maxAnswerLength > 20) {
      $(".answer-text", $answerBlock).addClass("h4");
    } else {
      $(".answer-text", $answerBlock).addClass("h3");
    }
    $answerBlock.appendTo("#answers-container");
  });

  if (config.showTimer) {
    if (timerInterval) {
      window.clearInterval(timerInterval);
    }
    timer = content.timeout;
    $("#timer").text(timer);
    timerInterval = window.setInterval(() => {
      timer -= 1;
      if (timer <= 0) {
        window.clearInterval(timerInterval);
      }
      $("#timer").text(timer);
    }, 1000);
  }
}

function selectAnswer(questionId, answerId) {
  $answerBlock = $("[data-question-id='" + questionId + "'][data-answer-id='" + answerId + "']" );
  if ($answerBlock.length) {
    $answerBlock.addClass("answer-selected");
    $("#answers-block").removeClass("question-unanswered");
    $(".answer-background").off();
  }
}

function getCurrentTimeout() {
  return timer;
}

function clearUI() {
  $(".hide-on-refresh").hide();
  $(".empty-on-refresh").empty();
  $(".lobby-background").removeClass("lobby-background");
  $(".leaderboard-background").removeClass("leaderboard-background");
}

function logError(error) {
  console.log(error);
}

function sortTimestamp(a, b) {
  var aTime = a.submissionTime;
  var bTime = b.submissionTime;
  if (aTime.seconds != bTime.seconds) {
    return aTime.seconds - bTime.seconds;
  } else {
    return aTime.nanoseconds - bTime.nanoseconds;
  }
}

// Auth

function authAdmin(callback) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user && !user.isAnonymous) {
      callback();
      return;
    }
    firebase.auth().signOut();
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    var ui = new firebaseui.auth.AuthUI(firebase.auth());
    var uiConfig = {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
      ],
      callbacks: {
        signInSuccessWithAuthResult: function(authResult, redirectUrl) {
          init();
          return false;
        },
      }
    };
    ui.start('#firebaseui-auth-container', uiConfig);
  });
}

// Cache

var IMAGES_TO_PRELOAD = [
  "carte.png",
  "drapeau.png",
  "influenceuse-tiktok.jpg",
  "insolite.jpg",
  "logo.png",
  "simpson-art.jpeg",
  "simpson-chocolat.jpg",
  "simpson-divers.png",
  "simpson-divertissement.png",
  "simpson-histoire.jpg",
  "simpson-leaderboard.jpg",
  "simpson-lobby.jpeg",
  "simpson-logique.jpeg",
  "simpson-musique.jpg",
  "simpson-science.jpg",
  "simpson-sport.jpg",
  "simpson-technology.jpg",
  "simpson-wait.jpeg",
  "tableau.jpg",
  "windows.png"
];

var preloadedImages = [];

window.addEventListener('load', function() {
  window.setTimeout(preloadImages, 10000);
});

function preloadImages() {
  for (var fileName of IMAGES_TO_PRELOAD) {
    var img = new Image();
    img.src = "/img/" + fileName;
    preloadedImages.push(img);
  }
}
