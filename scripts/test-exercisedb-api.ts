import * as https from 'https';
import { config } from 'dotenv';

config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY || '';
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

async function testAPI() {
  console.log('>� Testing ExerciseDB API\n');
  console.log(`API Key: ${RAPIDAPI_KEY.substring(0, 10)}...`);
  console.log(`API Host: ${RAPIDAPI_HOST}\n`);

  // Test with a known exercise ID
  const testId = '0001'; // Common exercise ID

  console.log(`Testing with exercise ID: ${testId}\n`);

  const options = {
    method: 'GET',
    hostname: RAPIDAPI_HOST,
    path: `/exercises/exercise/${testId}`,
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log('');

    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Raw Response:');
      console.log(data);
      console.log('');

      try {
        const parsed = JSON.parse(data);
        console.log('Parsed Response:');
        console.log(JSON.stringify(parsed, null, 2));
        console.log('');

        if (parsed.gifUrl) {
          console.log('✅ gifUrl found:', parsed.gifUrl);
        } else {
          console.log('❌ No gifUrl in response');
          console.log('Available fields:', Object.keys(parsed));
        }
      } catch (e) {
        console.log('❌ Failed to parse JSON');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.end();
}

testAPI();

