const nodemailer = require("nodemailer");
require("dotenv").config({ path: ".env.local" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function testEmail() {
  console.log("🧪 Testing email...");
  console.log("GMAIL_USER:", process.env.GMAIL_USER);
  console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "✅ Set" : "❌ Not set");
  
  try {
    const info = await transporter.sendMail({
      from: `"PSU Test" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Test Email from PSU",
      html: `<h1>Hello!</h1><p>If you see this, email works!</p>`,
    });
    
    console.log("✅ Email sent successfully!");
    console.log("Response:", info.response);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
  
  process.exit(0);
}

testEmail();