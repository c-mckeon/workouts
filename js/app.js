// Firebase configuration (replace with your project details)
const firebaseConfig = {
  apiKey: "AIzaSyAvY5Rvn4L0YpYG9YoHJHAQJiuyShB6z48",
  authDomain: "workouts-725cd.firebaseapp.com",
  databaseURL: "https://workouts-725cd-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "workouts-725cd",
  storageBucket: "workouts-725cd.appspot.com",
  messagingSenderId: "827249841873",
  appId: "1:827249841873:web:b9906649f774d1be9257f0"
};

// Initialize Firebase (Firebase 8.x SDK)
firebase.initializeApp(firebaseConfig);

// Reference to the Firebase Realtime Database
const validateBtn = document.getElementById('validateBtn');
const pauseDiv = document.querySelector('#pauseBtn').parentElement; // Parent div of pauseBtn
const resetDiv = document.querySelector('#resetBtn').parentElement; // Parent div of resetBtn
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const database = firebase.database();

let timerInterval = null;
let paused = false; // Track if the clock is paused
let elapsedTime = 0; // Store elapsed time in milliseconds when paused
let startTime = null; // Store the initial start time

// Function to update the button's display with the elapsed time
function updateClockDisplay() {
  const totalElapsed = paused ? elapsedTime : Date.now() - startTime; // Use elapsedTime when paused
  const hours = Math.floor(totalElapsed / (1000 * 60 * 60));
  const minutes = Math.floor((totalElapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalElapsed % (1000 * 60)) / 1000);

  validateBtn.textContent = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to start the clock
function startClock() {
  validateBtn.style.backgroundColor = 'white';
  validateBtn.style.borderColor = 'black';
  validateBtn.style.color = 'black';

  if (timerInterval) clearInterval(timerInterval); // Clear any existing timer

  timerInterval = setInterval(() => {
    if (!paused) {
      updateClockDisplay();
    }
  }, 1000);
}

// Function to check if the button was clicked in the last three hours
function checkLastClick() {
  database
    .ref('access_logs/start_time')
    .once('value')
    .then((snapshot) => {
      const lastStartTime = snapshot.val();
      if (lastStartTime) {
        const currentTime = Date.now();
        const timeElapsedSinceStart = currentTime - lastStartTime;

        if (timeElapsedSinceStart < 3 * 60 * 60 * 1000) {
          // If within 3 hours, restore state
          startTime = lastStartTime; // Set the start time
          elapsedTime = timeElapsedSinceStart; // Update elapsed time
          startClock();
          pauseDiv.style.display = 'block'; // Show the pause button's parent div
          resetDiv.style.display = 'block'; // Show the reset button's parent div
          updateClockDisplay();
        }
      }
    })
    .catch((error) => {
      console.error('Error retrieving start_time:', error);
    });
}

// Listen for the validate button click
validateBtn.addEventListener('click', () => {
  if (!startTime) {
    // If the clock is not already running, initialize it
    startTime = Date.now();
    elapsedTime = 0;

    database
      .ref('access_logs/start_time')
      .set(startTime)
      .then(() => {
        startClock();

        // Show the pause and reset buttons' parent divs
        pauseDiv.style.display = 'block';
        resetDiv.style.display = 'block';
      })
      .catch((error) => {
        console.error('Error updating start_time:', error);
      });
  }
});

// Listen for the pause button click
pauseBtn.addEventListener('click', () => {
  if (paused) {
    // Resume the clock
    paused = false;
    startTime = Date.now() - elapsedTime; // Adjust the start time to account for elapsed time
    pauseBtn.textContent = 'Pause';
    startClock(); // Restart the clock
  } else {
    // Pause the clock
    paused = true;
    elapsedTime = Date.now() - startTime; // Store the elapsed time
    clearInterval(timerInterval); // Stop the clock ticking
    pauseBtn.textContent = 'Resume';
  }
});

// Listen for the reset button click
resetBtn.addEventListener('click', () => {
  if (timerInterval) clearInterval(timerInterval);
  paused = false;
  elapsedTime = 0;
  startTime = null;

  validateBtn.style.backgroundColor = 'green'; // Reset button color
  validateBtn.style.borderColor = 'black'; // Reset button border
  validateBtn.style.color = ''; // Reset button text color
  validateBtn.textContent = 'Start clock'; // Reset button text

  // Hide pause and reset buttons' parent divs again
  pauseDiv.style.display = 'none';
  resetDiv.style.display = 'none';

  // Clear the start time from the database
  database
    .ref('access_logs/start_time')
    .remove()
    .catch((error) => {
      console.error('Error clearing start_time:', error);
    });
});

// On page load, check if the button was clicked in the last 3 hours
document.addEventListener('DOMContentLoaded', () => {
  // Hide pause and reset buttons by default
  pauseDiv.style.display = 'none';
  resetDiv.style.display = 'none';

  // Check the last clock state
  checkLastClick();
});









// DOM Elements
const exerciseSelect = document.getElementById('exerciseSelect');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const exerciseList = document.getElementById('exerciseList');
const saveWorkoutBtn = document.getElementById('saveWorkoutBtn');
const savedWorkoutList = document.getElementById('savedWorkoutList');
const newExerciseName = document.getElementById('newExerciseName');
const exerciseCategory = document.getElementById('exerciseCategory');
const saveNewExerciseBtn = document.getElementById('saveNewExerciseBtn');

const selectedExercises = []; // Array to hold the list of added exercises

// Firebase reference for workout drafts
const workoutDraftRef = database.ref('workoutDraft');

// Current workout intensity
let currentWorkout = { intensity: '', intensityNote: '' };

// Clear any leftover hardcoded dropdown options
function clearDropdown() {
  exerciseSelect.innerHTML = ''; // Clear all options
}

// Add the placeholder option
const placeholderOption = document.createElement('option');
placeholderOption.value = ''; // Set the value to empty
placeholderOption.textContent = 'Choose Exercise'; // Placeholder text
placeholderOption.disabled = true; // Disable the option
placeholderOption.selected = true; // Make it selected by default
exerciseSelect.appendChild(placeholderOption); // Add the placeholder to the dropdown

// Load exercises dynamically and populate the dropdown
function loadExercises() {
  const exercisesRef = database.ref('exercises'); // Reference to exercises in Firebase
  exercisesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    renderExerciseDropdown(data || {}); // Render dropdown with fetched data
  });
}

