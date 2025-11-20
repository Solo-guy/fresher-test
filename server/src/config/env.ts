import { config } from 'dotenv';

config();

const requiredKeys = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'] as const;

requiredKeys.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  defaultTenantId: process.env.DEFAULT_TENANT_ID ?? 'default',
};


