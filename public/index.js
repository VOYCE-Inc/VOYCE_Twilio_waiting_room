let room;
let voyce_token;
let interpreter_token;
let requestId;
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

const generatorInterpreterToken = async (identity) => {
  const response = await fetch(`/token?identity=${identity}`);
  const jsonResponse = await response.json();
  interpreter_token = jsonResponse.token;
}

// when a participant disconnects, remove their video and audio from the DOM.
const onParticipantDisconnected = (participant) => {
  const participantDiv = document.getElementById(participant.sid);
  participantDiv.parentNode.removeChild(participantDiv);
};

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
};

const toggleButtons = () => {
  document.getElementById("leave-button").classList.toggle("hidden");
  document.getElementById("join-button").classList.toggle("hidden");
};


const findInterpter = async () => {
  if(interpreter_token == "" || interpreter_token == null){
    alert("please join room first");
    return;
  }
  const response = await fetch("/voyce_token");
  const jsonResponse = await response.json();
  voyce_token = jsonResponse.voyce_token;
  var postData = {
    "LanguageId": 44,// Spanish
    "SpecialtyOptionCodeId": 1,
    "VideoOptionCodeId": 1,
    "GenderOptionCodeId": 1,
    "Note": "Test Note",
    "ReferenceId": "",
    "isVideo": true,
    "VideoInfo": {
      "VideoToken": interpreter_token,
      "RoomName": "telemedicineAppointment"
    }
  }
  $.ajax({
    type: "POST",
    url: "https://www.voyceglobal.com/APITwilio/Request/New",
    headers: {
        'VOYCEToken':voyce_token
    },
    data: postData,
    success: function(result){
      if(result.Successful){
        //will get a request
        requestId = result.RequestId;
        statusPulling();
      }else{
        alert(result.Reason)
      }
    },
    dataType: "json"
  });
}

const statusPulling = () =>{

  $.ajax({
    type: "GET",
    url: `https://www.voyceglobal.com/APITwilio/Request/Status?RequestId=${requestId}`,
    headers: {
        'VOYCEToken':voyce_token
    },
    success: function(result){
      if(result.Successful){
        // update status
        // update estimation time
        $("#request_status").show();
        $("#request_status").html("Request Status: "+result.Status);
        $("#reqeust_estimation_time").show();
        $("#reqeust_estimation_time").html(result.EstimationTimeString);
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

const fnishRequest = (requestId) =>{// this call notice voyce that interpreter already leave!
  $.ajax({
    type: "POST",
    url: `https://www.voyceglobal.com/APITwilio/Request/Finish?RequestId=${requestId}`,
    headers: {
        'VOYCEToken':voyce_token
    },
    data: postData,
    success: function(result){
      if(result.Successfl){
        alert("request finished")
      }else{
        alert(result.Reason);
      }
    },
    dataType: "json"
  });
}

const toggleMuteButtons = () => {
    document.getElementById("Mute-button").classList.toggle("hidden");
    document.getElementById("Unmute-button").classList.toggle("hidden");
};

const togglePauseButtons = () => {
    document.getElementById("Pause-button").classList.toggle("hidden");
    document.getElementById("Unpause-button").classList.toggle("hidden");
};

const mute = () => {
    var localParticipant = room.localParticipant;
    localParticipant.audioTracks.forEach(function (audioTrack) {
        audioTrack.track.disable();
    });
    toggleMuteButtons();
}

const unmute = () => {
    var localParticipant = room.localParticipant;
    localParticipant.audioTracks.forEach(function (audioTrack) {
        audioTrack.track.enable();
    });
    toggleMuteButtons();

}


const pause = () => {
    var localParticipant = room.localParticipant;
    localParticipant.videoTracks.forEach(function (videoTrack) {
        videoTrack.track.disable();
    });
    togglePauseButtons();
}

const unpause = () => {
    var localParticipant = room.localParticipant;
    localParticipant.videoTracks.forEach(function (videoTrack) {
        videoTrack.track.enable();
    });
    togglePauseButtons();
}
