import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.test.local');
config({ path: envPath });

if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/boardgame';
}
