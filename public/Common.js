let activeStreams = {}; // Global variable to keep track of active streams
let loadedStreamPositions = {};
let currentOffset = 0;
const limit = 10; // Number of streams to load each time



export function displayStreams(streams, titleFilters, tagFilters) {
    const streamGrid = document.getElementById('stream-grid');
    const currentStreamIds = Object.keys(activeStreams);

    // Apply title and tag filters
    const filteredStreams = streams.filter(stream => {
        const titleMatches = titleFilters.some(filter => {
            const regex = new RegExp("\\b" + filter.trim().toLowerCase() + "\\b");
            return regex.test(stream.title.toLowerCase());
        });

        const tagMatches = tagFilters.length > 0 && stream.tags && tagFilters.some(filter => {
            const regex = new RegExp("\\b" + filter.trim().toLowerCase() + "\\b");
            return stream.tags.some(tag => regex.test(tag.toLowerCase()));
        });

        return titleMatches || tagMatches;
    });

    // Load a set of streams based on currentOffset and limit
    const paginatedStreams = filteredStreams.slice(currentOffset, currentOffset + limit);
    currentOffset += limit;    

    if (paginatedStreams.length > 0) {
        // Find streams to remove
        currentStreamIds.forEach(id => {
            if (!paginatedStreams.some(stream => stream.id === id)) {
                streamGrid.removeChild(activeStreams[id]);
                delete activeStreams[id];
            }
        });

        // Find new streams to add
        paginatedStreams.forEach(stream => {
            if (!activeStreams[stream.id]) {
                const streamDiv = createStreamDiv(stream);
                activeStreams[stream.id] = streamDiv; // Add to activeStreams
            }
        });

        // After streams have been added to the DOM, load their checked state
        loadCheckedState();

        // Re-sort the streams in the DOM based on the checked state
        paginatedStreams.sort((a, b) => {
            const aChecked = isChecked(a.id);
            const bChecked = isChecked(b.id);
            return aChecked === bChecked ? 0 : aChecked ? -1 : 1;
        }).forEach(stream => {
            // Append or move existing div to the correct position
            streamGrid.appendChild(activeStreams[stream.id]);
        });
    }

    

    return filteredStreams;

}

export function adjustStreams(streams) {
    const streamGrid = document.getElementById('stream-grid');
    const currentStreamIds = Object.keys(activeStreams);


    // Find streams to remove
    currentStreamIds.forEach(id => {
        if (!streams.some(stream => stream.id === id)) {
            streamGrid.removeChild(activeStreams[id]);
            delete activeStreams[id];
        }
    });

    // Find new streams to add
    streams.forEach(stream => {
        if (!activeStreams[stream.id]) {
            const streamDiv = createStreamDiv(stream);
            activeStreams[stream.id] = streamDiv; // Add to activeStreams
        }
    });

    // After streams have been added to the DOM, load their checked state
    loadCheckedState();

    // Re-sort the streams in the DOM based on the checked state
    streams.sort((a, b) => {
        const aChecked = isChecked(a.id);
        const bChecked = isChecked(b.id);
        return aChecked === bChecked ? 0 : aChecked ? -1 : 1;
    }).forEach(stream => {
        // Append or move existing div to the correct position
        streamGrid.appendChild(activeStreams[stream.id]);
    });


    

}


function createStreamDiv(stream) {
    const streamDiv = document.createElement('div');
    streamDiv.className = 'stream';
    streamDiv.setAttribute('data-stream-id', stream.id);

    // Twitch Embed
    new Twitch.Embed(streamDiv, {
        width: '100%',
        height: '100%',
        channel: stream.user_login, // Adjust based on your API response
        layout: 'video',
        muted: true,
    });

    // Stream Controls (e.g., checkbox, button)
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'stream-controls';

    // Add checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('data-stream-id', stream.id);
    checkbox.checked = isChecked(stream.id);
    checkbox.addEventListener('change', () => {
        saveCheckedState(stream.id, checkbox.checked);
        moveStreamDiv(stream.id, checkbox.checked);
    });
    controlsDiv.appendChild(checkbox);

    // Add button
    const button = document.createElement('button');
    button.textContent = 'Main Stage';
    button.addEventListener('click', () => setAsMainStage(stream));
    controlsDiv.appendChild(button);

    // Append controls to streamDiv
    streamDiv.appendChild(controlsDiv);

    return streamDiv;
}


let currentMainStageStream = null; // Global variable to track the current main stage stream

