import 'dotenv/config';
import path from 'path';
import fs from 'fs';

console.log('--- Environment & Firebase Path Check ---');
const credVar = process.env.MEDIFIND_FIREBASE_CREDENTIALS;
console.log('MEDIFIND_FIREBASE_CREDENTIALS:', credVar);

if (credVar) {
    const resolvedPath = path.resolve(process.cwd(), credVar.replace(/^"(.*)"$/, '$1'));
    console.log('Resolved Path:', resolvedPath);
    console.log('File Exists:', fs.existsSync(resolvedPath));
} else {
    console.log('❌ MEDIFIND_FIREBASE_CREDENTIALS is not set in .env');
    const fallback = path.resolve(process.cwd(), 'firebase-adminsdk.json');
    console.log('Checking fallback (root):', fallback);
    console.log('Fallback exists:', fs.existsSync(fallback));
}

console.log('\n--- System Conflict Check ---');
console.log('System GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
