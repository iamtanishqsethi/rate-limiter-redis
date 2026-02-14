
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config()

export const client = createClient({
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_URL || '',
        port: parseInt(process.env.REDIS_PORT || '0')
    }
});