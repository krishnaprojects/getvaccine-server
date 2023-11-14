require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");
const app = express();
const cron = require("node-cron");
const fetchUrl = require("fetch").fetchUrl;
const utilfun = require("./utils/function_utils");
const mailer = require("./utils/email");

app.use(express.json());
app.use(cors());
mongoose.connect(
  process.env.DBURL,
  { useUnifiedTopology: true, useNewUrlParser: true },
  (err) => {
    if (!err) {
      console.log("Connected To Db Successfully ✅");
    }
  }
);

mongoose.set("useCreateIndex", true);

const detailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  pincode: { type: Number, required: true },
  state: { type: Number, required: true },
  district: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
});

const detailModel = new mongoose.model("detail", detailsSchema);

function makereq(url) {
  const request = https.request(url, (response) => {
    let data = "";
    response.on("data", (chunk) => {
      data = data + chunk.toString();
    });

    response.on("end", () => {
      const body = JSON.parse(data);
      //console.log(body);
      return body;
    });
  });

  request.on("error", (error) => {
    console.log("An error", error);
  });

  request.end();
}

function findallvaccine() {
  var date = new Date(); // M-D-YYYY

  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();

  var dateString =
    (d <= 9 ? "0" + d : d) + "-" + (m <= 9 ? "0" + m : m) + "-" + y;
  detailModel.find({}, (err, rs) => {
    if (err) {
      console.log(err);
    }
    if (rs) {
      //get All Value and Iterate Over Them By Foreach
      rs.forEach((element) => {
        console.log(element);
        var url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${element.district}&date=${dateString}`;
        fetchUrl(url, function (error, meta, body) {
          if (!error) {
            const datafromapi = JSON.parse(body.toString());
            //console.log(datafromapi.centers);
            if (!utilfun.isEmpty(datafromapi.centers)) {
              //console.log("not empty");
              const district_wise = utilfun.searchinjsondata(
                datafromapi.centers,
                element.age
              );
              if (district_wise.length > 0) {
                //if data is found ,then we will mail it to the registred user.
                const message = utilfun.convertdatatoformat(district_wise);
                if (process.env.MAILORNOT) {
                  mailer.email(`${element.email}`, message, `${element.name}`);
                }
              }
            }
          }
        });
      });
    }
  });
}

cron.schedule("* * * * *", () => {
  console.log("running a task every minute");
  findallvaccine();
});

app.get("/", (req, res) => {
  res.json({
    welcome: "Hey All ! welcome to GetVaccine Server",
    Developer: "Ashish (githubid 👉 ashish-devv)",
  });
});

app.get("/linkforcron-job", (req, res) => {
  res.json({
    Date: new Date(),
  });
});

app.get("/getDetail", (req, res) => {
  if (Object.keys(req.query).length === 0) {
    res.json({ code: 3, error: "Unknown Error" });
  } else {
    if (req.query) {
      //console.log(req.query);
      detailModel.findOne({ email: req.query.email }, (err, rs) => {
        if (err) {
          console.log(err);
          res.json({ code: 3, error: "Unknown Error" }); //  code 3 for unknown error
        } else {
          if (rs) {
            res.json({ code: 2 }); //code 2 for already data (email exist)
          } else {
            const newdetail = new detailModel(req.query);
            newdetail.save((err, result) => {
              if (err) {
                console.log(err);
                res.json({ code: 3 });
              } else {
                console.log(result);
                res.json({ code: 1 }); //code 1 for success
              }
            });
          }
        }
      });
    }
  }
});

app.get("/deletemefromlist", (req, res) => {
  if (Object.keys(req.query).length === 0) {
    res.json({ code: 3, error: "Unknown Error" });
  } else {
    detailModel.deleteOne({ email: req.query.email }, (err, rs) => {
      if (err) {
        res.json({ code: 3, error: "Unknown Error" });
      } else {
        res.send(
          "<strong>Your Name Has been Removed From our App ! you Will no Longer Recieve Any Email From Us !</strong>"
        );
      }
    });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Server Started At ${port}`);
});
