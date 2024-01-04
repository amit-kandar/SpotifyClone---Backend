import * as redis from 'redis';

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL
const redisOptions = redisURL.startsWith('redis://')
    ? { url: redisURL }
    : { host: 'localhost', port: 6379 };

// Redis client configuration
const redisClient = redis.createClient(redisOptions);

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

export default redisClient;