import nodemailer from "nodemailer";
import Mailgen from "mailgen";

import ENV from "../config.js";

let nodeConfig = {
  service: "gmail",
  auth: {
    user: ENV.EMAIL,
    pass: ENV.PASSWORD,
  },
};

const transporter = nodemailer.createTransport(nodeConfig);

let MailGenerator = new Mailgen({
  theme: "default",
  product: {
    name: "Mailgen",
    link: "https://mailgen.js/",
  },
});

export const registerMail = async (req, res) => {
  const { username, userEmail, text, subject } = req.body;
  console.log(username, userEmail, text, subject);

  var email = {
    body: {
      name: username,
      intro: text || "welcome to my page",
      outro: "need help, or have questions",
    },
  };

  var emailBody = MailGenerator.generate(email);

  let message = {
    from: { name: "Nilesh", address: ENV.EMAIL },
    to: userEmail,
    subject: subject || "Signup successful",
    html: emailBody,
  };

  transporter
    .sendMail(message)
    .then(() => {
      return res
        .status(200)
        .send({ message: "you should receive an email from us." });
    })
    .catch((error) => res.status(500).send({ error }));
};
