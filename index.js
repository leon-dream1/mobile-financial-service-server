const express = require("express");
const cors = require("cors");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l574mko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const usersCollection = client.db("mobileFinancialService").collection("users");

async function run() {
  try {
    app.get("/", (req, res) => {
      res.send("Mobile service Enable");
    });

    app.post("/jwt", async (req, res) => {
      console.log(req.body);
      const userEmail = req.body;
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.send({ token: token });
    });

    app.post("/users", async (req, res) => {
      console.log(req.body);

      const query = { email: req.body.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }

      try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.pin, salt);
        delete req.body.pin;

        const userInfo = {
          ...req.body,
          pin: hash,
        };

        console.log(userInfo);

        const result = await usersCollection.insertOne(userInfo);
        res.send(result);
      } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/login", async (req, res) => {
      const query = {
        $or: [{ email: req.body.emailOrPhn }, { mobile: req.body.emailOrPhn }],
      };

      const existingUser = await usersCollection.findOne(query);
      console.log("exist", existingUser);

      if (existingUser) {
        const hashPass = existingUser.pin;

        const isMatch = await bcrypt.compare(req.body.pin, hashPass);
        if (isMatch) {
          console.log("Password matches");
          res.send({
            status: 200,
            message: "Log in Successful .........",
            email: existingUser.email,
          });
        } else {
          console.log("Incorrect Password!!!");
          res.send({ message: "Incorrect Password!!!" });
        }
      } else {
        res.send({ message: "Invalid Email or Phone Number" });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
