const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bluemix_appid = require("bluemix-appid");
const app = express();
const request = require("request");
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");
const cfenv = require("cfenv");
const сloudant = require("cloudant");
const moment = require("moment");

const LOGIN_URL = "/ibm/bluemix/appid/login";
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

app.set('view engine', 'ejs');

app.use(express.static("views"));

var sg = require('sendgrid')("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");

function sendEmail(subj, content, reciever, callback)
{
	var req = sg.emptyRequest({
	  method: 'POST',
	  path: '/v3/mail/send',
	  body: {
		personalizations: [
		  {
			to: [
			  {
				email: reciever
			  }
			],
			subject: subj
		  }
		],
		from: {
		  email: 'reminder@studybuddy.com'
		},
		content: [
		  {
			type: 'text/plain',
			value: content
		  }
		]
	  }
	});

	// With promise
	sg.API(req)
	  .then(function (response) {
		console.log(response.statusCode);
		console.log(response.body);
		console.log(response.headers);
		callback();
	  })
	  .catch(function (error) {
		// error is an instance of SendGridError
		// The full response is attached to error.response
		console.log(error.response.statusCode);
		callback();
	  });

	// With callback
	sg.API(req, function (error, response) {
	  if (error) {
		console.log('Error response received');
	  }
	  console.log(response.statusCode);
	  console.log(response.body);
	  console.log(response.headers);
	  callback();
	});
}

function convertDate(date) {
  /// Hack to ignore timezone
  if(!cfenv.getAppEnv().isLocal) {
    date.setHours(date.getHours() + 13);
  }

  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString();
  var dd  = date.getDate().toString();
  var h = date.getHours().toString();
  var m = date.getMinutes().toString();

  var mmChars = mm.split('');
  var ddChars = dd.split('');
  var hChars = h.split('');
  var mChars = m.split('');

  return yyyy + '-' + 
      (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + 
      (ddChars[1] ? dd : "0" + ddChars[0]) + 
      "T" + 
      (hChars[1] ? h : "0" + hChars[0]) + ":" + 
      (mChars[1] ? m : "0" + mChars[0]);
}

///--- CLOUDANT SETTINGS ---///
var cloudant_url = 'https://b7e094c2-b851-468b-9688-0c45208d1ffe-bluemix:822d668f89f80820138a9b6c869d9b4aadbd71992a92d8a23630658bf0e686c2@b7e094c2-b851-468b-9688-0c45208d1ffe-bluemix.cloudant.com';
var cloudant_instance = сloudant({url: cloudant_url});
var study_buddy_db = cloudant_instance.db.use('study_buddy_db');
var user_db = cloudant_instance.db.use('user_db');

///--- LOCAL LOGIN ---///
if (cfenv.getAppEnv().isLocal) {
  app.use(session({
    secret: "123456",
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false
    }
  }));

  app.get('/login',function(req, res) {
    req.session.name = "Use22r";
    req.session.email = "studybuddytestuser@gmail.com";
    req.session.picture = "https://cdn1.iconfinder.com/data/icons/mix-color-4/502/Untitled-1-512.png";
    req.session.subscribed = "";

    if(req.session.username == undefined) {
      req.session.username = "";
    }
    if(req.session.password == undefined) {
      req.session.password = "";
    }

    user_db.find({selector:{email: req.session.email}}, function(error, data) {
      if(!error) {
        if(data.docs.length == 0) {
          var user = "{" + 
          "\"email\":\"" + req.session.email + "\"," + 
          "\"name\":\"" + req.session.name + "\"," + 
          "\"username\":\"" + "" + "\"," + 
          "\"password\":\"" + "" + "\"," + 
          "\"picture\":\"" + req.session.picture + "\"," + 
          "\"subscribed\":\"" + req.session.subscribed + "\"" + 
          "}";

          user_db.insert(JSON.parse(user), function(error, data) {
            if(!error) {
              res.render('account', {
                name: req.session.name, 
                email: req.session.email,
                username: req.session.username,
                password: req.session.password,
                picture: req.session.picture,
                subscribed: req.session.subscribed
              });
            } else {
            }
          });
        } else {
          req.session.name = data.docs[0].name;
          req.session.email = data.docs[0].email;
          // req.session.username = data.docs[0].username;
          // req.session.password = data.docs[0].password;
          req.session.picture = data.docs[0].picture;
          req.session.subscribed = data.docs[0].subscribed;

          if((req.session.username != "") && (req.session.password != "")) {
            res.render('calendar', {
              name: req.session.name, 
              email: req.session.email,
              picture: req.session.picture
            });
          } else {
            res.render('account', {
              name: req.session.name, 
              email: req.session.email,
              username: req.session.username,
              password: req.session.password,
              picture: req.session.picture,
              subscribed: req.session.subscribed
            });
          }
        }
      } else {
      }
    });
  });
}

