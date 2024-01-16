import { displayStreams, toggleMainStageVisibility, addEventListeners, nextPageOfStreams, previousPageOfStreams, searchBoxDisplayStreams} from '/Common.js'
let allStreams = [];

document.addEventListener('DOMContentLoaded', function() {
    const mainStreamContainer = document.getElementById('main-stream');
    const markedStreamsContainer = document.getElementById('marked-streams');
    const searchBox = document.getElementById('search-box');
    const filterLinks = document.querySelectorAll('.filter-link');
    //let allStreams = [];
    const titleFilters = ['ONX', 'ONXRP', 'ONX.gg', 'ONX RP', 'OnxRP', 'Onx RP', 'onxrp', 'onx RP', '!ONX'];
    const tagFilters = []; // Add tag filters if needed

    fetch('/api/streams')
        .then(response => response.json())
        .then(streams => {
            //allStreams = streams; // Save all fetched streams
            allStreams = displayStreams(streams, titleFilters, tagFilters); // Display all streams initially
        })
        .catch(error => {
            console.error('Error loading streams:', error);
            // Handle error (e.g., show a message to the user)
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