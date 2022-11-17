//random change
//loading express
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const session = require("express-session");

//loading express validator
const { check, validationResult } = require("express-validator");

//set up and connect to DB
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/ev", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//setting up my model: what does an issue and a user look like
const Issue = mongoose.model("Issue", {
  station: String,
  connector: String,
  address: String,
  city: String,
  province: String,
  phone: String,
  postalcode: String,
  name: String,
  email: String,
  describeissue: String,
  uploadphoto: Buffer,
});

const User = mongoose.model("User", {
  uName: String,
  uPass: String,
});

//creating an express app
var myApp = express();

// set up the session middleware
myApp.use(
  session({
    secret: "tardis",
    resave: false,
    saveUninitialized: true,
  })
);

//adding body-parser middleware to parse form data
myApp.use(express.urlencoded({ extended: false }));
myApp.use(fileUpload()); // set up the express file upload middleware to be used with Express

//define paths to public folder and views folder
myApp.set("view engine", "ejs");
myApp.set("views", path.join(__dirname, "views"));
//this will serve the static files from the public folder
myApp.use(express.static(__dirname + "/public"));

//get, define the route for the index page
myApp.get("/", function (req, res) {
  //req is the incoming request, res is the outgiong response
  res.render("form"); //tells the ejs engine to respond with rendered form.ejs
});

// render the login page
myApp.get("/login", function (req, res) {
  res.render("login"); // will render views/login.ejs
});

//when I press the login button:
myApp.post("/login", function (req, res) {
  // fetch username and pass
  var uName = req.body.username;
  var uPass = req.body.adminpass;

  // find it in the database
  User.findOne({ uName: uName, uPass: uPass }).exec(function (err, user) {
    // set up the session variables for logged in users
    console.log("Errors: " + err);
    if (user) {
      req.session.uName = user.uName;
      req.session.loggedIn = true;
      // redirect to dashboard
      res.redirect("/dashboard");
    } else {
      res.redirect("/login"); //otherwise direct user to login
    }
  });
});
myApp.get("/logout", function (req, res) {
  //unsetting user name and setting login to false
  req.session.uName = "";
  req.session.loggedIn = false;
  res.redirect("/login");
});

//get the issues view, if the user is actually logged in, else send them to login page
myApp.get("/dashboard", function (req, res) {
  //req is the incoming request, res is the outgiong response
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  //selecting all the issues from the DB
  Issue.find({}).exec(function (err, issues) {
    console.log(err);
    res.render("dashboard", { issues: issues }); // will render views/dashboard.ejs, passing the issues from the database
  });
});

//create the issue form handler, handle the method post, processes the form data
myApp.post(
  "/",
  [
    //defining the list of validations to run
    check("station", "Station ID is required").notEmpty(),
    check("connector", "Connector type is required").notEmpty(),
    check("address", "Address is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("province", "Province is required").notEmpty(),
    check("postalcode", "Postal code not in correct format").matches(
      /^([A-Z][0-9]){3}$/
    ),
    check("name", "Name is required").notEmpty(),
    check("phone", "Phone not in correct format").matches(/^[0-9]{10}$/),
    check("email", "Email not in correct format").isEmail(),
    check("describeissue", "No issue description provided").notEmpty(),
  ],

  //this is what actually gets called to process the form data
  function (req, res) {
    const errors = validationResult(req); //this call uses express validator plug in to run
    //the validations listed above and return any errors

    if (errors.isEmpty()) {
      //if no errors then process the form data
      var station = req.body.station;
      var connector = req.body.connector;
      var address = req.body.address;
      var city = req.body.city;
      var province = req.body.province;
      var postalcode = req.body.postalcode;
      var name = req.body.name;
      var phone = req.body.phone;
      var email = req.body.email;
      var describeissue = req.body.describeissue;
      var uploadphoto = req.files.uploadphoto;

      //prepare data to send to view
      var pageData = {
        station: station,
        connector: connector,
        address: address,
        city: city,
        province: province,
        postalcode: postalcode,
        name: name,
        phone: phone,
        email: email,
        describeissue: describeissue,
        uploadphoto: uploadphoto.data,
      };

      //creates new instance of data model
      var issue = new Issue(pageData);
      //saves issue to DB
      issue.save();
      res.render("submitsuccess", pageData);
    } else {
      //when there are errors
      console.log(errors.array());
      res.render("form", { errors: errors.array() });
    }
  }
);

// show only one issue depending on the id
myApp.get("/print/:issueid", function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  var issueId = req.params.issueid;
  Issue.findOne({ _id: issueId }).exec(function (err, issue) {
    res.render("print", issue); // render print.ejs with the data from issue
  });
});
//deletes an issue from the database
myApp.get("/delete/:issueid", function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  var issueId = req.params.issueid;
  Issue.findByIdAndDelete({ _id: issueId }).exec(function (err, issue) {
    res.render("deletesuccess", issue); // render delete.ejs with the data from issue
  });
});
// edits an issue
myApp.get("/edit/:issueid", function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  var issueId = req.params.issueid;
  //find the issue and render it in a form
  Issue.findOne({ _id: issueId }).exec(function (err, issue) {
    res.render("edit", issue); // render edit.ejs with the data from issue
  });
});

// process the edited form from admin
myApp.post(
  "/editprocess/:issueid",
  [
    //defining the list of validations to run
    check("station", "Station ID is required").notEmpty(),
    check("connector", "Connector type is required").notEmpty(),
    check("address", "Address is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("province", "Province is required").notEmpty(),
    check("postalcode", "Postal code not in correct format").matches(
      /^([A-Z][0-9]){3}$/
    ),
    check("name", "Name is required").notEmpty(),
    check("phone", "Phone not in correct format").matches(/^[0-9]{10}$/),
    check("email", "Email not in correct format").isEmail(),
    check("describeissue", "No issue description provided").notEmpty(),
  ],
  function (req, res) {
    if (!req.session.loggedIn) {
      res.redirect("/login");
    } else {
      const errors = validationResult(req); //this call uses express validator plug in to run
      //the validations listed above and return any errors

      if (errors.isEmpty()) {
        //if no errors then process the form data
        var station = req.body.station;
        var connector = req.body.connector;
        var address = req.body.address;
        var city = req.body.city;
        var province = req.body.province;
        var postalcode = req.body.postalcode;
        var name = req.body.name;
        var phone = req.body.phone;
        var email = req.body.email;
        var describeissue = req.body.describeissue;
        //this reads red.files.uploadphoto in a way that it won't crash if there is no req.files (no photo uploaded)
        var uploadphoto = (req.files || {}).uploadphoto;

        // find the issue in database and update it
        var issueId = req.params.issueid;
        Issue.findOne({ _id: issueId }).exec(function (err, issue) {
          // update the issue and save

          issue.station = station;
          issue.connector = connector;
          issue.address = address;
          issue.city = city;
          issue.province = province;
          issue.postalcode = postalcode;
          issue.name = name;
          issue.phone = phone;
          issue.email = email;
          issue.describeissue = describeissue;
          //if as new photo is uploaded, then replace the exisitng one
          if (uploadphoto) {
            issue.uploadphoto = uploadphoto.data;
          }
          issue.save();
          res.render("editsuccess");
        });
      } else {
        //when there are errors
        console.log(errors.array());
        res.render("edit", { errors: errors.array() });
      }
    }
  }
);

//start the server (listen at a port)
myApp.listen(8080);
console.log("Everything executed, open http://localhost:8080/ in the browser.");
