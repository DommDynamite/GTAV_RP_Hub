import { displayStreams, toggleMainStageVisibility, addEventListeners, nextPageOfStreams, previousPageOfStreams, searchBoxDisplayStreams, loadCheckedState} from '/Common.js'
let allStreams = [];

let retryCount = 0;
const maxRetries = 5; // Maximum number of retries
const retryDelay = 3000; // Delay between retries in milliseconds

function loadAndDisplayStreams() {
    const titleFilters = ['ONX', 'ONXRP', 'ONX.gg', 'ONX RP', 'OnxRP', 'Onx RP', 'onxrp', 'onx RP', '!ONX'];
    const tagFilters = []; // Add tag filters if needed
    
    fetch('/api/streams')
        .then(response => response.json())
        .then(streams => {
            if (streams.length > 0) {
                allStreams = displayStreams(streams, titleFilters, tagFilters); // Function to display streams
                retryCount = 0; // Reset retry count on successful load
            } else if (retryCount < maxRetries) {
                // Retry after a delay
                setTimeout(loadAndDisplayStreams, retryDelay);
                retryCount++;
            }
        })
        .catch(error => {
            console.error('Error loading streams:', error);
            if (retryCount < maxRetries) {
                setTimeout(loadAndDisplayStreams, retryDelay);
                retryCount++;
            }
            // Optionally, handle the error (e.g., show a message to the user)
        });
}


document.addEventListener('DOMContentLoaded', function() {
    const mainStreamContainer = document.getElementById('main-stream');
    const markedStreamsContainer = document.getElementById('marked-streams');
    const searchBox = document.getElementById('search-box');
    const filterLinks = document.querySelectorAll('.filter-link');
    //let allStreams = [];
    

    loadAndDisplayStreams();  

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
        });
    });

    // Search box event listener
    searchBox.addEventListener('input', () => {
        searchBoxDisplayStreams(allStreams);
    });


    addEventListeners();

    const scrollDownButton = document.getElementById('scroll-down-button');
    const scrollUpButton = document.getElementById('scroll-up-button');

    console.log('Adding event listeners'); // Debugging log

    scrollDownButton.addEventListener('click', () => {
        console.log('Down button clicked'); // Debugging log
        nextPageOfStreams(allStreams);
    });

    scrollUpButton.addEventListener('click', () => {
        console.log('Up button clicked'); // Debugging log
        previousPageOfStreams(allStreams);
    });

    // Initial load of streams
    //nextPageOfStreams(allStreams);

    //populateWhosOnline(allStreams);

    // Initially hide the main stage if it's empty
    toggleMainStageVisibility(mainStreamContainer);

});