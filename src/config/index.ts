// Configuration modules will be exported here
// Database, Redis, and environment configuration

export const config = {
  port: process.env.PORT || 3100,
  env: process.env.NODE_ENV || 'development',
};
