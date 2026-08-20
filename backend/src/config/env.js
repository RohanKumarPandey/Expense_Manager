const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN"];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
};

module.exports = validateEnv;
