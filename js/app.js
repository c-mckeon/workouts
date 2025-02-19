
//-////////////////////////////////////////////////////////////////////////// Clock timer fuctionality


// Reference to the Firebase Realtime Database
const validateBtn = document.getElementById('validateBtn');
const pauseDiv = document.querySelector('#pauseBtn').parentElement; // Parent div of pauseBtn
const resetDiv = document.querySelector('#resetBtn').parentElement; // Parent div of resetBtn
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

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

//////////////////////////////////////////////////////////////////////////// Clock timer fuctionality

//-////////////////////////////////////////////////////////////////////////// Creating exercises, editing workouts, exercise list
// DOM Elements
const exerciseSelect = document.getElementById('exerciseSelect');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const exerciseList = document.getElementById('exerciseList');
const saveWorkoutBtn = document.getElementById('saveWorkoutBtn');
const savedWorkoutList = document.getElementById('savedWorkoutList');
const newExerciseName = document.getElementById('newExerciseName');
const exerciseCategory = document.getElementById('exerciseCategory');
const saveNewExerciseBtn = document.getElementById('saveNewExerciseBtn');
const focusCategory = document.getElementById('focusCategory');
const focusCheckbox = document.getElementById('focusCheckbox');
const focusContainer = document.getElementById('focusContainer');

const selectedExercises = [];

// Firebase reference for workout drafts
const workoutDraftRef = database.ref('workoutDraft');

// Current workout intensity
let currentWorkout = { intensity: '', intensityNote: '' };

// Toggle focus area selection visibility
focusCheckbox.addEventListener('change', () => {
    focusContainer.style.display = focusCheckbox.checked ? 'block' : 'none';
});

// Clear dropdown options
function clearDropdown() {
    exerciseSelect.innerHTML = '';
}

// Function to load exercises dynamically based on checkbox state
function loadExercises() {
  const useFocusAreas = document.getElementById("seefocusCheckbox").checked;
  const exercisesRef = database.ref(useFocusAreas ? 'focusareas' : 'exercises');

  exercisesRef.once('value', (snapshot) => {
      const data = snapshot.val();
      renderExerciseDropdown(data || {}, useFocusAreas); // Pass data and mode
  });
}

// Load focus areas dynamically, including an "Add New Focus Area" option
function loadFocusAreas() {
  focusCategory.innerHTML = ""; 

  database.ref("focusareas").once("value", snapshot => {
      snapshot.forEach(childSnapshot => {
          const focusArea = childSnapshot.key;

          const option = document.createElement("option");
          option.value = focusArea;
          option.textContent = focusArea;
          focusCategory.appendChild(option);
      });

      // Add "Add New Focus Area" option at the end
      const addOption = document.createElement("option");
      addOption.value = "addNew";
      addOption.textContent = "➕ Add New Focus Area";
      focusCategory.appendChild(addOption);
  });
}

// Detect when "Add New Focus Area" is selected
focusCategory.addEventListener("change", function() {
  if (focusCategory.value === "addNew") {
      const newFocusArea = prompt("Enter a new focus area:");

      if (newFocusArea) {
          const sanitizedFocusArea = newFocusArea.trim();

          // Check if it already exists
          database.ref(`focusareas/${sanitizedFocusArea}`).once("value", snapshot => {
              if (snapshot.exists()) {
                  alert("Focus area already exists!");
              } else {
                  // Add to Firebase
                  database.ref(`focusareas/${sanitizedFocusArea}`).set(true);

                  // Add to dropdown
                  const newOption = document.createElement("option");
                  newOption.value = sanitizedFocusArea;
                  newOption.textContent = sanitizedFocusArea;
                  focusCategory.insertBefore(newOption, focusCategory.lastElementChild);

                  // Select the newly added option
                  newOption.selected = true;
              }
          });
      }

      // Reset selection to prevent re-triggering
      focusCategory.value = "";
  }
});

// Ensure focus area selection only appears when checkbox is checked
focusCheckbox.addEventListener('change', () => {
  focusContainer.style.display = focusCheckbox.checked ? 'block' : 'none';
});

// Load exercises & focus areas on page load
window.onload = () => {
  loadExercises();
  loadFocusAreas();
};



// Save new exercise to Firebase when created
saveNewExerciseBtn.addEventListener('click', () => {
    const name = newExerciseName.value.trim();
    const category = exerciseCategory.value;
    const selectedFocusAreas = focusCheckbox.checked
        ? Array.from(focusCategory.selectedOptions).map(opt => opt.value)
        : [];

    if (!name) {
        alert('Please enter an exercise name.');
        return;
    }

    saveExerciseToDatabase(name, category, selectedFocusAreas);
    newExerciseName.value = ''; 
    alert('Exercise added successfully!');
});

