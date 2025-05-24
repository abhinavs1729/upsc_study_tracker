const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function getAuthToken() {
  try {
    // Create a custom token
    const customToken = await admin.auth().createCustomToken('test-user');
    console.log('Custom token:', customToken);
    
    // You can also create a user and get their ID token
    // const userRecord = await admin.auth().createUser({
    //   email: 'test@example.com',
    //   password: 'testpassword123',
    // });
    // const idToken = await admin.auth().createCustomToken(userRecord.uid);
    // console.log('ID token:', idToken);
  } catch (error) {
    console.error('Error getting auth token:', error);
  } finally {
    process.exit();
  }
}

getAuthToken(); 