const { ipcRenderer } = require('electron');
const API_KEY = '37bae139';

// HTML ELEMENTS
const searchForm = document.getElementById('searchForm');
const movieInput = document.getElementById('movieInput');
const movieResults = document.getElementById('movieResults');
const message = document.getElementById('message');

const moodSelect = document.getElementById('moodSelect');
const recommendBtn = document.getElementById('recommendBtn');
const recommendations = document.getElementById('recommendations');
const recommendMessage = document.getElementById('recommendMessage');

const watchlist = document.getElementById('watchlist');
const watchlistCount = document.getElementById('watchlistCount');
const totalRuntime = document.getElementById('totalRuntime');
const averageRuntime = document.getElementById('averageRuntime');
const watchlistMessage = document.getElementById('watchlistMessage');

// MOVIE DATA
let currentResults = [];
let savedMovies = loadData('myMovieWatchlist');
let savedRecommendations = loadData('myMovieRecommendations');

// LOCAL STORAGE FUNCTIONS
function loadData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error('Unable to load data:', error);
        return [];
    }
}


function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));

    } catch (error) {
        console.error('Unable to save data:', error);
    }
}

// GET NOTES FROM MOVIE PLANS
function getMoviePlanNotes(movie) {

    const plans = loadData('itineraries');

    // Find plans belonging to this movie.
    const matchingPlans = plans.filter(plan => {

        if (movie.imdbID && plan.imdbID) {
            return movie.imdbID === plan.imdbID;
        }

        // Fallback for older plans without an IMDb ID.
        return (
            plan.title.toLowerCase() === movie.Title.toLowerCase() &&
            String(plan.year || '') === String(movie.Year || '')
        );
    });

    if (matchingPlans.length === 0) {
        return movie.notes || 'None';
    }

    // Get the most recently updated plan.
    matchingPlans.sort((a, b) => {

        const dateA = a.updatedAt || a.createdAt || a.id;
        const dateB = b.updatedAt || b.createdAt || b.id;

        return Number(dateB) - Number(dateA);
    });

    return matchingPlans[0].notes || 'None';
}

async function getMovieDetails(id) {

    const url =
        `https://www.omdbapi.com/?apikey=${API_KEY}&i=${encodeURIComponent(id)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('The movie service is unavailable.');
    }

    const data = await response.json();

    if (data.Response !== 'True') {
        throw new Error(data.Error || 'Movie details were not found.');
    }

    return data;
}

// SEARCH MOVIES
searchForm.addEventListener('submit', async event => {

    event.preventDefault();

    const title = movieInput.value.trim();

    if (!title) {
        message.textContent = 'Please enter a movie title.';
        return;
    }

    message.textContent = 'Searching for movies...';

    movieResults.innerHTML = '';
    currentResults = [];

    // Clear previous recommendations.
    recommendMessage.textContent = '';
    recommendations.innerHTML = '';

    savedRecommendations = [];

    saveData('myMovieRecommendations', savedRecommendations);

    try {

        const url =
            `https://www.omdbapi.com/?apikey=${API_KEY}` +
            `&s=${encodeURIComponent(title)}&type=movie`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Unable to contact the movie service.');
        }

        const data = await response.json();

        if (data.Response !== 'True') {
            message.textContent = data.Error || 'No movies found.';
            return;
        }

        // Get detailed information for the first 10 movies.
        let failedDetails = 0;

        const details = await Promise.all(

            data.Search.slice(0, 10).map(async movie => {

                try {
                    return await getMovieDetails(movie.imdbID);

                } catch (error) {

                    failedDetails++;

                    return movie;
                }
            })
        );

        currentResults = details;

        displayMovies(currentResults, movieResults, 'search');

        if (failedDetails > 0) {

            message.textContent =
                `Showing ${currentResults.length} movies. ` +
                `${failedDetails} movie(s) have limited information.`;

        } else {

            message.textContent =
                `Showing ${currentResults.length} movie results.`;
        }

    } catch (error) {

        message.textContent =
            'Could not retrieve movies. Check your internet connection and API key.';

        console.error(error);
    }
});