// Function to save an exercise in Firebase
function saveExerciseToDatabase(name, category, focusAreas) {
    const exerciseData = { name };
    let newExerciseKey = null;

    // Save under main category only if not "None"
    if (category !== "None") {
        const exercisesRef = database.ref(`exercises/${category}`);
        const newExerciseRef = exercisesRef.push();
        newExerciseKey = newExerciseRef.key;
        newExerciseRef.set(exerciseData);
    }

    // Save under focus areas only if checkbox is checked
    if (newExerciseKey && focusAreas.length > 0) {
        focusAreas.forEach(focus => {
            database.ref(`focusareas/${focus}/${newExerciseKey}`).set(exerciseData);
        });
    }
}

// Prevent duplicate exercise addition
addExerciseBtn.addEventListener('click', () => {
    const selectedOption = exerciseSelect.options[exerciseSelect.selectedIndex];
    const exerciseId = selectedOption.value;
    const exerciseName = selectedOption.text;

    if (!exerciseId || selectedExercises.some(e => e.id === exerciseId)) {
        alert("Exercise already exists");
        return;
    }

    selectedExercises.push({ id: exerciseId, name: exerciseName, sets: 0, reps: 0, note: '', showSR: false });

    renderExerciseList();
    saveWorkoutDraft();
});


// Render exercises in dropdown
function renderExerciseDropdown(exercises, fromFocusAreas = false) {
  exerciseSelect.innerHTML = ""; // Clear existing options

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select Exercise";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  exerciseSelect.appendChild(placeholderOption);

  // Loop through the categories in the exercises object
  for (const category in exercises) {
      // Skip the category if it's "none" or empty
      if (category.toLowerCase() === "none" || !category.trim()) {
          continue;
      }

      const optgroup = document.createElement("optgroup");
      optgroup.label = category.replace("_", " ").toUpperCase();

      // Loop through the exercises within the category
      for (const exerciseId in exercises[category]) {
          const exercise = exercises[category][exerciseId];

          // Skip if the exercise has "none" or is empty
          if (exercise.name.toLowerCase() === "none" || !exercise.name.trim()) {
              continue;
          }

          const option = document.createElement("option");
          option.value = exerciseId;
          option.textContent = exercise.name;
          optgroup.appendChild(option);
      }

      exerciseSelect.appendChild(optgroup);
  }
}


// Listen for focus area checkbox toggle and reload exercises
document.getElementById("seefocusCheckbox").addEventListener("change", loadExercises);


//////////////////////////////////////////////////////////////////////// Creating exercises, editing past workouts 

//-////////////////////////////////////////////////////////////////////// Workout creation and saving


