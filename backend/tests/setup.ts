import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_UPLOAD_DIR = path.join(os.tmpdir(), 'inkroom-test-uploads');
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.PUBLIC_API_URL = 'http://localhost:4000';
process.env.FRONTEND_REVALIDATE_URL = '';
process.env.MAX_UPLOAD_MB = '2';
process.env.TRUST_PROXY = '1';
