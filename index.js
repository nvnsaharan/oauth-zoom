// Bring in environment secrets through dotenv
require("dotenv/config");
const request = require("request");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const firebase = require("firebase");
require("firebase/firestore");

const app = express();

firebase.initializeApp({
    apiKey: "AIzaSyCGb7l_1O_ALf9TKnG_MU5BwnYNpOpsmDo",
    authDomain: "mycounterappp.firebaseapp.com",
    projectId: "mycounterappp",
    storageBucket: "mycounterappp.appspot.com",
    messagingSenderId: "882388031250",
    appId: "1:882388031250:web:0f7a5dc3c4d617d1e2c5cb",
});

var db = firebase.firestore();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(__dirname + "/static"));

app.get("/", (req, res) => {
    if (req.query.code) {
        let url =
            "https://zoom.us/oauth/token?grant_type=authorization_code&code=" +
            req.query.code +
            "&redirect_uri=" +
            process.env.redirectURL;

        request
            .post(url, (error, response, body) => {
                body = JSON.parse(body);

                if (body.access_token) {
                    request
                        .get(
                            "https://api.zoom.us/v2/users/me",
                            async (error, response, apiresponse) => {
                                if (error) {
                                    console.log("API Response Error: ", error);
                                } else {
                                    apiresponse = JSON.parse(apiresponse);

                                    const SAVE = {
                                        id: apiresponse.id,
                                        account_id: apiresponse.account_id,
                                        access_token: body.access_token,
                                        refresh_token: body.refresh_token,
                                        first_name: body.first_name,
                                        last_name: body.last_name,
                                        email: body.email,
                                    };

                                    const docRef = db.collection("users");
                                    await docRef.add(SAVE);
                                    res.send("LOGED IN");
                                }
                            }
                        )
                        .auth(null, null, true, body.access_token);
                } else {
                }
            })
            .auth(process.env.clientID, process.env.clientSecret);

        return;
    }

    res.redirect(
        "https://zoom.us/oauth/authorize?response_type=code&client_id=" +
            process.env.clientID +
            "&redirect_uri=" +
            process.env.redirectURL
    );
});

app.get("/hello", (req, res) => {
    res.send("hello world!");
});

//  https://api.zoom.us/v2/

app.post("/event", bodyParser.raw({ type: "application/json" }), (req, res) => {
    let event;
    console.log("Webinar Ended Webhook Recieved.");
    try {
        event = JSON.parse(req.body);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (req.headers.authorization === process.env.VERIFICATION_TOKEN) {
        res.status(200);
        console.log(event);

        // {
        //    event: 'meeting.ended',
        //    payload: {
        //  account_id: 'R5SjAl7LRFSVhp8viBp7bg',
        //  object: {
        //    duration: 0,
        //    start_time: '2021-12-07T15:29:25Z',
        //    timezone: '',
        //    end_time: '2021-12-07T15:38:52Z',
        //    topic: "Naveen Saharan's Zoom Meeting",
        //    id: '89312688007',
        //    type: 1,
        //    uuid: 'bTuD/7TCRPqztQG/wiPENw==',
        //    host_id: 'jbX_o7E7RxS1Ov0TToNypg'
        //  }
        //    },
        //    event_ts: 1638891532732
        //  }

        if (event.event == "meeting.ended") {
            console.log("do api call for recordings.");

            // /meetings/{meetingId}/recordings
        }
        res.send();
    } else {
        console.log("not matched!");
    }
});

app.get("/live", (req, res) => {
    res.render("live");
});

const port = process.env.PORT || 4000;

app.listen(port, () =>
    console.log(`Zoom Hello World app listening at PORT: ${port}`)
);