///--- REMOTE LOGIN ---///
else {
  app.use(helmet());
  app.use(helmet.noCache());
  app.enable("trust proxy");
  app.use(express_enforces_ssl());
  app.use(session({
    secret: "123456",
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new bluemix_appid.WebAppStrategy({
    tenantId: "0e6496a8-ab13-42ee-9fdb-c1c84b490b76",
    clientId: "367849e7-b29b-4f26-87d4-e36b08a01ea1",
    secret: "YzIxOTU5ODEtZDU1Yi00NmZlLWIwMmUtY2JkMzBlY2UzYWMw",
    oauthServerUrl: "https://appid-oauth.au-syd.bluemix.net/oauth/v3/0e6496a8-ab13-42ee-9fdb-c1c84b490b76",
    redirectUri: "https://study-buddy.au-syd.mybluemix.net" + CALLBACK_URL}));

  bluemix_appid.UserAttributeManager.init();

  passport.serializeUser(function(user, cb) {
    cb(null, user);
  });

  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });

  app.get(LOGIN_URL, passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {
    forceLogin: true
  }));

  app.get(CALLBACK_URL, passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {allowAnonymousLogin: true}));

  app.get("/protected", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME), function(req, res) {
    var accessToken = req.session[bluemix_appid.WebAppStrategy.AUTH_CONTEXT].accessToken;

    bluemix_appid.UserAttributeManager.getAllAttributes(accessToken).then(function (attributes) {
      req.session.name = req.user.name;
      req.session.email = req.user.email;
      req.session.picture = req.user.picture;
      req.session.subscribed = req.user.subscribed;
      
      if(req.session.username == undefined) {
        req.session.username = "";
      }
      if(req.session.password == undefined) {
        req.session.password = "";
      }

      user_db.find({selector:{email: req.session.email}}, function(error, data) {
        if(!error) {
          if(data.docs.length == 0) {
            var user = "{" + 
            "\"email\":\"" + req.session.email + "\"," + 
            "\"name\":\"" + req.session.name + "\"," + 
            "\"picture\":\"" + req.session.picture + "\"," + 
            "\"username\":\"" + "" + "\"," + 
            "\"password\":\"" + "" + "\"," + 
            "\"subscribed\":\"" + req.session.subscribed + "\"" + 
            "}";

            user_db.insert(JSON.parse(user), function(error, data) {
              if(!error) {
                res.render('account', {
                  name: req.session.name, 
                  email: req.session.email,
                  username: req.session.username,
                  password: req.session.password,
                  picture: req.session.picture,
                  subscribed: req.session.subscribed
                });
              } else {
              }
            });
          } else {
            req.session.name = data.docs[0].name;
            req.session.email = data.docs[0].email;
            // req.session.username = data.docs[0].username;
            // req.session.password = data.docs[0].password;
            req.session.picture = data.docs[0].picture;
            req.session.subscribed = data.docs[0].subscribed;

            if((req.session.username != "") && (req.session.password != "")) {
              res.render('calendar', {
                name: req.session.name, 
                email: req.session.email,
                picture: req.session.picture
              });
            } else {
              res.render('account', {
                name: req.session.name, 
                email: req.session.email,
                username: req.session.username,
                password: req.session.password,
                picture: req.session.picture,
                subscribed: req.session.subscribed
              });
            }
          }
        } else {
        }
      });
    });
  });
  
  app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));
}

///--- REGISTERED LOGIN ---///
app.get('/registered_login',function(req, res) {
  user_db.find({selector:{username: req.query.username, password: req.query.password}}, function(error, data) {
    if(!error) {
      if((data.docs.length != 0) && (data.docs.username != "") && (data.docs.password != "")) {
        req.session.username = req.query.username;
        req.session.password = req.query.password;
        res.contentType('application/json');
        res.send("{\"login\":\"success\"}");
      } else {
        req.session.username = "";
        req.session.password = "";
        res.contentType('application/json');
        res.send("{\"login\":\"error\"}");
      }
    }
  });
});

///--- INDEX PAGE ---///
app.get('/',function(req, res) {
  res.sendfile(__dirname + '/views/index.html');
});

///--- ACCOUNT PAGE ---///
app.get('/account', function(req, res) {
  res.render('account', {
    name: req.session.name, 
    email: req.session.email,
    username: req.session.username,
    password: req.session.password,
    picture: req.session.picture,
    subscribed: req.session.subscribed
  });
});

