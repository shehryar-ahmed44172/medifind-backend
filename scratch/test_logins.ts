const BASE_URL = 'http://localhost:3000/api/auth';

async function testLogin(email: string, password: string) {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data: any = await response.json();

    if (response.ok) {
      console.log(`✅ Success for ${email} with password ${password}`);
      return true;
    } else {
      console.log(`❌ Failed for ${email} with password ${password}: ${data.message || response.statusText}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Error for ${email}: ${error.message}`);
    return false;
  }
}

async function main() {
  const emails = [
    'responder1776075255538@test.com',
    'patient1776075255385@test.com',
    'ashehryar@gmail.com',
    'test@gmail.com'
  ];
  
  const passwords = [
    'SecurePassword123!',
    'SecurePass123!',
    'password',
    '12345678'
  ];

  for (const email of emails) {
    for (const password of passwords) {
      const result = await testLogin(email, password);
      if (result) break;
    }
  }
}

main();
