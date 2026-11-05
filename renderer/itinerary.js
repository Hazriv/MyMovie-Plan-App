// HTML ELEMENTS
const planForm = document.getElementById('planForm');

const planTitle = document.getElementById('planTitle');
const planYear = document.getElementById('planYear');
const planDate = document.getElementById('planDate');
const planNotes = document.getElementById('planNotes');

const planMessage = document.getElementById('planMessage');
const plansList = document.getElementById('plansList');
const plansCount = document.getElementById('plansCount');

const formHeading = document.getElementById('formHeading');

const savePlanBtn = document.getElementById('savePlanBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// MOVIE PLAN DATA
let plans = loadPlans();
let editingId = null;

// Keep the IMDb ID of the movie currently being planned.
let selectedMovieId = null;

// Read saved plans from Local Storage.
function loadPlans() {

    try {

        const data = JSON.parse(
            localStorage.getItem('itineraries') || '[]'
        );

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error('Unable to load movie plans:', error);

        return [];
    }
}


// Save all plans to Local Storage.
function savePlans() {

    try {

        localStorage.setItem(
            'itineraries',
            JSON.stringify(plans)
        );

        return true;

    } catch (error) {

        planMessage.textContent =
            'Unable to save your movie plan.';

        console.error(error);

        return false;
    }
}

// WATCHLIST NOTES SYNCHRONISATION
function syncWatchlistNotes() {

    try {

        const savedMovies = JSON.parse(
            localStorage.getItem('myMovieWatchlist') || '[]'
        );

        if (!Array.isArray(savedMovies)) return;

        // Update the notes of each movie in the watchlist.
        savedMovies.forEach(movie => {

            const matchingPlans = plans.filter(plan => {

                // Match using IMDb ID when available.
                if (movie.imdbID && plan.imdbID) {
                    return movie.imdbID === plan.imdbID;
                }

                // Fallback for older plans without an IMDb ID.
                return (
                    plan.title.toLowerCase() === movie.Title.toLowerCase() &&
                    String(plan.year || '') === String(movie.Year || '')
                );
            });

            if (matchingPlans.length > 0) {

                // Use the most recently updated movie plan.
                matchingPlans.sort((a, b) => {

                    const dateA = a.updatedAt || a.createdAt || a.id;
                    const dateB = b.updatedAt || b.createdAt || b.id;

                    return Number(dateB) - Number(dateA);
                });

                movie.notes = matchingPlans[0].notes || '';

            } else {

                movie.notes = '';
            }
        });

        localStorage.setItem(
            'myMovieWatchlist',
            JSON.stringify(savedMovies)
        );

    } catch (error) {

        console.error('Unable to synchronise watchlist notes:', error);
    }
}

// DISPLAY SAVED MOVIE PLANS
function displayPlans() {

    plansList.innerHTML = '';

    plansCount.textContent =
        `${plans.length} saved plan(s).`;

    if (plans.length === 0) {

        plansList.textContent =
            'No movie plans saved yet. Create your first movie plan above!';

        return;
    }

    plans.forEach(plan => {

        const card = document.createElement('div');

        card.className = 'plan-card';


        // Movie title.
        const title = document.createElement('h3');

        title.textContent =
            `${plan.title} (${plan.year || 'Year unknown'})`;


        // Watch date.
        const date = document.createElement('p');

        date.textContent =
            `Watch date: ${plan.date}`;


        // Movie notes.
        const notes = document.createElement('p');

        notes.textContent =
            `Notes: ${plan.notes || 'None'}`;


        // Edit button.
        const editButton = document.createElement('button');

        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {

            editingId = plan.id;

            planTitle.value = plan.title;

            planYear.value = plan.year || '';

            planDate.value = plan.date;

            planNotes.value = plan.notes || '';

            // Keep the connection to the watchlist movie.
            selectedMovieId = plan.imdbID || findMovieId(plan);

            formHeading.textContent = 'Edit Movie Plan';

            savePlanBtn.textContent = 'Update Plan';

            cancelEditBtn.hidden = false;

            planMessage.textContent =
                'Edit the fields and select Update Plan.';

            planForm.scrollIntoView({
                behavior: 'smooth'
            });
        });


        // Delete button.
        const deleteButton = document.createElement('button');

        deleteButton.textContent = 'Delete';

        deleteButton.className = 'danger-button';

        deleteButton.addEventListener('click', () => {

            const confirmed = confirm(
                `Delete the plan for "${plan.title}"?`
            );

            if (!confirmed) return;

            plans = plans.filter(
                item => item.id !== plan.id
            );

            if (!savePlans()) return;

            // Update the homepage notes after deletion.
            syncWatchlistNotes();

            displayPlans();

            planMessage.textContent =
                'Movie plan deleted successfully.';

            if (editingId === plan.id) {
                resetForm();
            }
        });


        card.append(
            title,
            date,
            notes,
            editButton,
            deleteButton
        );

        plansList.appendChild(card);

    });
}

