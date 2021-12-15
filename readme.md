# Steps

1. go to App Marketplace (zoom.us)
2. Choose app type according to your need, for user-authenticated data we will choose oAuth.
3. Give a name for app and choose User managed app (we want to access only user data).
4. https://github.com/zoom/zoom-oauth-sample-app → use this repository as the starting point.
5. We need to store the access token and refresh token for every user who will register on our app.
6. We need an event route to get all the events for our users.
7. we will get recording link in recording.completed event with a download token. Using thses we can download the recordings.
8. recording.completed event will trigger after the meeting ends.

9. Meeting recording URLs (using APIs) wont be available just after meeting it take time to save the files. So its better to look for URLs after 2-3 mins.

# to use this repo

1. Clone the repo
2. Do "npm i" make sure nodejs is installed.
3. look for the routes in index.js