// Render the exercise dropdown dynamically with a placeholder
function renderExerciseDropdown(exercises) {
  clearDropdown(); // Clear existing options

  // Add the placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = ''; // Set the value to empty
  placeholderOption.textContent = 'Select'; // Placeholder text
  placeholderOption.disabled = true; // Disable the option
  placeholderOption.selected = true; // Make it selected by default
  exerciseSelect.appendChild(placeholderOption); // Add the placeholder to the dropdown

  // Now add the categories and exercises
  for (const category in exercises) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category.replace('_', ' ').toUpperCase(); // Format category name

    // Add options under this category
    for (const exerciseId in exercises[category]) {
      const exercise = exercises[category][exerciseId];
      const option = document.createElement('option');
      option.value = exercise.name.toLowerCase().replace(' ', '_'); // Use a lowercase, underscored value
      option.textContent = exercise.name; // Display the exercise name
      optgroup.appendChild(option);
    }

    exerciseSelect.appendChild(optgroup); // Append optgroup to dropdown
  }
}

// Save new exercise to Firebase
saveNewExerciseBtn.addEventListener('click', () => {
  const name = newExerciseName.value.trim();
  const category = exerciseCategory.value;

  if (!name) {
    alert('Please enter an exercise name.');
    return;
  }

  saveExerciseToDatabase(name, category);
  newExerciseName.value = ''; // Clear the input field
  alert('Exercise added successfully!');
});

// Function to save an exercise in Firebase
function saveExerciseToDatabase(name, category) {
  const exercisesRef = database.ref(`exercises/${category}`);
  exercisesRef.push({ name });
}

addExerciseBtn.addEventListener('click', () => {
  const selectedOption = exerciseSelect.options[exerciseSelect.selectedIndex];
  const exerciseName = selectedOption.text;

  // Avoid adding duplicate exercises
  if (!selectedOption.value || selectedExercises.some(e => e.name === exerciseName)) {
    alert("Exercise already exists")
    return;
  }

  // Add exercise to the list with an initial "hidden" state for sets/reps
  selectedExercises.push({ name: exerciseName, sets: 0, reps: 0, note: '', showSR: false });
  renderExerciseList();
  saveWorkoutDraft(); // Save the draft after adding an exercise
});