///--- ACCOUNT SUBMIT ---///
app.get('/account_submit', function(req, res) {
  user_db.find({selector:{email: req.session.email}}, function(error, data) {
    if(!error) {
      if(data.docs.length != 0) {

        var user = "{" + 
          "\"_id\":\"" + data.docs[0]._id + "\"," + 
          "\"_rev\":\"" + data.docs[0]._rev + "\"," + 
          "\"email\":\"" + data.docs[0].email + "\"," + 
          "\"name\":\"" + req.query.name + "\"," + 
          "\"username\":\"" + req.query.username + "\"," + 
          "\"password\":\"" + req.query.password + "\"," + 
          "\"picture\":\"" + req.query.picture + "\"," + 
          "\"subscribed\":\"" + req.query.subscribed + "\"" + 
          "}";

          user_db.insert(JSON.parse(user), function(error, data) {
            if(!error) {
              res.contentType('application/json');
              res.send("{\"submitted\":\"submitted\"}");
            } else {
              res.contentType('application/json');
              res.send("{\"submitted\":\"error\"}");
            }
          });

      } else {
      }
    } else {
      res.contentType('application/json');
      res.send("{\"submitted\":\"error\"}");
    }
  });
});

///--- CALENDAR FILL ---///
app.get('/fill_calendar', function(req, res) {
  study_buddy_db.find({selector:{user: req.session.email}}, function(error, data) {
    if(!error) {
      res.contentType('application/json');
      res.send(JSON.parse(JSON.stringify(data.docs).split("\"_id\"").join("\"id\"")));
    } else {
      res.contentType('application/json');
      res.send("{\"filled\":\"error\"}");
    }
  });
});

///--- EVENT CREATE ---///
app.get('/create_event',function(req, res) {

  var start = new Date(req.query.start);
  var hours = start.getHours();
  var end = new Date(start);
  var reminder = new Date(start);
  end.setHours(hours + 1);
  reminder.setHours(hours - 1);

  var event = "{" + 
  "\"start\":\"" + convertDate(start) + "\"," + 
  "\"end\":\"" + convertDate(end) + "\"," + 
  "\"title\":\"" + req.query.title + "\"," + 
  "\"description\":\"" + "Description" + "\"," + 
  "\"user\":\"" + req.session.email + "\"," + 
  "\"category\":\"" + req.query.category + "\"," + 
  "\"reminder\":\"" + convertDate(reminder) + "\"," + 
  "\"color\":\"" + req.query.color + "\"" + 
  "}";

  study_buddy_db.insert(JSON.parse(event), function(error, data) {
    if(!error) {
      if(req.session.subscribed != "") {
        sendEmail("New event", "You have added a new event to your calender", req.session.email, function() {
        });
      }
      res.contentType('application/json');
      res.send("{\"created\":\"created\"}");
    } else {
      res.contentType('application/json');
      res.send("{\"created\":\"error\"}");
    }
  });
});

///--- EVENT UPDATE ---///
app.get('/update_event',function(req, res) {
  study_buddy_db.get(req.query.id, function(error, data) {
    if(!error) {

      var start = new Date(req.query.start);
      var end = new Date(req.query.end);
      var reminder = new Date(start);
      reminder.setHours(reminder.getHours() - 1);

      var event = "{" + 
      "\"_id\":\"" + req.query.id + "\"," + 
      "\"_rev\":\"" + data._rev + "\"," + 
      "\"start\":\"" + convertDate(start) + "\"," + 
      "\"end\":\"" + convertDate(end) + "\"," + 
      "\"title\":\"" + req.query.title + "\"," + 
      "\"description\":\"" + data.description + "\"," + 
      "\"user\":\"" + data.user + "\"," + 
      "\"category\":\"" + data.category + "\"," + 
      "\"reminder\":\"" + convertDate(reminder) + "\"," + 
      "\"color\":\"" + data.color + "\"" + 
      "}";

      study_buddy_db.insert(JSON.parse(event), function(error, data) {
          if(!error) {
            res.contentType('application/json');
            res.send("{\"updated\":\"updated\"}");
          } else {
            console.log(error);
            res.contentType('application/json');
            res.send("{\"updated\":\"error\"}");
          }
      });
    } else {
      console.log(error);
      res.contentType('application/json');
      res.send("{\"updated\":\"error\"}");
    }
  });
});

///--- EVENT REMOVE ---///
app.get('/remove_event',function(req, res) {
  study_buddy_db.get(req.query.id, function(error, data) {
    if(!error) {
      study_buddy_db.destroy(req.query.id, data._rev, function(error) {
        if(!error) {
          res.contentType('application/json');
          res.send("{\"removed\":\"removed\"}");
        } else {
          res.contentType('application/json');
          res.send("{\"removed\":\"error\"}");
        }
      });
    } else {
      res.contentType('application/json');
      res.send("{\"removed\":\"error\"}");
    }
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on http://localhost:" + port);
});
