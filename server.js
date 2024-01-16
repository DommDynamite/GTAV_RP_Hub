const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const CACHE_DURATION = 8 * 60 * 1000; // 5 minutes in milliseconds
let streamCache = {}; // Cache to store streams data

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
async function fetchStreams(gameId) {
    const accessToken = await getTwitchOAuthToken();
    let allStreams = [];
    let paginationCursor = '';
    let isRateLimited = false;

    async function waitForRateLimitReset(resetTime) {
        const waitTime = resetTime * 1000 - Date.now();
        return new Promise(resolve => setTimeout(resolve, waitTime));
    }

    do {
        try {
            const response = await fetch(`${STREAMS_ENDPOINT}?game_id=${gameId}&first=100&after=${paginationCursor}`, {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.status === 429) { // Rate limited
                console.log('Rate Limit Hit, will wait and retry.')
                const retryAfter = response.headers.get('Retry-After') || 60; // Default to 60 seconds
                await waitForRateLimitReset(Date.now() / 1000 + parseInt(retryAfter));
                continue;
            }

            const data = await response.json();
            allStreams = [...allStreams, ...data.data];
            paginationCursor = data.pagination.cursor;

            const rateLimitRemaining = response.headers.get('Ratelimit-Remaining');
            if (rateLimitRemaining && parseInt(rateLimitRemaining) < 5) { // Approaching rate limit
                const rateLimitReset = response.headers.get('Ratelimit-Reset');
                await waitForRateLimitReset(parseInt(rateLimitReset));
            }
        } catch (error) {
            console.error('Error fetching streams:', error);
            break; // Optionally break or implement a retry logic
        }
    } while (paginationCursor && allStreams.length < 4000 && !isRateLimited); 

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

// Function to update the cache
async function updateStreamCache() {
    try {
        // Fetch streams and update the cache
        // This can be customized based on the pages you have
        const gameId = await getGameId('Grand Theft Auto V');
        const streams = await fetchStreams(gameId);
        // ... additional logic to filter and process streams
        streamCache['Grand Theft Auto V'] = streams; // Example key
    } catch (error) {
        console.error('Error updating stream cache:', error);
    }
}

// Scheduled task to update the cache
setInterval(updateStreamCache, CACHE_DURATION);
updateStreamCache(); // Initial cache update

// Endpoint to get filtered streams with optional title filters from query parameters
app.get('/api/streams', (req, res) => {
    const gameName = req.query.gameName || 'Grand Theft Auto V'; // Example query parameter
    const cachedStreams = streamCache[gameName] || [];
    res.json(cachedStreams);
});


  

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
