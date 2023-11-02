import UserModel from "../model/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ENV from "../config.js";
import otpGenerator from "otp-generator";

// Middleware for verify user
export async function verifyUser(req, res, next) {
  try {
    const { username } = req.method == "GET" ? req.query : req.body;
    //check the user ex
    let exist = await UserModel.findOne({ username });
    if (!exist) {
      return res.status(404).send({ error: "Can't find user!" });
    }
    next();
  } catch (error) {
    return res.status(404).send({ error: "Authentication Error" });
  }
}

/*POST : http://localhost:8000/api/register
ReportBody:{
    "username":"example123",
    "password":"example123",
    "email":"example@gmail.com",
    "firstName":"nilesh",
    "lastName":"kaldate",
    "mobile":1234576890,
    "address":"sukh sagar nagar katraj",
    "profile":""
}*/
export async function register(req, res) {
  try {
    const { username, password, profile, email } = req.body;

    const existUsername = new Promise((resolve, reject) => {
      UserModel.findOne({ username }).then(function (user) {
        if (user) reject("Please use unique username");
        resolve();
      });
    });

    const existEmail = new Promise((resolve, reject) => {
      UserModel.findOne({ email }).then(function (email) {
        if (email) reject("Please use unique email");
        resolve();
      });
    });

    Promise.all([existUsername, existEmail])
      .then(() => {
        if (password) {
          bcrypt
            .hash(password, 10)
            .then((hashedPassword) => {
              const user = new UserModel({
                username,
                password: hashedPassword,
                profile: profile || "",
                email,
              });
              user
                .save()
                .then((result) => {
                  res
                    .status(200)
                    .send({ message: "user register successfully" });
                })
                .catch((error) => res.status(500).send({ error }));
            })
            .catch((error) => {
              return res.status(500).send({
                error: "Enable to hashed password",
              });
            });
        }
      })
      .catch((error) => {
        return res.status(500).send({ error });
      });
  } catch (error) {
    return res.status(500).send(error);
  }
}

/*POST : http://localhost:8000/api/login
body:{
  "username":"example123",
  "password":"example123"
}*/
export async function login(req, res) {
  const { username, password } = req.body;
  try {
    UserModel.findOne({ username: username })
      .then((user) => {
        bcrypt
          .compare(password, user.password)
          .then((passwordCheck) => {
            if (!passwordCheck) {
              return res.status(400).send({ error: "Don't have password" });
            }

            // Create JWT token
            const token = jwt.sign(
              {
                userId: user._id,
                username: user.username,
              },
              ENV.JWT_SECRET,
              { expiresIn: "24h" }
            );

            return res.status(200).send({
              message: "login successful...!",
              username: user.username,
              token,
            });
          })
          .catch((error) => {
            return res.status(404).send({ error: "Password does not match" });
          });
      })
      .catch((error) => {
        return res.status(404).send({ error: "Username not found" });
      });
  } catch (error) {
    return res.status(400).send({ error });
  }
}

/* GET : http://localhost:8000/api/user/example123*/
export async function getUser(req, res) {
  const { username } = req.params;
  try {
    if (!username) {
      return res.status(501).send({ error: "Invalid username" });
    }
    UserModel.findOne({ username })
      .then((user) => {
        const { password, ...rest } = Object.assign({}, user.toJSON());
        return res.status(201).send(rest);
      })
      .catch((error) => {
        console.log(error);
        return res.status(501).send({ error: "couldn't find the user" });
      });
  } catch (error) {
    return res.status(404).send({ error: "Cannot find user data" });
  }
}

/*PUT : http://localhost:8000/api/updateUser
params{
  "id":"<userId>"
}
body{
  "firstName":"",
  address:"",
  profile:"",
}*/
export async function updateUser(req, res) {
  try {
    const { userId } = req.user;
    if (userId) {
      //update the data
      UserModel.updateOne({ _id: userId }, req.body)
        .then(() => {
          res.status(201).send({ message: "updated successfully" });
        })
        .catch((err) => {
          throw err;
        });
    } else {
      return res.status(401).send({ error: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(401).send({ error });
  }
}

/* GET : http://localhost:8000/api/generateOTP
params{
  username:"example@123"
}*/
export async function generateOTP(req, res) {
  req.app.locals.OTP = await otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  res.status(201).send({ code: req.app.locals.OTP });
}

/* GET : http://localhost:8000/api/verifyOTP*/
export async function verifyOTP(req, res) {
  const { code } = req.query;
  console.log(parseInt(req.app.locals.OTP) === parseInt(code));
  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.OTP = null; //reset the OTP value
    req.app.locals.resetSession = true; //start session for reset password
    return res.status(201).send({ message: "Verify Successfully!" });
  }
  return res.status(400).send({ error: "Invalid OTP" });
}

export async function createResetSession(req, res) {
  if (req.app.locals.resetSession) {
    req.app.local.resetSession = false;
    return res.status(201).send({ message: "access granted" });
  }
  return res.status(404).send("session expired");
}

export async function resetPassword(req, res) {
  try {
    if (!req.app.locals.resetSession)
      res.status(404).send({ message: "session expired" });

    const { username, password } = req.body;
    UserModel.findOne({ username })
      .then((user) => {
        bcrypt
          .hash(password, 10)
          .then((hashedPassword) => {
            UserModel.updateOne(
              { username: user.username },
              { password: hashedPassword }
            )
              .then(() => {
                return res.status(201).send({ message: "record updated" });
              })
              .catch(() => {
                return res
                  .status(401)
                  .send({ error: "cannot update the password" });
              });
          })
          .catch((error) => {
            return res.status(500).send({
              error: "Enable to hashed password",
            });
          });
      })
      .catch((error) => {
        return res.status(404).send({ error: "Username not found" });
      });
  } catch (error) {
    return res.status(401).send({ error });
  }
}
