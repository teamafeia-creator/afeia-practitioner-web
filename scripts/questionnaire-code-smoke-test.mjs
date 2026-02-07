const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const authToken = process.env.AUTH_TOKEN;
const consultantId = process.env.CONSULTANT_ID;
const consultantEmail = process.env.CONSULTANT_EMAIL;
const code = process.env.CODE;

if (!authToken || !consultantId || !consultantEmail) {
  console.error('Missing env vars. Required: AUTH_TOKEN, CONSULTANT_ID, CONSULTANT_EMAIL.');
  process.exit(1);
}

const sendResponse = await fetch(
  `${apiBaseUrl}/api/consultants/${consultantId}/questionnaire/send-code`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }
);

if (!sendResponse.ok) {
  console.error('Send code failed:', await sendResponse.text());
  process.exit(1);
}

const sendPayload = await sendResponse.json();
console.log('Send code OK:', sendPayload);

if (!code) {
  console.log('Provide CODE env var to verify the code from the email inbox.');
  process.exit(0);
}

const verifyResponse = await fetch(`${apiBaseUrl}/api/questionnaire/verify-code`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: consultantEmail, code })
});

if (!verifyResponse.ok) {
  console.error('Verify code failed:', await verifyResponse.text());
  process.exit(1);
}

const verifyPayload = await verifyResponse.json();
console.log('Verify code OK:', verifyPayload);