// DISPLAY MOVIES
function displayMovies(movies, container, type) {

    container.innerHTML = '';

    if (movies.length === 0) {

        container.textContent = 'No movies to display.';

        return;
    }

    movies.forEach(movie => {

        const card = document.createElement('div');

        card.className = 'movie-card';


        // Movie poster.
        const poster = document.createElement('img');

        poster.src =
            movie.Poster && movie.Poster !== 'N/A'
                ? movie.Poster
                : 'https://placehold.co/300x450/18382B/DDEFE4?text=No+Poster';

        poster.alt = movie.Title || 'Movie poster';


        // Movie title.
        const title = document.createElement('h3');

        title.textContent = movie.Title || 'Unknown title';


        // Movie year.
        const year = document.createElement('p');

        year.textContent = `Year: ${movie.Year || 'Unknown'}`;


        // Movie genre.
        const genre = document.createElement('p');

        genre.textContent =
            `Genre: ${movie.Genre || 'Not available'}`;


        // Movie runtime.
        const runtime = document.createElement('p');

        runtime.textContent =
            `Runtime: ${movie.Runtime || 'Not available'}`;


        // Movie rating.
        const rating = document.createElement('p');

        rating.textContent =
            `IMDb Rating: ${movie.imdbRating || 'Not available'}`;


        card.append(poster, title, year, genre, runtime, rating);


        // Add movie to watchlist.
        if (type === 'search' || type === 'recommendation') {

            const exists = savedMovies.some(
                item => item.imdbID === movie.imdbID
            );

            const addButton = document.createElement('button');

            addButton.textContent =
                exists ? 'Already Saved' : 'Add to Watchlist';

            addButton.disabled = exists;

            addButton.addEventListener('click', () => {
                addMovie(movie);
            });

            card.appendChild(addButton);
        }


        // Watchlist operations.
        if (type === 'watchlist') {

            // Display notes from the Movie Plans page.
            const notes = document.createElement('p');

            notes.textContent =
                `My Notes: ${getMoviePlanNotes(movie)}`;

            card.appendChild(notes);


            // Remove movie.
            const removeButton = document.createElement('button');

            removeButton.textContent = 'Remove';

            removeButton.className = 'danger-button';

            removeButton.addEventListener('click', () => {

                const confirmed = confirm(
                    `Remove "${movie.Title}" from your watchlist?`
                );

                if (!confirmed) return;

                savedMovies = savedMovies.filter(
                    item => item.imdbID !== movie.imdbID
                );

                saveData('myMovieWatchlist', savedMovies);

                displayMovies(savedMovies, watchlist, 'watchlist');

                displayMovies(currentResults, movieResults, 'search');

                updateSummary();

                watchlistMessage.textContent =
                    'Movie removed from watchlist.';
            });


            // Plan movie night.
            const planButton = document.createElement('button');

            planButton.textContent = 'Plan Movie Night';

            planButton.addEventListener('click', () => {

                localStorage.setItem(
                    'selectedMovieForPlan',
                    JSON.stringify(movie)
                );

                ipcRenderer.send('open-itinerary-window');
            });

            card.append(removeButton, planButton);
        }

        container.appendChild(card);

    });
}

// ADD MOVIE TO WATCHLIST
function addMovie(movie) {

    if (savedMovies.some(item => item.imdbID === movie.imdbID)) {

        watchlistMessage.textContent =
            'This movie is already saved.';

        return;
    }

    savedMovies.push({
        ...movie,
        notes: ''
    });

    saveData('myMovieWatchlist', savedMovies);

    displayMovies(savedMovies, watchlist, 'watchlist');

    displayMovies(currentResults, movieResults, 'search');

    updateSummary();

    watchlistMessage.textContent =
        'Movie added to your watchlist.';
}

// MOVIE MOOD SELECTOR
recommendBtn.addEventListener('click', () => {

    const mood = moodSelect.value;

    if (!mood) {

        recommendMessage.textContent =
            'Please select your mood first.';

        return;
    }

    if (currentResults.length === 0) {

        recommendMessage.textContent =
            'Please search for movies before getting recommendations.';

        return;
    }

    let preferredGenres = [];

    // Select genres based on the user's mood.
    if (mood === 'happy') {

        preferredGenres = ['Comedy', 'Animation', 'Family'];

    } else if (mood === 'excited') {

        preferredGenres = ['Action', 'Adventure', 'Sci-Fi'];

    } else if (mood === 'emotional') {

        preferredGenres = ['Drama', 'Romance'];

    } else if (mood === 'scared') {

        preferredGenres = ['Horror', 'Thriller'];

    } else if (mood === 'curious') {

        preferredGenres = ['Mystery', 'Crime', 'Documentary'];
    }

    // Filter movies according to the selected mood.
    const results = currentResults.filter(movie => {

        if (!movie.Genre || movie.Genre === 'N/A') {
            return false;
        }

        const movieGenres = movie.Genre
            .split(',')
            .map(genre => genre.trim().toLowerCase());

        return preferredGenres.some(genre =>
            movieGenres.includes(genre.toLowerCase())
        );
    });


    if (results.length > 0) {

        savedRecommendations = results;

        saveData('myMovieRecommendations', savedRecommendations);

        displayMovies(
            results,
            recommendations,
            'recommendation'
        );

        const moodName =
            mood.charAt(0).toUpperCase() + mood.slice(1);

        recommendMessage.textContent =
            `${results.length} movie(s) recommended for your ${moodName} mood!`;

    } else {

        recommendations.innerHTML = '';

        recommendMessage.textContent =
            'No suitable movies found for this mood. ' +
            'Try searching for different movies.';

        savedRecommendations = [];

        saveData('myMovieRecommendations', savedRecommendations);
    }
});

// CALCULATE WATCHLIST RUNTIME
function updateSummary() {

    let total = 0;

    let count = 0;

    savedMovies.forEach(movie => {

        const match = movie.Runtime
            ? movie.Runtime.match(/\d+/)
            : null;

        if (match) {

            total += Number(match[0]);

            count++;
        }
    });

    watchlistCount.textContent =
        `${savedMovies.length} movie(s) saved.`;

    totalRuntime.textContent =
        `${total} minutes`;

    const average = count > 0
        ? Math.round(total / count)
        : 0;

    averageRuntime.textContent =
        `${average} minutes per movie`;
}

// OPEN MOVIE PLANS PAGE
document.getElementById('openPlansBtn').addEventListener('click', () => {

    localStorage.removeItem('selectedMovieForPlan');

    ipcRenderer.send('open-itinerary-window');

});

// LOAD SAVED INFORMATION
displayMovies(savedMovies, watchlist, 'watchlist');

displayMovies(
    savedRecommendations,
    recommendations,
    'recommendation'
);

updateSummary();
