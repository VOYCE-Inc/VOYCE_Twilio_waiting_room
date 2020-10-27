let room;
let interpreter_token;
let requestId;
let preInviteToken;
let url;
let child;
var timer;
const joinRoom = async (event, identity) => {
  const response = await fetch(`/token?identity=${identity}`);
  const jsonResponse = await response.json();
  const token = jsonResponse.token;
  const Video = Twilio.Video;
  const localTracks = await Video.createLocalTracks({
    audio: true,
    video: { width: 640 },
  });
  try {
    room = await Video.connect(token, {
      name: "telemedicineAppointment",
      tracks: localTracks,
    });
  } catch (error) {
    console.log(error);
  }

  // display your own video element in DOM
  // localParticipants are handled differently
  // you don't need to fetch your own video/audio streams from the server
  const localMediaContainer = document.getElementById("local-media-container");
  localTracks.forEach((localTrack) => {
    localMediaContainer.appendChild(localTrack.attach());
  });

  // display video/audio of other participants who have already joined
  room.participants.forEach(onParticipantConnected);

  // subscribe to new participant joining event so we can display their video/audio
  room.on("participantConnected", onParticipantConnected);

  room.on("participantDisconnected", onParticipantDisconnected);

  toggleButtons();
  await generatorInterpreterToken("interpreter");
  event.preventDefault();
};

// when a participant disconnects, remove their video and audio from the DOM.
const onParticipantDisconnected = (participant) => {
  const participantDiv = document.getElementById(participant.sid);
  participantDiv.parentNode.removeChild(participantDiv);
};

// when a participant connected, add their tracks
const onParticipantConnected = (participant) => {
  const participantDiv = document.createElement("div");
  participantDiv.id = participant.sid;

  // when a remote participant joins, add their audio and video to the DOM
  const trackSubscribed = (track) => {
    participantDiv.appendChild(track.attach());
  };
  participant.on("trackSubscribed", trackSubscribed);

  participant.tracks.forEach((publication) => {
    if (publication.isSubscribed) {
      trackSubscribed(publication.track);
    }
  });

  document.body.appendChild(participantDiv);

  const trackUnsubscribed = (track) => {
    track.detach().forEach((element) => element.remove());
  };

  participant.on("trackUnsubscribed", trackUnsubscribed);
};

//leave the room
const onLeaveButtonClick = (event) => {
  room.localParticipant.tracks.forEach((publication) => {
    const track = publication.track;
    // stop releases the media element from the browser control
    // which is useful to turn off the camera light, etc.
    track.stop();
    const elements = track.detach();
    elements.forEach((element) => element.remove());
  });
  room.disconnect();

  toggleButtons();

  if(requestId != null && requestId != ""){
    finishRequest();
  }
};

//hide leave/join buttons
const toggleButtons = () => {
  document.getElementById("leave-button").classList.toggle("hidden");
  document.getElementById("join-button").classList.toggle("hidden");
};

//hide/show voyce interpretation buttons
const toggleFindButtons = () => {
  document.getElementById("find-interpreter-button").classList.toggle("hidden");
  document.getElementById("finish-button").classList.toggle("hidden");
};

//Generate a twilio video token for the interpreter and send to VOYCE's server
const generatorInterpreterToken = async (identity) => {
  const response = await fetch(`/token?identity=${identity}`);
  const jsonResponse = await response.json();
  interpreter_token = jsonResponse.token;
}

//initialize interpretation service using Voyce API
const findInterpter = async () => {
  if(interpreter_token == "" || interpreter_token == null){
    //If the room doesn't exist, do not join.
    alert("please join room first");
    return;
  }
  //Post data including the information of the interpretation service and twilio related info
  var postData = {
    "Note": "Test Note",
    "ReferenceId": "",
    "isVideo": true,
    "VideoInfo": {
      "VideoToken": interpreter_token,
      "RoomName": "telemedicineAppointment"
    }
  }
  //Create ajax API call to Voyce Server
  $.ajax({
    type: "POST",
    url: "/Request/InviteWithoutLangauge",
    data: JSON.stringify(postData),
    headers: {
        'Content-Type': 'application/json'
    },
    success: function(result){
      if(result.Successful){
        //VOYCE response data including PreInviteToken, URL.
        preInviteToken = result.PreInviteToken;
        url = result.URL;
        //Open the URL using a new window.
        child = window.open(url, '_blank', 'location=yes,height=570,width=1024,scrollbars=yes,status=yes');
        //hide/show voyce interpretation buttons
        toggleFindButtons();
        //Create a thread to pull status information about the service just sent.
        statusPulling();
      }else{
        alert(result.Reason)
      }
    },
    dataType: "json"
  });
}

//Create a thread to pull status information about the service just sent.
const statusPulling = () =>{
  var postData = {
    "Token":preInviteToken
  }
  $.ajax({
    type: "POST",
    url: `/Request/StatusByPreInviteToken`,
    data: JSON.stringify(postData),
    headers: {
        'Content-Type': 'application/json'
    },
    success: function(result){
      if(result.Successful){
        // update status/estimation time
        $("#request_status").show();
        $("#request_status").html("Request Status: "+result.Status);
        $("#reqeust_estimation_time").show();
        $("#reqeust_estimation_time").html(result.EstimationTimeString);
        if(result.StatusCodeId >= 2){
          child.close();
        }
      }
    },
    complete:function(){
      timer = setTimeout(function(){
        statusPulling();
      },2000)
    },
    dataType: "json"
  });
}

//Finish the interpretation service if no longer needed.
const finishRequest = () =>{
  $.ajax({
    type: "POST",
    url: `/Request/FinishByPreInvite/${preInviteToken}`,
    success: function(result){
      if(result.Successful){
        alert("request finished")
        requestId = null;
        clearTimeout(timer);
        timer = null;
        $("#request_status").hide();
        $("#request_status").html("");
        $("#reqeust_estimation_time").hide();
        $("#reqeust_estimation_time").html("");
        toggleFindButtons();
        interpreter_token = null;
      }else{
        alert(result.Reason);
      }
    },
    dataType: "json"
  });
}

//switch mute/unmute button UI
const toggleMuteButtons = () => {
    document.getElementById("Mute-button").classList.toggle("hidden");
    document.getElementById("Unmute-button").classList.toggle("hidden");
};

//switch pause/resume button UI
const togglePauseButtons = () => {
    document.getElementById("Pause-button").classList.toggle("hidden");
    document.getElementById("Unpause-button").classList.toggle("hidden");
};

//mute the microphone
const mute = () => {
    var localParticipant = room.localParticipant;
    localParticipant.audioTracks.forEach(function (audioTrack) {
        audioTrack.track.disable();
    });
    toggleMuteButtons();
}

//unmute the microphone
const unmute = () => {
    var localParticipant = room.localParticipant;
    localParticipant.audioTracks.forEach(function (audioTrack) {
        audioTrack.track.enable();
    });
    toggleMuteButtons();

}

//pause the video camera
const pause = () => {
    var localParticipant = room.localParticipant;
    localParticipant.videoTracks.forEach(function (videoTrack) {
        videoTrack.track.disable();
    });
    togglePauseButtons();
}

//resume the video camera
const unpause = () => {
    var localParticipant = room.localParticipant;
    localParticipant.videoTracks.forEach(function (videoTrack) {
        videoTrack.track.enable();
    });
    togglePauseButtons();
}
