import "dotenv/config";

const port = Number(process.env.PORT || 5000);

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT SECRET is not defined in env");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port,

  databaseUrl: process.env.DATABASE_URL || "",

  jwtSecret,

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d"
};