// Bring in environment secrets through dotenv
require("dotenv/config");
const request = require("request");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const firebase = require("firebase");
const fetch = require("node-fetch");
const fs = require("fs");
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

// for oauth
app.get("/", (req, res) => {
    if (req.query.code) {
        let url =
            "https://zoom.us/oauth/token?grant_type=authorization_code&code=" +
            req.query.code +
            "&redirect_uri=" +
            process.env.redirectURL;
        console.log("Caaling");
        request
            .post(url, (error, response, body) => {
                body = JSON.parse(body);
                console.log(body);
                if (body.access_token) {
                    request
                        .get(
                            "https://api.zoom.us/v2/users/me",
                            async (error, response, apiresponse) => {
                                if (error) {
                                    console.log("API Response Error: ", error);
                                } else {
                                    res.send("LOGED IN");
                                    apiresponse = JSON.parse(apiresponse);

                                    // save the access_token and refresh_token for accessing the data next time
                                    const SAVE = {
                                        id: apiresponse.id,
                                        account_id: apiresponse.account_id,
                                        access_token: body.access_token,
                                        refresh_token: body.refresh_token,
                                        first_name: apiresponse.first_name,
                                        last_name: apiresponse.last_name,
                                        email: apiresponse.email,
                                    };

                                    const docRef = db.collection("users");
                                    await docRef
                                        .doc(apiresponse.account_id)
                                        .set(SAVE, { merge: true });
                                }
                            }
                        )
                        .auth(null, null, true, body.access_token);
                } else {
                    res.send("LOGED OUTTTTTTTTTTTTTT");
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

// for all the events we added
app.post(
    "/event",
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
        let event;
        try {
            event = JSON.parse(req.body);
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (req.headers.authorization === process.env.VERIFICATION_TOKEN) {
            res.status(200);
            console.log(event.event);

            if (event.event == "recording.completed") {
                const yourUrl = `${event.payload.object.recording_files[0].download_url}/?access_token=${event.download_token}`;
                // use this URL to directly download the recording
                console.log(yourUrl);

                // const response = await fetch(yourUrl);
                // const buffer = await response.buffer();

                // fs.writeFile(`./videos/name.mp4`, buffer, () =>
                //     console.log("finished downloading video!")
                // );

                const docRef = db.collection("recording");
                const SAVE = {
                    meeting_Id: event.payload.object.id,
                    payload: event,
                };
                await docRef.add(SAVE, {
                    merge: true,
                });

                const meetingRef = db.collection("meeting");
                const meeting_data = {
                    meeting_id: event.payload.object.id,
                    account_id: event.payload.account_id,
                };
                await meetingRef.doc(meeting_id).set(meeting_data, {
                    merge: true,
                });
            }
            res.send();
        } else {
            console.log("not matched!");
        }
    }
);

// https://my-zoom-apps.herokuapp.com/recording/81037856340

app.get("/recording/:meeting", (req, res) => {
    let meeting_id = req.params.meeting;
    try {
        meeting_id = Number(meeting_id);
        db.collection("recording")
            .where("meeting_Id", "==", meeting_id)
            .get()
            .then(function (query) {
                if (query.size > 0) {
                    const meetingdata = query.docs[0].data();

                    var JSONResponse =
                        "<pre><code>" +
                        JSON.stringify(meetingdata, null, 2) +
                        "</code></pre>";
                    res.send(`
                            <style>
                                @import url('https://fonts.googleapis.com/css?family=Open+Sans:400,600&display=swap');
                               html {color: #232333;font-family: 'Open Sans', Helvetica, Arial, sans-serif;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}
                            </style>
                            <div class="container">
                                <div class="response">
                                    <h4>Recording Completes event Response:</h4>
                                    ${JSONResponse}
                                </div>
                            </div>
                            `);
                } else {
                    res.send("no such meeting");
                }
            });
    } catch (error) {
        res.send(error);
    }
});

// https://my-zoom-apps.herokuapp.com/meeting/82575550044

app.get("/meeting/:meeting", (req, res) => {
    const meeting_id = req.params.meeting;

    db.collection("meeting")
        .where("meeting_id", "==", meeting_id)
        .get()
        .then(function (query) {
            if (query.size > 0) {
                const meetingdata = query.docs[0].data();
                const ref = db.collection("users");
                let data;
                ref.where("account_id", "==", meetingdata.account_id)
                    .get()
                    .then(function (query) {
                        if (query.size > 0) {
                            data = query.docs[0].data();

                            // request to refresh the access token as token expires after 1 hr
                            request(
                                {
                                    method: "POST",
                                    url: `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${data.refresh_token}`,
                                    headers: {
                                        Authorization: `Basic ${Buffer.from(
                                            process.env.clientID +
                                                ":" +
                                                process.env.clientSecret
                                        ).toString("base64")}`,
                                        "Content-Type":
                                            "application/x-www-form-urlencoded",
                                        Cookie: "_zm_chtaid=978; _zm_ctaid=GD2BQyCVSIyRQ-bVkq33Vw.1639026150025.16e32787e3e93ebe4919b6525ea65adc; _zm_page_auth=us05_c_xmWTmzakQRqtfLrt2Mn31Q; _zm_ssid=us05_c_vT8LWJHJQcWGbf_4mXzCPQ; cred=D68E05A240F2476B6ACEB90E7DB68910",
                                    },
                                },
                                async function (error, response) {
                                    if (error) throw new Error(error);
                                    const lastresponse = JSON.parse(
                                        response.body
                                    );

                                    const SAVE = {
                                        access_token: lastresponse.access_token,
                                        refresh_token:
                                            lastresponse.refresh_token,
                                    };

                                    const docRef = db.collection("users");
                                    await docRef
                                        .doc(data.account_id)
                                        .set(SAVE, { merge: true });

                                    // request recordings using APIs and meeting id
                                    request
                                        .get(
                                            `https://api.zoom.us/v2/meetings/${meeting_id}/recordings`,
                                            async (
                                                error,
                                                response,
                                                apiresponse
                                            ) => {
                                                if (error) {
                                                    console.log(
                                                        "API Response Error: ",
                                                        error
                                                    );
                                                } else {
                                                    apiresponse =
                                                        JSON.parse(apiresponse);
                                                    var JSONResponse =
                                                        "<pre><code>" +
                                                        JSON.stringify(
                                                            apiresponse,
                                                            null,
                                                            2
                                                        ) +
                                                        "</code></pre>";
                                                    res.send(`
                                                        <style>
                                                            @import url('https://fonts.googleapis.com/css?family=Open+Sans:400,600&display=swap');
                                                            @import url('https://necolas.github.io/normalize.css/8.0.1/normalize.css');
                                                            html {color: #232333;font-family: 'Open Sans', Helvetica, Arial, sans-serif;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}h2 {font-weight: 700;font-size: 24px;}h4 {font-weight: 600;font-size: 14px;}.container {margin: 24px auto;padding: 16px;max-width: 720px;}.info {display: flex;align-items: center;}.info>div>span, .info>div>p {font-weight: 400;font-size: 13px;color: #747487;line-height: 16px;}.info>div>span::before {content: "👋";}.info>div>h2 {padding: 8px 0 6px;margin: 0;}.info>div>p {padding: 0;margin: 0;}.info>img {background: #747487;height: 96px;width: 96px;border-radius: 31.68px;overflow: hidden;margin: 0 20px 0 0;}.response {margin: 32px 0;display: flex;flex-wrap: wrap;align-items: center;justify-content: space-between;}.response>a {text-decoration: none;color: #2D8CFF;font-size: 14px;}.response>pre {overflow-x: scroll;background: #f6f7f9;padding: 1.2em 1.4em;border-radius: 10.56px;width: 100%;box-sizing: border-box;}
                                                        </style>
                                                        <div class="container">
                                                            <div class="response">
                                                                <h4>JSON Response:</h4>
                                                                ${JSONResponse}
                                                            </div>
                                                        </div>
                                                        `);
                                                    if (
                                                        apiresponse.message ==
                                                        "Access token is expired."
                                                    ) {
                                                        console.log(
                                                            "Access token is expired."
                                                        );
                                                    } else {
                                                        const docRef =
                                                            db.collection(
                                                                "meeting"
                                                            );
                                                        const SAVE = {
                                                            meeting_id:
                                                                meeting_id,
                                                            account_id:
                                                                data.account_id,
                                                            response:
                                                                apiresponse,
                                                        };
                                                        await docRef
                                                            .doc(meeting_id)
                                                            .set(SAVE, {
                                                                merge: true,
                                                            });
                                                    }
                                                }
                                            }
                                        )
                                        .auth(
                                            null,
                                            null,
                                            true,
                                            lastresponse.access_token
                                        );
                                }
                            );
                        }
                    });
            } else {
                res.send("no such meeting");
            }
        });

    db.collection("meeting")
        .where("meeting_id", "==", meeting_id)
        .get()
        .then(function (query) {
            if (query.size > 0) {
                const data = query.docs[0].data();
                console.log(data);
                var JSONResponse =
                    "<pre><code>" +
                    JSON.stringify(data, null, 2) +
                    "</code></pre>";
            } else {
                res.send("no such meeting");
            }
        });
});

const port = process.env.PORT || 4000;

app.listen(port, () =>
    console.log(`Zoom Hello World app listening at PORT: ${port}`)
);
