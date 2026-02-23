import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "PORT",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
  "FRONTEND_URL",
  "BACKEND_URL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_EXPIRY",
  "EMAIL_VERIFICATION_EXPIRY_MINUTES",
  "RESET_PASSWORD_EXPIRY_MINUTES",
  "BCRYPT_SALT_ROUNDS",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,

  NODE_ENV: process.env.NODE_ENV,

  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,

  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,

  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  EMAIL_VERIFICATION_EXPIRY_MINUTES: Number(
    process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES,
  ),

  RESET_PASSWORD_EXPIRY_MINUTES: Number(
    process.env.RESET_PASSWORD_EXPIRY_MINUTES,
  ),

  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS),
};
