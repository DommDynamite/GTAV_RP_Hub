const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

// Twitch API endpoints
const OAUTH_ENDPOINT = 'https://id.twitch.tv/oauth2/token';
const STREAMS_ENDPOINT = 'https://api.twitch.tv/helix/streams';

// Middleware to serve static files from 'public' directory
app.use(express.static('public'));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/onx.html');
});

// OAuth callback route
app.get('/callback', async (req, res) => {
    const authCode = req.query.code;
    const redirectUri = 'http://localhost:3000/callback'; // This must match the redirect URI registered on Twitch

    // Exchange the authorization code for an access token
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: authCode,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();

        // If the response has an access token, it was successful
        if (data.access_token) {
            // Here you would typically store the token and use it to make further Twitch API requests
            // For the purpose of this example, we'll just send a success message
            res.send('Successfully authenticated with Twitch!');
        } else {
            // Handle errors, such as displaying an error message to the user
            res.send('Error: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error exchanging auth code for token:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to get OAuth token from Twitch
async function getTwitchOAuthToken() {
    try {
        const response = await fetch(OAUTH_ENDPOINT, {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting OAuth token:', error);
        throw new Error('OAuthTokenError');
    }
}

// Function to fetch streams from Twitch API with pagination support
async function fetchStreams(gameId, cursor = '') {
    const accessToken = await getTwitchOAuthToken();
    let allStreams = [];
    let paginationCursor = cursor;

    do {
        const response = await fetch(`${STREAMS_ENDPOINT}?game_id=${gameId}&first=100&after=${paginationCursor}`, { // Use game_id query parameter
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log(`Fetching streams for gameId: ${gameId} with cursor: ${cursor}`);

        const data = await response.json();
        allStreams = [...allStreams, ...data.data]; // Concatenate the new streams

        paginationCursor = data.pagination.cursor; // Update cursor for next page

        // Log the full data for debugging
        //console.log('Twitch API response:', data);
        // Log the number of streams fetched before filtering
        console.log(`Number of streams fetched: ${allStreams.length}`);

    } while (paginationCursor && allStreams.length < 500); // Set a limit to prevent excessive requests

    return allStreams;
}

// Function to fetch channel information from Twitch API
async function fetchChannelInfo(broadcasterIds) {
    const accessToken = await getTwitchOAuthToken();
    const requests = broadcasterIds.map(broadcasterId =>
        fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        })
    );
    const responses = await Promise.all(requests);
    const channels = await Promise.all(responses.map(res => res.json()));

    return channels.flatMap(channel => channel.data); // Flatten the array of data
}

// Function to get the game ID from Twitch API
async function getGameId(gameName) {
    const accessToken = await getTwitchOAuthToken(); // Make sure this function is implemented correctly
    const response = await fetch(`https://api.twitch.tv/helix/games?name=${encodeURIComponent(gameName)}`, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();
    // Assuming "Grand Theft Auto V" exists and the API returns data
    return data.data.length > 0 ? data.data[0].id : null;
}


// Endpoint to get filtered streams with optional title filters from query parameters
app.get('/api/streams', async (req, res) => {
    try {
        const gameName = 'Grand Theft Auto V';
        const gameId = await getGameId(gameName);
        if (!gameId) {
            return res.status(404).send('Game not found');
        }

        // Retrieve title filters from query parameters or use default
        const titleFilters = req.query.titles ? req.query.titles.split(',') : ['ONX', 'ONXRP', 'ONX.gg', 'ONX RP', 'OnxRP', 'Onx RP', 'onxrp', 'onx RP'];
        
        // Fetch all streams for the game
        const streams = await fetchStreams(gameId);

        // Fetch channel information for the streams
        const broadcasterIds = streams.map(stream => stream.user_id);
        const channelsInfo = await fetchChannelInfo(broadcasterIds);

        // Filter the streams based on channel info tags and stream titles
        const filteredStreams = streams.filter(stream => {
            const channel = channelsInfo.find(c => c.broadcaster_id === stream.user_id);
            const titleMatches = titleFilters.some(filter => stream.title.includes(filter));
            const tagMatches = channel && channel.tags_ids && titleFilters.some(filter => channel.tags_ids.includes(filter));
            
            return titleMatches || tagMatches;
        });

        console.log('Twitch API response:', filteredStreams);
        res.json(filteredStreams);

    } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

  

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
