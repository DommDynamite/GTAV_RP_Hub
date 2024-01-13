let activeStreams = {}; // Global variable to keep track of active streams
let loadedStreamPositions = {};
let currentOffset = 0;
const limit = 6; // Number of streams to load each time
const initLoadLimit = 6;



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
    const paginatedStreams = filteredStreams.slice(currentOffset, currentOffset + initLoadLimit);
    currentOffset += initLoadLimit;    

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

    paginatedStreams.forEach((stream, index) => {
        if (!activeStreams[stream.id]) {
            const streamDiv = createStreamDiv(stream);
            activeStreams[stream.id] = streamDiv;
            streamGrid.appendChild(streamDiv);
            loadedStreamPositions[stream.id] = index; // Store position
        }
    });

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

    // Channel Name
    const channelNameDiv = document.createElement('div');
    channelNameDiv.className = 'channel-name';
    channelNameDiv.textContent = stream.user_name || 'Channel Name'; // Replace with actual channel name if available
    streamDiv.appendChild(channelNameDiv);

    // Container for Twitch Embed
    const embedContainer = document.createElement('div');
    embedContainer.className = 'embed-container';
    streamDiv.appendChild(embedContainer);

    // Twitch Embed
    new Twitch.Embed(embedContainer, {
        width: '100%',
        height: '100%',
        channel: stream.user_login,
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



export function nextPageOfStreams(allStreams) {
    if (currentOffset >= allStreams.length) {
        return; // Do nothing if at the end
    }

    const streamGrid = document.getElementById('stream-grid');
    streamGrid.innerHTML = ''; // Clear existing streams

    // Calculate the end index for slicing and ensure it doesn't exceed the array length
    const endIndex = Math.min(currentOffset + limit, allStreams.length);
    const streamsToLoad = allStreams.slice(currentOffset, endIndex);
    
    streamsToLoad.forEach(stream => {
        // Check if the stream is not already in the DOM
        if (!document.querySelector(`[data-stream-id="${stream.id}"]`)) {
            const streamDiv = createStreamDiv(stream);
            streamGrid.appendChild(streamDiv);
        }
    });

    currentOffset = endIndex; // Update the offset after loading the streams
}




export function previousPageOfStreams(allStreams) {
    if (currentOffset === 0) {
        return; // Do nothing if at the start
    }

    const streamGrid = document.getElementById('stream-grid');
    streamGrid.innerHTML = ''; // Clear existing streams

    // Adjust currentOffset to go to the previous set of streams
    currentOffset = Math.max(currentOffset - limit, 0);

    // Calculate the start index for the previous page
    const startIndex = Math.max(currentOffset - limit, 0);

    const streamsToLoad = allStreams.slice(startIndex, startIndex + limit);

    streamsToLoad.forEach(stream => {
        // Check if the stream is not already in the DOM
        if (!document.querySelector(`[data-stream-id="${stream.id}"]`)) {
            const streamDiv = createStreamDiv(stream);
            streamGrid.appendChild(streamDiv);
        }
    });

    // Update currentOffset after loading the streams
    currentOffset = startIndex;
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

    const pageSelector = document.getElementById('page-selector');

    pageSelector.addEventListener('change', function() {
        const selectedPage = this.value;
        window.location.href = selectedPage; // Navigate to the selected page
    });

    
    
    
}