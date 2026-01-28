import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.test.local');
if (existsSync(envPath)) {
    config({ path: envPath });
}
