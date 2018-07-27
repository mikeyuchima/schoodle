"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();

const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');

// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));

// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

// Home page
app.get("/", (req, res) => {
  res.render("index");
});

// app.get("/event/:hash", (req, res) => {

//   let templateVars = {};

//   knex
//   .select()
//   .from("events")
//   .limit(1)
//   .where("hash", '=', req.params.hash)
//   .then((event) => {
//     templateVars = event[0];

//     Promise.all([
//       knex
//       .select()
//       .from("times")
//       .where('times.event_id', '=', event[0].id)
//       .then((times) => {
//         templateVars.timeSlots = [];
//         for(var time in times){ templateVars.timeSlots.push(times[time]); }
//       }),
//       knex
//       .select()
//       .from("attendees")
//       .where('attendees.event_id', '=', event[0].id)
//       .then((attendees) => {
//         templateVars.attendees = [];
//         for(var person in attendees){

//           templateVars.attendees.push(attendees[person]);

//           knex
//             .select()
//             .from('attendees_times')
//             .innerJoin('times', 'attendees_times.time_id', 'times.id')
//             .where('attendees_times.attendee_id','=', attendees[person].id)
//             .then((availabilities) => {
//               templateVars.attendees[person].times_available = [];

//               for(var availability in availabilities){
//                 console.log('>>', availabilities[availability]);
//                 templateVars.attendees[person].times_available.push(availabilities[availability]);
//               }
//           });
//         }
//       })
//     ])
//     .then(() => {
//       console.log(templateVars);
//       res.render('event', templateVars);
//     });
//   });
// });

app.get("/event/:hash", async (req, res) => {

  let templateVars = {};

  templateVars.event = await knex
    .select()
    .from("events")
    .limit(1)
    .where("hash", '=', req.params.hash)

  templateVars.times = await knex
    .select()
    .from("times")
    .where('times.event_id', '=', templateVars.event[0].id)


  templateVars.attendees = await knex
      .select()
      .from("attendees")
      .where('attendees.event_id', '=', templateVars.event[0].id)

  try {
    for(var person in templateVars.attendees){
      await knex
        .select()
        .from('attendees_times')
        .innerJoin('times', 'attendees_times.time_id', 'times.id')
        .where('attendees_times.attendee_id','=', templateVars.attendees[person].id)
        .then((availabilities) => {
          templateVars.attendees[person].times_available = [];

          for(var availability in availabilities){
            console.log('>>', availabilities[availability]);
            templateVars.attendees[person].times_available.push(availabilities[availability]);
          }
      });
    }
  } catch(e) {
    console.log(e)
  }

  console.log(templateVars.attendees[0].times_available);

  res.render('event', templateVars);
});

// Create Event
app.get("/create", (req, res) => {
  res.render("create");
});

// Event
app.get("/event", (req, res) => {
  res.render("event");
});

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
