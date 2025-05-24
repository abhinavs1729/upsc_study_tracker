#!/bin/bash

# Base URL
API_URL="http://localhost:5000/api"

# Firebase configuration
FIREBASE_CONFIG='{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "projectId": "YOUR_PROJECT_ID"
}'

# Test user credentials
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123"

# Test user data
TEST_USER='{
  "email": "'$TEST_EMAIL'",
  "name": "Test User"
}'

# Test study session data
TEST_SESSION='{
  "subject": "Mathematics",
  "topic": "Algebra",
  "notes": "Test session"
}'

# Test syllabus data
TEST_SYLLABUS='{
  "subject": "Physics",
  "topic": "Mechanics",
  "subtopics": ["Newton'\''s Laws", "Gravity"],
  "priority": "high",
  "targetDate": "'$(date -v+7d -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Test calendar event data
TEST_EVENT='{
  "title": "Study Physics",
  "description": "Review mechanics chapter",
  "startTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "endTime": "'$(date -v+2H -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "type": "study",
  "subject": "Physics",
  "topic": "Mechanics",
  "isRecurring": false
}'

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to get Firebase ID token
get_auth_token() {
  echo "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLklkZW50aXR5VG9vbGtpdCIsImlhdCI6MTc0NzY2NjA1MiwiZXhwIjoxNzQ3NjY5NjUyLCJpc3MiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0B1cHNjLXRyYWNrZXItNzc0OWQuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0B1cHNjLXRyYWNrZXItNzc0OWQuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1aWQiOiJ0ZXN0LXVzZXIifQ.LRZ7d54ksQLmCp4g_weMXV9CvKdnAo_pgUPpI5SwsLLr96UvPBlP1OsB2WKOV6hrxv14omQ7z3Z6WhBV52wX-knGzm8W_GGB5yd-XWVqOpMtfhCtuJg9ky6qgz8b7X62KZ8e_j7PtZAoCWWvKZJd_2Fum6r8wyUBCZt_K-IfUKarTVVaJrT-Jx6T9EWBVupZFaeAz17hWuy-uveZ-lkxl11_YtWdn2JjWQAFPE4CP5nEWfuvctSm9DJvxtBfo7BNBiZj2q7cGBgCScT1ba1yimJdeoIlxNLS3mLzwrvj3HGVZcmKiZPSzTrl3Id8ZPgNbUSTfnsWoRYTWOBV5_K59Q"
}

# Get authentication token
AUTH_TOKEN=$(get_auth_token)

echo "Testing API Endpoints..."
echo "========================"

# Test User Endpoints
echo -e "\n${GREEN}Testing User Endpoints...${NC}"
echo "Creating user..."
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$TEST_USER" \
  "$API_URL/users"
echo -e "\n"

# Test Study Session Endpoints
echo -e "\n${GREEN}Testing Study Session Endpoints...${NC}"
echo "Creating study session..."
SESSION_RESPONSE=$(curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$TEST_SESSION" \
  "$API_URL/study-sessions")
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '._id')
echo "Created session with ID: $SESSION_ID"

echo "Ending study session..."
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"notes": "Completed test session"}' \
  "$API_URL/study-sessions/$SESSION_ID/end"
echo -e "\n"

# Test Syllabus Endpoints
echo -e "\n${GREEN}Testing Syllabus Endpoints...${NC}"
echo "Creating syllabus item..."
SYLLABUS_RESPONSE=$(curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$TEST_SYLLABUS" \
  "$API_URL/syllabus")
SYLLABUS_ID=$(echo $SYLLABUS_RESPONSE | jq -r '._id')
echo "Created syllabus item with ID: $SYLLABUS_ID"
echo -e "\n"

# Test Calendar Endpoints
echo -e "\n${GREEN}Testing Calendar Endpoints...${NC}"
echo "Creating calendar event..."
EVENT_RESPONSE=$(curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$TEST_EVENT" \
  "$API_URL/calendar")
EVENT_ID=$(echo $EVENT_RESPONSE | jq -r '._id')
echo "Created calendar event with ID: $EVENT_ID"
echo -e "\n"

# Test Analytics Endpoints
echo -e "\n${GREEN}Testing Analytics Endpoints...${NC}"
echo "Getting daily analytics..."
curl -v -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/analytics/daily"
echo -e "\n"

echo "Getting weekly analytics..."
curl -v -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/analytics/weekly"
echo -e "\n"

# Get all items
echo -e "\n${GREEN}Getting all items...${NC}"
echo "Getting all study sessions..."
curl -v -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/study-sessions"
echo -e "\n"

echo "Getting all syllabus items..."
curl -v -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/syllabus"
echo -e "\n"

echo "Getting all calendar events..."
curl -v -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/calendar"
echo -e "\n"

echo -e "\n${GREEN}API Testing Complete!${NC}" 