document.addEventListener('DOMContentLoaded', function() {
    const mainStreamContainer = document.getElementById('main-stream');
    const markedStreamsContainer = document.getElementById('marked-streams');
    const searchBox = document.getElementById('search-box');
    const filterLinks = document.querySelectorAll('.filter-link');
    let allStreams = [];
    const newTitleFilters = 'nopixel,No Pixel,NO PIXEL,NOPIXEL,NoPixel';

    fetch(`/api/streams?titles=${encodeURIComponent(newTitleFilters)}`)
        .then(response => response.json())
        .then(streams => {
            allStreams = streams; // Save all fetched streams
            displayStreams(streams); // Display all streams initially
        })
        .catch(error => {
            console.error('Error loading streams:', error);
            // Handle error (e.g., show a message to the user)
        });

    // Search box event listener
    searchBox.addEventListener('input', () => {
        const searchText = searchBox.value.toLowerCase();
        const filteredStreams = allStreams.filter(stream => stream.title.toLowerCase().includes(searchText));
        displayStreams(filteredStreams);
    });

    // Filter link event listeners
    filterLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Remove 'active' class from all links
            filterLinks.forEach(link => link.classList.remove('active'));
            // Add 'active' class to the clicked link
            link.classList.add('active');

            const filterCriteria = link.getAttribute('data-filter').split(','); // Split the data-filter into an array
            const filteredStreams = allStreams.filter(stream => {
                return filterCriteria.some(criteria => 
                    stream.title.toLowerCase().includes(criteria.toLowerCase()) ||
                    stream.tags.some(tag => tag.toLowerCase().includes(criteria.toLowerCase()))
                );
            });
            displayStreams(filteredStreams);
            loadCheckedState();
        });
    });

    // Initially hide the main stage if it's empty
    toggleMainStageVisibility(mainStreamContainer);
});

function displayStreams(streams) {
    const streamGrid = document.getElementById('stream-grid');
    streamGrid.innerHTML = ''; // Clear existing streams

    // Sort streams: checked streams first
    streams.sort((a, b) => {
        const aChecked = isChecked(a.id);
        const bChecked = isChecked(b.id);
        return aChecked === bChecked ? 0 : aChecked ? -1 : 1;
    });

    streams.forEach(stream => {
        const streamDiv = document.createElement('div');
        streamDiv.className = 'stream';
        streamDiv.setAttribute('data-stream-id', stream.id);

        // Controls (checkbox and button)
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'stream-controls';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-stream-id', stream.id);

        if (isChecked(stream.id)) {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', () => {
            saveCheckedState(stream.id, checkbox.checked);
            
            const currentStreams = allStreams.slice();
            displayStreams(currentStreams);
        });

        const button = document.createElement('button');
        button.textContent = 'Main Stage';
        button.addEventListener('click', () => setAsMainStage(stream));

        new Twitch.Embed(streamDiv, {
            width: 1280,
            height: 720,
            channel: stream.user_login, // Adjust based on your API response
            layout: 'video',
            muted: true,
        });

        controlsDiv.appendChild(checkbox);
        controlsDiv.appendChild(button);
        streamDiv.appendChild(controlsDiv);
        streamGrid.appendChild(streamDiv);

        // Page Selector
        const pageSelector = document.getElementById('page-selector');
    
        // Set the current page as selected in the dropdown
        const currentPage = window.location.pathname.split("/").pop();
        pageSelector.value = currentPage;
        
        pageSelector.addEventListener('change', function() {
            window.location.href = this.value;
        });
    });

    // After streams have been added to the DOM, load their checked state
    loadCheckedState();
}

function setAsMainStage(stream) {
    const mainStreamContainer = document.getElementById('main-stream');
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

    // Update visibility of the main stage
    toggleMainStageVisibility(mainStreamContainer);
}

function toggleMainStageVisibility(mainStreamContainer) {
    if (mainStreamContainer.children.length === 0) {
        mainStreamContainer.classList.add('hidden');
    } else {
        mainStreamContainer.classList.remove('hidden');
    }
}

function saveCheckedState(streamId, isChecked) {
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

function loadCheckedState() {
    const checkedStreams = JSON.parse(localStorage.getItem('checkedStreams')) || [];
    checkedStreams.forEach(streamId => {
        const checkbox = document.querySelector(`.stream-controls input[data-stream-id="${streamId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

function isChecked(streamId) {
    const checkedStreams = JSON.parse(localStorage.getItem('checkedStreams')) || [];
    return checkedStreams.includes(streamId);
}

