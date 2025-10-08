#!/bin/bash

# Test tour creation using the existing project API

GAME_ID="56ffb8f1-2836-482d-b1d9-dd33ec3dbac2"
ARTIST_ID="99025461-85f1-48e4-ad03-39bd773f20b7"

echo "Testing Tour Creation via Project API"
echo "====================================="
echo ""
echo "Game ID: $GAME_ID"
echo "Artist ID: $ARTIST_ID"
echo ""

# Create a tour using the project endpoint
echo "Creating Mini-Tour project..."
curl -X POST "http://localhost:5000/api/game/$GAME_ID/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nova Sterling Summer Tour",
    "type": "Mini-Tour",
    "artistId": "'$ARTIST_ID'",
    "totalCost": 8000,
    "budgetPerSong": 0,
    "songCount": 0,
    "producerTier": "local",
    "timeInvestment": "standard",
    "metadata": {
      "performanceType": "mini_tour",
      "cities": 3,
      "venueAccess": "clubs",
      "createdFrom": "test-script"
    }
  }' \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

echo ""
echo ""
echo "Fetching all projects to verify..."
curl -X GET "http://localhost:5000/api/game/$GAME_ID" \
  --cookie cookies.txt \
  | jq '.projects[] | select(.type == "Mini-Tour") | {title, type, totalCost, metadata}'