// Load existing workout draft on page load
function loadWorkoutDraft() {
  workoutDraftRef.once('value', (snapshot) => {
    const draft = snapshot.val();
    if (draft && draft.exercises) {
      selectedExercises.push(...draft.exercises); // Populate draft exercises
      if (draft.intensity) {
        currentWorkout.intensity = draft.intensity; // Load intensity
      }
      if (draft.intensityNote) {
        currentWorkout.intensityNote = draft.intensityNote; // Load intensity note
      }
      renderExerciseList(); // Render the draft
    }
  });
}

// Save the workout draft to Firebase
function saveWorkoutDraft() {
  const draft = {
    exercises: selectedExercises,
    intensity: document.getElementById('workoutIntensity')?.value || '', // Save intensity
    intensityNote: currentWorkout.intensityNote || '', // Save intensity note
    date: getToday()
  };

  workoutDraftRef.set(draft, (error) => {
    if (error) {
      console.error('Error saving workout draft:', error);
    }
  });
}

// Clear the workout draft from Firebase (after saving the workout)
function clearWorkoutDraft() {
  workoutDraftRef.remove((error) => {
    if (error) {
      console.error('Error clearing workout draft:', error);
    }
  });
}

// Render the exercise list dynamically, including intensity note field
function renderExerciseList() {
  exerciseList.innerHTML = ''; // Clear the list

  selectedExercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('row');
    exerciseDiv.className = 'exercise-item';
    exerciseDiv.id = 'test';

    exerciseDiv.innerHTML = `
    <div class="row p-1">
      <div class="col-3">${exercise.name}</div>
      <div class="col-1">
        <input type="number" class="form-control sets-input" placeholder="Sets" data-index="${index}" 
          value="${exercise.sets !== 0 ? exercise.sets : ''}">
      </div>
      <div class="col-1">
        <input type="number" class="form-control reps-input" placeholder="Reps" data-index="${index}" 
          value="${exercise.reps !== 0 ? exercise.reps : ''}">
      </div>
      <div class="col-2">
        <input type="text" class="form-control note-input" placeholder="Add a note" data-index="${index}" 
          value="${exercise.note || ''}">
      </div>
      <div class="col-1">
        <button class="btn btn-danger remove-btn" data-index="${index}">X</button>
      </div>
    </div>
    `;
    exerciseList.appendChild(exerciseDiv);
  });

  // Add intensity field with intensity note (global for the workout, not per exercise)
  const intensityDiv = document.createElement('row');
  intensityDiv.className = 'introw';
  intensityDiv.id = 'introwcss';

  intensityDiv.innerHTML = `
  <div class="row p-1">
  <div class="col-3">Workout Intensity</div>
  <div class="col-2">
    <input type="number" id="workoutIntensity" class="form-control" placeholder="1-10" min="1" max="10" value="${currentWorkout.intensity || ''}">
  </div>
  <div class="col-2">
    <input type="text" id="workoutIntensityNote" class="form-control" placeholder="Misc. notes" value="${currentWorkout.intensityNote || ''}">
  </div>
  <div class="col-1"></div></div> <!-- Empty column to balance the grid -->
  `;

  exerciseList.appendChild(intensityDiv); // Append the intensity field
  addDraftListeners(); // Add listeners to save draft on changes
}

// Add listeners for input changes to save the draft
function addDraftListeners() {
  document.querySelectorAll('.sets-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      selectedExercises[index].sets = parseInt(e.target.value) || 0;
      saveWorkoutDraft(); // Save the draft after modifying sets
    });
  });

  document.querySelectorAll('.reps-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      selectedExercises[index].reps = parseInt(e.target.value) || 0;
      saveWorkoutDraft(); // Save the draft after modifying reps
    });
  });

  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      selectedExercises[index].note = e.target.value.trim();
      saveWorkoutDraft(); // Save the draft after modifying notes
    });
  });

  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      selectedExercises.splice(index, 1); // Remove exercise
      renderExerciseList();
      saveWorkoutDraft(); // Save the draft after removing an exercise
    });
  });

  // Intensity input listener
  document.getElementById('workoutIntensity').addEventListener('input', (e) => {
    currentWorkout.intensity = e.target.value.trim();
    saveWorkoutDraft(); // Save the draft after modifying intensity
  });

  // Intensity note input listener
  document.getElementById('workoutIntensityNote').addEventListener('input', (e) => {
    currentWorkout.intensityNote = e.target.value.trim();
    saveWorkoutDraft(); // Save the draft after modifying intensity note
  });
}

