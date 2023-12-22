import { displayStreams, setAsMainStage, toggleMainStageVisibility, saveCheckedState, loadCheckedState, isChecked, moveStreamDiv} from '/Common.js'

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
                return filterCriteria.some(criteria => {
                    const regex = new RegExp("\\b" + criteria.trim().toLowerCase() + "\\b"); // Match whole word
                    return regex.test(stream.title.toLowerCase()) ||
                           stream.tags.some(tag => regex.test(tag.toLowerCase()));
                });
            });
            displayStreams(filteredStreams);
            loadCheckedState();
        });
    });


    setHideButtonListener();

    // Initially hide the main stage if it's empty
    toggleMainStageVisibility(mainStreamContainer);
});