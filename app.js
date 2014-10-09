
/**
 * Module dependencies.
 */
var swig = require('swig');
var express = require('express'), routes = require('./routes');
var bodyParser = require('body-parser');
var fs = require('fs-extra');
var crypto = require('crypto');
var moment = require("moment");
var uuid = require('node-uuid');
var ObjectId = require('mongodb').ObjectID;

var app = express();

app.engine('html', swig.renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

exports.app = app;

app.post('/stream', function (req, res) {
    var stream = {
        streamid: randomValueHex(16),
        writeToken: randomValueBase64(22),
    };
    var fileName = __dirname +'/fake_data/stream/'+stream.streamid;
    fs.ensureFile(fileName, function(err) {
        if(err){
            console.log(err); //null
        }else{
            fs.writeFile(fileName, JSON.stringify(stream, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + fileName);
                }
            });
        }
    });
    res.send(stream)
});
//TODO: not sure about the purpose ?
app.get('/stream/:id', function (req, res) {
  var readToken = req.headers.authorization;
  var fileName = __dirname +'/fake_data/event/'+req.params.id;

  fs.readFile(fileName, 'utf8', function (err,data) {
        if (err){
          res.status(404).send("stream not found");
        }
        else{
          var stream = JSON.parse(data);
          if(stream.readToken != req.headers.authorization){
              res.status(404).send("stream not found");
          }
          else{
              var response = {
                                streamid: stream.streamid
                             };
              res.send(JSON.stringify(response));
          }
        }
  });
});

app.post('/stream/:id/event', function (req, res) {
    var writeToken = req.headers.authorization;
    authenticateWriteToken(
      writeToken,
      req.params.id,
      function () {
          res.status(404).send("stream not found");
      },
      function (stream) {
          var parsedEvent = parseEvent(req.body, stream,res)
          saveEventToFile(parsedEvent,stream.streamid);
          res.send(JSON.stringify(parsedEvent))
      }
    );
 });

app.get('/reset', function (req, res) {
   fs.remove(__dirname +'/fake_data', function(err){
     if (err) return console.error(err);
     res.send('Fakes reset complete!!');
   });
 });


var parseEvent = function(event, stream, res){
    var event = {
            _id : new ObjectId(),
            event : {
            createdOn : moment(new Date()).format(),
            id : uuid.v1()
                    },
            payload : {
                actionTags :event.actionTags,
                source : event.source,
                objectTags : event.objectTags,
            streamid : stream.streamid,
            properties : {},
            eventDateTime : moment(new Date()).format()
        }
    }
    return event;
}

function saveEventToFile(event,streamid){
    var fileName = __dirname +'/fake_data/event/'+streamid+'/'+event._id;

    fs.ensureFile(fileName, function(err) {
        if(err){
            console.log(err); //null
        }else{
            fs.writeFile(fileName, JSON.stringify(event, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + fileName);
                }
            });
        }
    });


}

var authenticateWriteToken = function (token, id, error, success) {
    var fileName = __dirname +'/fake_data/stream/'+id;
    fs.readFile(fileName, 'utf8', function (err,data) {
      if (err){
        error()
      }
      else{
        var stream = JSON.parse(data);
        if(stream.writeToken != token){
            error()
        }
        else{
            success(stream);
        }
      }
    });
};

function randomValueHex (len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
}

function randomValueBase64 (len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}


var port = 7000;
app.listen(port, function () {
    console.log("Listening on " + port);
});