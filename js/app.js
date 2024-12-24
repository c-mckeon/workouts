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
const database = firebase.database();

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

// Clear any leftover hardcoded dropdown options
function clearDropdown() {
  console.log()
  exerciseSelect.innerHTML = ''; // Clear all options
  console.log()
}

// Load exercises dynamically and populate the dropdown
function loadExercises() {
  const exercisesRef = database.ref('exercises'); // Reference to exercises in Firebase
  exercisesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    renderExerciseDropdown(data || {}); // Render dropdown with fetched data
  });
}

// Render the exercise dropdown dynamically
function renderExerciseDropdown(exercises) {
  clearDropdown(); // Clear existing options

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
      renderExerciseList(); // Render the draft
    }
  });
}

// Save the workout draft to Firebase
function saveWorkoutDraft() {
  const draft = {
    exercises: selectedExercises,
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

// Render the exercise list dynamically
function renderExerciseList() {
  exerciseList.innerHTML = ''; // Clear the list

  selectedExercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('row');
    exerciseDiv.className = 'exercise-item p-3';

    const setsRepsText = (exercise.sets || exercise.reps)
      ? `${exercise.sets ? `${exercise.sets} sets` : ''} ${exercise.reps ? `x ${exercise.reps} reps` : ''}`
      : '';
    const noteText = exercise.note ? ` ` : '';

    exerciseDiv.innerHTML = `
    <div class="row align-items-center">
      <div class="col-4">${exercise.name}</div>
      <div class="col-1">        <input type="number" class="form-control sets-input" placeholder="Sets" data-index="${index}" value="${exercise.sets}">
      </div>
      <div class="col-1">        <input type="number" class="form-control reps-input" placeholder="Reps" data-index="${index}" value="${exercise.reps}">
      </div>
      <div class="col-2">        <input type="text" class="form-control note-input" placeholder="Add a note" data-index="${index}" value="${exercise.note}">
      </div>
      <div class="col-1">        <button class="btn btn-danger remove-btn" data-index="${index}">Remove</button>
      </div>
    </div>
  `;
  

    exerciseList.appendChild(exerciseDiv);
  });

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
}

// Save workout to Firebase
saveWorkoutBtn.addEventListener('click', () => {
  if (selectedExercises.length === 0) {
    alert('Please add some exercises before saving!');
    return;
  }

  const workout = {
    date: getToday(),
    exercises: selectedExercises
  };

  saveWorkout(workout);
  alert('Workout saved successfully!');
  selectedExercises.length = 0; // Clear list after saving
  renderExerciseList();
  clearWorkoutDraft(); // Clear draft after saving workout
});

// Firebase function to save workout
function saveWorkout(workout) {
  const workoutsRef = database.ref('workouts');
  workoutsRef.push(workout);
}

// Load saved workouts from Firebase
function loadWorkouts() {
  const workoutsRef = database.ref('workouts');
  workoutsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    const workouts = data ? Object.values(data) : [];
    renderSavedWorkouts(workouts);
  });
}


const toggleFormBtn = document.getElementById('toggleFormBtn');
const addExerciseSection = document.getElementById('addExerciseSection');

toggleFormBtn.addEventListener('click', () => {
  // Toggle the 'hidden' class
  addExerciseSection.classList.toggle('hidden');

  // Change the button text based on visibility
  toggleFormBtn.textContent = addExerciseSection.classList.contains('hidden') 
    ? 'Create new exercise' 
    : 'Hide';
});


// Render saved workouts
function renderSavedWorkouts(workouts) {
  savedWorkoutList.innerHTML = ''; // Clear saved workouts

  workouts.forEach(workout => {
    const workoutDiv = document.createElement('div');
    workoutDiv.className = 'saved-workout';

    const date = workout.date;
    const exercises = workout.exercises.map(e => {
      const setsRepsText = (e.sets || e.reps)
        ? `${e.sets ? `${e.sets} sets` : ''} ${e.reps ? `x ${e.reps} reps` : ''}`
        : '';
      const noteText = e.note ? ` ${e.note}` : '';
      return `${e.name}: ${setsRepsText} ${noteText}`;
    }).join('<br>');

    workoutDiv.innerHTML = `
      <p>Workout on ${date} <br> ${exercises}</p>
    `;

    savedWorkoutList.appendChild(workoutDiv);
  });
}

// Utility function to get today's date in YYYY-MM-DD format
function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Get only the date part
}

// Initialize the app
function init() {
  loadExercises(); // Load exercises into dropdown
  loadWorkouts(); // Load saved workouts
  loadWorkoutDraft(); // Load draft workout
}

// Start the app
init();
