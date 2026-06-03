const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const DEV_OTP = process.env.DEV_OTP || "123456";
const otpStore = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Missing SMTP configuration.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

function hasSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

async function sendOtpEmail(email, otp) {
  const transporter = getTransporter();
  const sender = process.env.FROM_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from: sender,
    to: email,
    subject: "GradeSync OTP Verification",
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fbff;border:1px solid #dbeafe;border-radius:16px;">
        <h2 style="margin:0 0 12px;color:#1d4ed8;">GradeSync Verification Code</h2>
        <p style="margin:0 0 16px;color:#334155;line-height:1.6;">
          Use the OTP below to continue your GradeSync signup. This code expires in 5 minutes.
        </p>
        <div style="margin:20px 0;padding:18px;border-radius:14px;background:#dbeafe;text-align:center;font-size:32px;font-weight:700;letter-spacing:6px;color:#1e3a8a;">
          ${otp}
        </div>
        <p style="margin:0;color:#64748b;font-size:14px;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `
  });
}

app.post("/api/send-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: "Enter a valid email address." });
  }

  const otp = createOtp();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  if (!hasSmtpConfig() || process.env.NODE_ENV !== "production" && process.env.USE_DEV_OTP === "true") {
    otpStore.set(email, { otp: DEV_OTP, expiresAt });
    return res.json({
      ok: true,
      message: `Demo OTP ready. Use ${DEV_OTP}.`,
      devOtp: DEV_OTP
    });
  }

  try {
    await sendOtpEmail(email, otp);
    otpStore.set(email, { otp, expiresAt });
    return res.json({ ok: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Unable to send OTP email. Check backend email configuration."
    });
  }
});

app.post("/api/verify-otp", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  const record = otpStore.get(email);

  if (!record) {
    return res.status(400).json({ ok: false, message: "Send OTP first." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ ok: false, message: "OTP expired. Please resend it." });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ ok: false, message: "Incorrect OTP." });
  }

  otpStore.delete(email);
  return res.json({ ok: true, message: "OTP verified successfully." });
});

app.listen(PORT, () => {
  console.log(`GradeSync backend running on http://localhost:${PORT}`);
});
