import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const API_URL = 'http://localhost:5000/api';
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "YOUR_API_KEY",
  authDomain: "upsc-tracker-7749d.firebaseapp.com",
  projectId: "upsc-tracker-7749d",
  storageBucket: "upsc-tracker-7749d.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function getAuthToken() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password');
    return await userCredential.user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
}

async function testEndpoints() {
  try {
    const token = await getAuthToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Test User Endpoints
    console.log('\nTesting User Endpoints...');
    const userResponse = await axios.post(`${API_URL}/users`, {
      email: 'test@example.com',
      name: 'Test User',
    }, { headers });
    console.log('Create User:', userResponse.data);

    // Test Study Session Endpoints
    console.log('\nTesting Study Session Endpoints...');
    const sessionResponse = await axios.post(`${API_URL}/study-sessions`, {
      subject: 'Mathematics',
      topic: 'Algebra',
      notes: 'Test session',
    }, { headers });
    console.log('Create Study Session:', sessionResponse.data);

    const sessionId = sessionResponse.data._id;
    const endSessionResponse = await axios.post(
      `${API_URL}/study-sessions/${sessionId}/end`,
      { notes: 'Completed test session' },
      { headers }
    );
    console.log('End Study Session:', endSessionResponse.data);

    // Test Syllabus Endpoints
    console.log('\nTesting Syllabus Endpoints...');
    const syllabusResponse = await axios.post(`${API_URL}/syllabus`, {
      subject: 'Physics',
      topic: 'Mechanics',
      subtopics: ['Newton\'s Laws', 'Gravity'],
      priority: 'high',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }, { headers });
    console.log('Create Syllabus Item:', syllabusResponse.data);

    // Test Calendar Endpoints
    console.log('\nTesting Calendar Endpoints...');
    const calendarResponse = await axios.post(`${API_URL}/calendar`, {
      title: 'Study Physics',
      description: 'Review mechanics chapter',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      type: 'study',
      subject: 'Physics',
      topic: 'Mechanics',
      isRecurring: false,
    }, { headers });
    console.log('Create Calendar Event:', calendarResponse.data);

    // Test Analytics Endpoints
    console.log('\nTesting Analytics Endpoints...');
    const analyticsResponse = await axios.get(`${API_URL}/analytics/daily`, { headers });
    console.log('Get Daily Analytics:', analyticsResponse.data);

    // Get all items
    console.log('\nGetting all items...');
    const [sessions, syllabus, events, analytics] = await Promise.all([
      axios.get(`${API_URL}/study-sessions`, { headers }),
      axios.get(`${API_URL}/syllabus`, { headers }),
      axios.get(`${API_URL}/calendar`, { headers }),
      axios.get(`${API_URL}/analytics/weekly`, { headers }),
    ]);

    console.log('All Study Sessions:', sessions.data);
    console.log('All Syllabus Items:', syllabus.data);
    console.log('All Calendar Events:', events.data);
    console.log('Weekly Analytics:', analytics.data);

  } catch (error) {
    console.error('Error testing endpoints:', error.response?.data || error.message);
  }
}

testEndpoints(); 