// Render the exercise list dynamically, including intensity note field
function renderExerciseList() {
  exerciseList.innerHTML = ''; // Clear the list

  selectedExercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('row');
    exerciseDiv.className = 'exercise-item';
    exerciseDiv.id = 'test';

    exerciseDiv.innerHTML = `
    <div class="row p-1">
      <div class="col-12 col-md-3">${exercise.name}</div>
      <div class="col-4 col-md-1">
        <input type="number" class="form-control sets-input" placeholder="Sets" data-index="${index}" 
          value="${exercise.sets !== 0 ? exercise.sets : ''}">
      </div>
      <div class="col-4 col-md-1">
        <input type="number" class="form-control reps-input" placeholder="Reps" data-index="${index}" 
          value="${exercise.reps !== 0 ? exercise.reps : ''}">
      </div>
      <div class="col-8 col-md-2">
        <input type="text" class="form-control note-input" placeholder="Add a note" data-index="${index}" 
          value="${exercise.note || ''}">
      </div>
      <div class="col-2 col-md-1">
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
  <div class="col-8 col-md-3">Workout Intensity</div>
  <div class="col-8 col-md-2">
    <input type="number" id="workoutIntensity" class="form-control" placeholder="1-10" min="1" max="10" value="${currentWorkout.intensity || ''}">
  </div>
  <div class="col-8 col-md-2">
    <input type="text" id="workoutIntensityNote" class="form-control" placeholder="Misc. notes" value="${currentWorkout.intensityNote || ''}">
  </div>
  <div class="col-1"></div></div> <!-- Empty column to balance the grid -->
  `;

  exerciseList.appendChild(intensityDiv); // Append the intensity field
  addDraftListeners(); // Add listeners to save draft on changes
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

//////////////////////////////////////////////////////////////////////// Creating and saving workouts


//-////////////////////////////////////////////////////////////////////// Workout drafts and draft keeping

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

//////////////////////////////////////////////////////////////////////// Workout drafts and draft keeping


//-////////////////////////////////////////////////////////////////////// Add and edit section functionality

const toggleFormBtn = document.getElementById('toggleFormBtn');
const addExerciseSection = document.getElementById('addExerciseSection');
const showEditorBtn = document.getElementById('showeditorbtn');
const editorSection = document.getElementById('editorsection');

// Toggle form section and show/hide "Show Editor" button
toggleFormBtn.addEventListener('click', () => {
  addExerciseSection.classList.toggle('hidden');

  // Change button text based on visibility
  toggleFormBtn.textContent = addExerciseSection.classList.contains('hidden')
    ? 'Add and Edit'
    : 'Hide';

  // Show or hide the "Show Editor" button based on addExerciseSection's state
  if (addExerciseSection.classList.contains('hidden')) {
    showEditorBtn.classList.add('hidden'); // Hide when form is hidden
    editorSection.classList.add('hidden'); // Also hide editor if open
    showEditorBtn.textContent = "Show Editor"; // Reset button text
  } else {
    showEditorBtn.classList.remove('hidden'); // Show when form is visible
  }
});

// Toggle editor section visibility
showEditorBtn.addEventListener('click', () => {
  editorSection.classList.toggle('hidden');

  // Change button text based on state
  showEditorBtn.textContent = editorSection.classList.contains('hidden')
    ? 'Show Editor'
    : 'Hide Editor';
});


//////////////////////////////////////////////////////////////////////// Add and edit section functionality

//-////////////////////////////////////////////////////////////////////// Past workouts section

// Select the button element for workouts
const workoutButton = document.querySelector('#showworkouts .click');


// Ensure the saved workouts list is hidden initially
savedWorkoutList.classList.add('hidden');




function renderSavedWorkouts() {
  const workoutsRef = database.ref('workouts');
  workoutsRef.once('value', (snapshot) => {
    const workouts = snapshot.val();
    savedWorkoutList.innerHTML = ''; // Clear saved workouts

    if (!workouts) return;

    // Get the selected filter value from the dropdown
    const workoutFilterElement = document.getElementById('workout-filter');
    const selectedWorkoutFilter = workoutFilterElement
      ? workoutFilterElement.value.toLowerCase()
      : 'all';

    Object.keys(workouts).forEach(workoutId => {
      const workout = workouts[workoutId];

      // Determine the workout type using simple logic:
      // If there's only one exercise and its name is "Running", mark as 'running'.
      // If there's only one exercise and it's not running, mark as 'activity'.
      // Otherwise, it's 'regular'.
      let workoutType = "regular"; // default
      if (workout.exercises && workout.exercises.length === 1) {
        const exerciseName = workout.exercises[0].name.toLowerCase();
        if (exerciseName === 'running') {
          workoutType = 'running';
        } else {
          workoutType = 'activity';
        }
      }

      // If the selected filter is not "all" and does not match this workout's type, skip it.
      if (selectedWorkoutFilter !== 'all' && workoutType !== selectedWorkoutFilter) {
        return;
      }

      // Create a container for this workout.
      const workoutDiv = document.createElement('div');
      workoutDiv.className = 'saved-workout';

      const date = workout.date; 
      const intensity = workout.intensity ? `Intensity: ${workout.intensity}/10` : '';
      const intensityNote = workout.intensityNote ? `${workout.intensityNote}` : '';
      const duration = workout.duration ? `${workout.duration}` : '';
      const exercises = workout.exercises.map(e => {
        const setsRepsText = (e.sets || e.reps)
          ? `${e.sets ? `${e.sets} sets` : ''} ${e.reps ? `x ${e.reps} reps` : ''}`
          : '';
        const noteText = e.note ? ` ${e.note}` : '';
        return `<span style="color: blue;">${e.name}</span>: ${setsRepsText} <span style="color: red;">${noteText}</span>`;
      }).join('<br>');
      
      workoutDiv.innerHTML = `
        <p><strong>Workout on ${date}</strong><br>
          <span style="color: green;">${intensity}${intensity ? ' &nbsp;&nbsp; ' : ''}${duration} ${intensityNote ? `${intensityNote}<br>` : '<br>'}</span>
          ${exercises}
        </p>
      `;
      
      savedWorkoutList.appendChild(workoutDiv);
    });
  });
}

// Add an event listener to re-render workouts when the filter changes
document.getElementById('workout-filter').addEventListener('change', () => {
  renderSavedWorkouts();
});

// Toggle workouts (and the filter) when the "Show workouts" button is clicked
workoutButton.addEventListener('click', () => {
  const workoutFilterElement = document.getElementById('workout-filter');
  if (workoutButton.textContent === 'Show workouts') {
    renderSavedWorkouts(); // Populate the workouts
    savedWorkoutList.classList.remove('hidden'); // Make the workouts list visible
    workoutButton.textContent = 'Hide workouts'; // Change button text
    workoutFilterElement.style.display = 'inline'; // Show the filter dropdown
  } else {
    savedWorkoutList.innerHTML = ''; // Clear the workouts content
    savedWorkoutList.classList.add('hidden'); // Hide the workouts list
    workoutButton.textContent = 'Show workouts'; // Change button text back
    workoutFilterElement.style.display = 'none'; // Hide the filter dropdown
  }
});



//////////////////////////////////////////////////////////////////////// Past workouts section

//-////////////////////////////////////////////////////////////////////// misc.

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