export function setAsMainStage(stream) {
    const mainStageContainer = document.getElementById('main-stage');
    const mainStreamContainer = document.getElementById('main-stream');
    const streamGrid = document.getElementById('stream-grid');

    // Handle existing main stage stream
    if (currentMainStageStream && currentMainStageStream.id !== stream.id) {
        // Re-add the existing main stage stream to the grid
        const existingMainStreamDiv = createStreamDiv(currentMainStageStream);
        streamGrid.appendChild(existingMainStreamDiv);
        activeStreams[currentMainStageStream.id] = existingMainStreamDiv;
    }

    // Set new main stage stream
    currentMainStageStream = stream; // Update the current main stage stream
    mainStreamContainer.innerHTML = ''; // Clear the current main stream

    // Create and add the new main stream embed
    const newMainStreamDiv = document.createElement('div');
    newMainStreamDiv.className = 'stream-main';
    new Twitch.Embed(newMainStreamDiv, {
        width: '100%',
        height: '100%',
        channel: stream.user_login,
    });
    mainStreamContainer.appendChild(newMainStreamDiv);

    // Remove the new main stage stream from the grid
    const streamDiv = document.querySelector(`div[data-stream-id="${stream.id}"]`);
    if (streamDiv) {
        streamGrid.removeChild(streamDiv);
        delete activeStreams[stream.id]; // Update the active streams list
    }

    // Update visibility of the main stage
    toggleMainStageVisibility(mainStreamContainer);
}



export function toggleMainStageVisibility(mainStreamContainer) {
    const mainStageContainer = document.getElementById('main-stage');

    if (mainStreamContainer.children.length === 0) {
        mainStageContainer.style.display = 'none';
    } else {
        mainStageContainer.classList.remove('hidden');
        mainStageContainer.style.display = 'block'; // Make the element visible
        mainStageContainer.style.animationPlayState = 'running';
    }
}

export function saveCheckedState(streamId, isChecked) {
    // Get the array of checked streams from local storage or initialize it if not present
    let checkedStreams = JSON.parse(localStorage.getItem('checkedStreams')) || [];

    if (isChecked) {
        // Add the stream ID to the array if it's checked and not already present
        if (!checkedStreams.includes(streamId)) {
            checkedStreams.push(streamId);
        }
    } else {
        // Remove the stream ID from the array if it's unchecked
        checkedStreams = checkedStreams.filter(id => id !== streamId);
    }

    // Save the updated array back to local storage
    localStorage.setItem('checkedStreams', JSON.stringify(checkedStreams));
}

export function loadCheckedState() {
    const checkedStreams = JSON.parse(localStorage.getItem('checkedStreams')) || [];
    checkedStreams.forEach(streamId => {
        const checkbox = document.querySelector(`.stream-controls input[data-stream-id="${streamId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

export function isChecked(streamId) {
    const checkedStreams = JSON.parse(localStorage.getItem('checkedStreams')) || [];
    return checkedStreams.includes(streamId);
}

export function moveStreamDiv(streamId, isChecked) {
    const streamDiv = document.querySelector(`div[data-stream-id="${streamId}"]`);
    const streamGrid = document.getElementById('stream-grid');

    // Calculate the distance to move
    const distanceToMove = streamDiv.offsetTop - streamGrid.offsetTop;

    if (isChecked) {
        // Apply a negative transform to move it up
        streamDiv.style.transform = `translateY(-${distanceToMove}px)`;
    } else {
        // Reset transform when moving it back to its original position
        streamDiv.style.transform = 'translateY(0)';
    }

    // Ensure the transition has time to complete
    setTimeout(() => {
        if (isChecked) {
            streamGrid.prepend(streamDiv);
        } else {
            streamGrid.appendChild(streamDiv);
        }
        // Reset the transform style
        streamDiv.style.transform = '';
    }, 1000); // Match this duration to the CSS transition duration
}

export function displayMoreStreams(allStreams) {
    // Check if there are more streams to load
    if (currentOffset >= allStreams.length) return;

    const additionalStreams = allStreams.slice(currentOffset, currentOffset + limit);
    currentOffset += limit;

    // Append these additional streams to the DOM
    additionalStreams.forEach(stream => {
        const streamDiv = createStreamDiv(stream);
        document.getElementById('stream-grid').appendChild(streamDiv);
    });

    // ...any other logic you need when new streams are added
}

export function setHideButtonListener(){
    const hideButton = document.getElementById('main-stage-hide-button');
    const mainStreamContainer = document.getElementById('main-stream');

    hideButton.addEventListener('click', function() {
        // Clear the main stream container
        mainStreamContainer.innerHTML = '';

        // Run the toggleMainStageVisibility function
        toggleMainStageVisibility(mainStreamContainer);
    });

    document.getElementById('refresh-streams').addEventListener('click', async function(event) {
        event.preventDefault();
        try {
            const response = await fetch('/api/streams');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const streams = await response.json();
            adjustStreams(streams);
        } catch (error) {
            console.error('Error refreshing streams:', error);
            // Handle error (e.g., show a message to the user)
        }
    });

    const pageSelector = document.getElementById('page-selector');

    pageSelector.addEventListener('change', function() {
        const selectedPage = this.value;
        window.location.href = selectedPage; // Navigate to the selected page
    });

    
    
    
}