// Save workout to Firebase
saveWorkoutBtn.addEventListener('click', () => {
  if (selectedExercises.length === 0) {
    alert('Please add some exercises before saving!');
    return;
  }

  const workoutDuration = formatDuration(validateBtn.textContent);  // Convert clock time to "h m" format
  
  const workout = {
    date: getToday(),
    exercises: selectedExercises,
    intensity: document.getElementById('workoutIntensity')?.value || '', // Include intensity
    intensityNote: currentWorkout.intensityNote || '', // Include intensity note
    duration: workoutDuration  // Save the formatted duration
  };

  saveWorkout(workout);
  alert('Workout saved successfully!');
});

// Function to convert clock time (e.g., "01:30") into "1h 30m"
function formatDuration(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);

  let formattedTime = '';
  if (hours > 0) {
    formattedTime += `${hours}h `;
  }
  if (minutes > 0) {
    formattedTime += `${minutes}m`;
  }

  return formattedTime.trim();
}

// Save workout in Firebase under "workouts" node
function saveWorkout(workout) {
  const workoutsRef = database.ref('workouts');
  workoutsRef.push(workout, (error) => {
    if (error) {
      console.error('Error saving workout:', error);
    } else {
      // Clear the workout draft after saving
      clearWorkoutDraft();
      renderSavedWorkouts(); // Refresh the list of saved workouts
    }
  });
}


const toggleFormBtn = document.getElementById('toggleFormBtn');
const addExerciseSection = document.getElementById('addExerciseSection');

toggleFormBtn.addEventListener('click', () => {
  // Toggle the 'hidden' class
  addExerciseSection.classList.toggle('hidden');

  // Change the button text based on visibility
  toggleFormBtn.textContent = addExerciseSection.classList.contains('hidden')
    ? 'Create exercise'
    : 'Hide';
});

// Select the button element for workouts
const workoutButton = document.querySelector('#showworkouts .click');


// Ensure the saved workouts list is hidden initially
savedWorkoutList.classList.add('hidden');

// Add event listener for the click event
workoutButton.addEventListener('click', () => {
  if (workoutButton.textContent === 'Show workouts') {
    console.log('Displaying saved workouts...');
    renderSavedWorkouts(); // Populate the workouts
    savedWorkoutList.classList.remove('hidden'); // Make the workouts list visible
    workoutButton.textContent = 'Hide workouts'; // Change button text to "Hide workouts"
  } else {
    savedWorkoutList.innerHTML = ''; // Clear the workouts content
    savedWorkoutList.classList.add('hidden'); // Hide the workouts list
    workoutButton.textContent = 'Show workouts'; // Change button text to "Show workouts"
  }
});



// Render saved workouts from Firebase
function renderSavedWorkouts() {
  const workoutsRef = database.ref('workouts');
  workoutsRef.once('value', (snapshot) => {
    const workouts = snapshot.val();
    savedWorkoutList.innerHTML = ''; // Clear saved workouts

    if (!workouts) return;

    Object.keys(workouts).forEach(workoutId => {
      const workout = workouts[workoutId];
      const workoutDiv = document.createElement('div');
      workoutDiv.className = 'saved-workout';

      const date = workout.date; 
      const intensity = workout.intensity ? `Intensity: ${workout.intensity}/10` : '   ';
      const duration = workout.duration ? `${workout.duration}` : ''; // Keep duration without "Duration:"
      const exercises = workout.exercises.map(e => {
        const setsRepsText = (e.sets || e.reps)
          ? `${e.sets ? `${e.sets} sets` : ''} ${e.reps ? `x ${e.reps} reps` : ''}`
          : '';
        const noteText = e.note ? ` ${e.note}` : '';
        return `${e.name}: ${setsRepsText} ${noteText}`;
      }).join('<br>');
      
      // Concatenate intensity and duration with a space between them
      workoutDiv.innerHTML = `
      <p><strong>Workout on ${date}</strong><br>${intensity}${intensity && duration ? ' &nbsp;&nbsp  ' : '   '}${duration}<br>${exercises}</p>
    `;
    
      
      savedWorkoutList.appendChild(workoutDiv);
    });
  });
}


// Helper function to get the current date in YYYY-MM-DD format
function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize the app
loadExercises();
loadWorkoutDraft();
renderSavedWorkouts();  // Ensure saved workouts are shown when the app loads
