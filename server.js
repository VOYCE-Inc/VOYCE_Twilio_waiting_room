require("dotenv").config();
const http = require("http");
const express = require("express");
const path = require("path");
const app = express();
const https = require('https');

const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const ROOM_NAME = "telemedicineAppointment";

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;
app.use(express.urlencoded({ extended: true }))

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

const patientPath = path.join(__dirname, "./public/patient.html");
app.use("/patient", express.static(patientPath));

const providerPath = path.join(__dirname, "./public/provider.html");
app.use("/provider", express.static(providerPath));

// serving up some fierce CSS lewks
app.use(express.static(__dirname + "/public"));

// suppress missing favicon warning
app.get("/favicon.ico", (req, res) => res.status(204));

app.get("/token", function (request, response) {
  const identity = request.query.identity;

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { ttl: MAX_ALLOWED_SESSION_DURATION }
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities.
  const grant = new VideoGrant({ room: ROOM_NAME });
  token.addGrant(grant);

  // Serialize the token to a JWT string and include it in a JSON response.
  response.send({
    identity: identity,
    token: token.toJwt(),
  });
});

//start an interpreation service API call to VOYCE
app.post('/Request/InviteWithoutLangauge', function (request, response) {
   console.log('Got body:', request.body);
   let returnData = '';
   const postData = request.body;
   const voyce_token = process.env.VOYCE_TOKEN;
   const options = {
     hostname: 'www.voyceglobal.com',
     path: '/APITwilio/Request/InviteWithoutLangauge',
     port: 443,
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'VOYCEToken':voyce_token
     }
   }
   const req = https.request(options, res => {
     res.on('data', d => {
        returnData += d;
     })

     res.on('end', () => {
       console.log("end")
       response.json(JSON.parse(returnData));
     })

   });
   req.on('error', error => {
     response.json("Error:"+error.message);
   })
   req.write(JSON.stringify(postData))
   req.end()

})

//Status pulling API Call to VOYCE
app.post('/Request/StatusByPreInviteToken', function (request, response) {
   let returnData = '';

   const voyce_token = process.env.VOYCE_TOKEN;
   const options = {
     hostname: 'www.voyceglobal.com',
     path: '/APITwilio/Request/StatusByPreInviteToken?PreInviteToken='+request.body.Token,
     port: 443,
     method: 'GET',
     headers: {
       'Content-Type': 'application/json',
       'VOYCEToken':voyce_token
     }
   }
   const req = https.request(options, res => {
     console.log(`statusCode: ${res.statusCode}`)

     res.on('data', d => {
        returnData += d;
     })

     res.on('end', () => {
       try {
         response.json(JSON.parse(returnData));
       } catch (e) {
         response.json(JSON.parse("{}"));
       }
     })

   });
   req.on('error', error => {
     response.json("Error:"+error.message);
   })
   req.end()
})

//Finish the interpretation service API Call to VOYCE
app.post('/Request/FinishByPreInvite/:preInviteToken', function (request, response) {
   // First read existing users.
   console.log('PreInviteToken:', request.params.preInviteToken);
   let returnData = '';
   const postData = request.body;
   const voyce_token = process.env.VOYCE_TOKEN;
   const options = {
     hostname: 'www.voyceglobal.com',
     path: '/APITwilio/Request/FinishByPreInvite?PreInviteToken='+request.params.preInviteToken,
     port: 443,
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'VOYCEToken':voyce_token
     }
   }
   const req = https.request(options, res => {
     res.on('data', d => {
        returnData += d;
     })

     res.on('end', () => {
       try {
         response.json(JSON.parse(returnData));
       } catch (e) {
         response.json(JSON.parse("{}"));
       }
     })
   });
   req.on('error', error => {
     response.json("Error:"+error.message);
   })
   req.end()

})
//
// app.post('/Request/New', function (request, response) {
//    // First read existing users.
//    console.log('Got body:', request.body);
//    let returnData = '';
//    const postData = request.body;
//    const voyce_token = process.env.VOYCE_TOKEN;
//    const options = {
//      hostname: 'www.voyceglobal.com',
//      path: '/APITwilio/Request/New',
//      port: 443,
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//        'VOYCEToken':voyce_token
//      }
//    }
//    const req = https.request(options, res => {
//      console.log(`statusCode: ${res.statusCode}`)
//
//      res.on('data', d => {
//         returnData += d;
//      })
//
//      res.on('end', () => {
//        console.log("end")
//        response.json(JSON.parse(returnData));
//      })
//
//    });
//    req.on('error', error => {
//      response.json("Error:"+error.message);
//    })
//    req.write(JSON.stringify(postData))
//    req.end()
//
// })
//
// app.get('/Request/Status/:request_id', function (request, response) {
//    // First read existing users.
//    console.log('request id:', request.params.request_id);
//    let returnData = '';
//    const postData = request.body;
//    const voyce_token = process.env.VOYCE_TOKEN;
//    const options = {
//      hostname: 'www.voyceglobal.com',
//      path: '/APITwilio/Request/Status?RequestId='+request.params.request_id,
//      port: 443,
//      method: 'GET',
//      headers: {
//        'Content-Type': 'application/json',
//        'VOYCEToken':voyce_token
//      }
//    }
//    const req = https.request(options, res => {
//      console.log(`statusCode: ${res.statusCode}`)
//
//      res.on('data', d => {
//         returnData += d;
//      })
//
//      res.on('end', () => {
//        console.log("end")
//        try {
//          response.json(JSON.parse(returnData));
//        } catch (e) {
//          response.json(JSON.parse("{}"));
//        }
//      })
//
//    });
//    req.on('error', error => {
//      response.json("Error:"+error.message);
//    })
//    //req.write(JSON.stringify(postData))
//    req.end()
//
// })
//
// app.post('/Request/Finish/:request_id', function (request, response) {
//    // First read existing users.
//    console.log('request id:', request.params.request_id);
//    let returnData = '';
//    const postData = request.body;
//    const voyce_token = process.env.VOYCE_TOKEN;
//    const options = {
//      hostname: 'www.voyceglobal.com',
//      path: '/APITwilio/Request/Finish?RequestId='+request.params.request_id,
//      port: 443,
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//        'VOYCEToken':voyce_token
//      }
//    }
//    const req = https.request(options, res => {
//      console.log(`statusCode: ${res.statusCode}`)
//
//      res.on('data', d => {
//         returnData += d;
//      })
//
//      res.on('end', () => {
//        console.log("end")
//        try {
//          response.json(JSON.parse(returnData));
//        } catch (e) {
//          response.json(JSON.parse("{}"));
//        }
//      })
//
//    });
//    req.on('error', error => {
//      response.json("Error:"+error.message);
//    })
//    //req.write(JSON.stringify(postData))
//    req.end()
//
// })
//
// http.createServer(app).listen(1337, () => {
//   console.log("express server listening on port 1337");
// });