// FIND MOVIE ID FOR OLDER PLANS
function findMovieId(plan) {

    try {

        const savedMovies = JSON.parse(
            localStorage.getItem('myMovieWatchlist') || '[]'
        );

        const movie = savedMovies.find(item => {

            return (
                item.Title.toLowerCase() === plan.title.toLowerCase() &&
                String(item.Year || '') === String(plan.year || '')
            );
        });

        return movie ? movie.imdbID : null;

    } catch (error) {

        console.error('Unable to find movie ID:', error);

        return null;
    }
}

// RESET FORM
function resetForm() {

    planForm.reset();

    editingId = null;

    selectedMovieId = null;

    formHeading.textContent = 'Create a Movie Plan';

    savePlanBtn.textContent = 'Save Movie Plan';

    cancelEditBtn.hidden = true;
}

// CREATE OR UPDATE MOVIE PLAN
planForm.addEventListener('submit', event => {

    event.preventDefault();

    const title = planTitle.value.trim();

    const year = planYear.value.trim();

    const date = planDate.value;

    const notes = planNotes.value.trim();


    // Validate required fields.
    if (!title || !date) {

        planMessage.textContent =
            'Please enter a movie title and watch date.';

        return;
    }


    // Validate release year.
    if (year && !/^\d{4}$/.test(year)) {

        planMessage.textContent =
            'Release year must contain four digits.';

        return;
    }


    // Validate the selected date.
    const selectedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {

        planMessage.textContent =
            'Please select a valid date.';

        return;
    }


    if (editingId !== null) {

        // UPDATE: Modify an existing record.
        const index = plans.findIndex(
            plan => plan.id === editingId
        );

        if (index === -1) {

            planMessage.textContent =
                'Plan not found. Please try again.';

            resetForm();

            return;
        }

        plans[index] = {

            ...plans[index],

            title,
            year,
            date,
            notes,

            imdbID: selectedMovieId || plans[index].imdbID || null,

            updatedAt: Date.now()
        };

        planMessage.textContent =
            'Movie plan updated successfully.';

    } else {

        // CREATE: Add a new record.
        plans.push({

            id: Date.now(),

            imdbID: selectedMovieId,

            title,
            year,
            date,
            notes,

            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        planMessage.textContent =
            'Movie plan saved successfully.';
    }


    // Save changes.
    if (!savePlans()) return;

    // Synchronise notes with the homepage watchlist.
    syncWatchlistNotes();

    displayPlans();

    resetForm();
});

// CANCEL EDITING
cancelEditBtn.addEventListener('click', () => {

    resetForm();

    planMessage.textContent =
        'Edit cancelled.';
});

// LOAD SELECTED MOVIE FROM WATCHLIST
const selectedMovie = localStorage.getItem('selectedMovieForPlan');

if (selectedMovie) {

    try {

        const movie = JSON.parse(selectedMovie);

        planTitle.value = movie.Title || '';

        planYear.value = movie.Year || '';

        // Remember the movie's IMDb ID.
        selectedMovieId = movie.imdbID || null;

        planMessage.textContent =
            'Choose a date and enter your notes to plan this movie.';

    } catch (error) {

        planMessage.textContent =
            'Could not load the selected movie.';

        console.error(error);
    }

    localStorage.removeItem('selectedMovieForPlan');
}

// RETURN TO MOVIE EXPLORER
document.getElementById('backBtn').addEventListener('click', () => {

    window.location.href = 'index.html';

});

// LOAD SAVED INFORMATION

// Synchronise saved notes when the page opens.
syncWatchlistNotes();

// Display saved movie plans.
displayPlans();
