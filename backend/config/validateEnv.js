// Environment variable validation

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGO_URI',
  'NODE_ENV'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // Validate JWT_SECRET strength (optional check)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    console.warn('Warning: JWT_SECRET should be at least 32 characters for better security');
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.error('NODE_ENV must be one of:', validEnvs.join(', '));
    process.exit(1);
  }

  console.log('Environment variables validated successfully');
};

module.exports = { validateEnv };
