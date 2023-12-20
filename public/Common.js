export function displayStreams(streams) {
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
        checkbox.checked = isChecked(stream.id);

        checkbox.addEventListener('change', () => {
            saveCheckedState(stream.id, checkbox.checked);

            moveStreamDiv(stream.id, checkbox.checked);
        });

        const button = document.createElement('button');
        button.textContent = 'Main Stage';
        button.addEventListener('click', () => setAsMainStage(stream));

        new Twitch.Embed(streamDiv, {
            width: '100%',
            height: '100%',
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
        pageSelector.value=currentPage;
        
        pageSelector.addEventListener('change', function() {
        window.location.href = this.value;
        });
    });

    // After streams have been added to the DOM, load their checked state
    loadCheckedState();
}

export function setAsMainStage(stream) {
    const mainStageContainer = document.getElementById('main-stage');
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

export function setHideButtonListener(){
    const hideButton = document.getElementById('main-stage-hide-button');
    const mainStreamContainer = document.getElementById('main-stream');

    hideButton.addEventListener('click', function() {
        // Clear the main stream container
        mainStreamContainer.innerHTML = '';

        // Run the toggleMainStageVisibility function
        toggleMainStageVisibility(mainStreamContainer);
    });
}