// Firebase configuration (replace with your project details)
const firebaseConfig = {
  apiKey: "AIzaSyAvY5rVn4L0YpYG9YoHJHAQJiuyShB6z48",
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

// Clear any leftover hardcoded dropdown options
function clearDropdown() {
  exerciseSelect.innerHTML = ''; // Clear all options
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

// Add selected exercise to the workout list
addExerciseBtn.addEventListener('click', () => {
  const selectedOption = exerciseSelect.options[exerciseSelect.selectedIndex];
  const exerciseName = selectedOption.text;

  // Avoid adding duplicate exercises
  if (!selectedOption.value || selectedExercises.some(e => e.name === exerciseName)) {
    return;
  }

  // Add exercise to the list
  selectedExercises.push({ name: exerciseName, sets: 0, reps: 0 });
  renderExerciseList();
});

// Render the exercise list dynamically
function renderExerciseList() {
  exerciseList.innerHTML = ''; // Clear the list

  selectedExercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.className = 'exercise-item';

    exerciseDiv.innerHTML = `
      <span>${exercise.name}</span>
      <input type="number" placeholder="Sets" class="sets-input" data-index="${index}" value="${exercise.sets}">
      <input type="number" placeholder="Reps" class="reps-input" data-index="${index}" value="${exercise.reps}">
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;

    exerciseList.appendChild(exerciseDiv);
  });

  // Event listeners for inputs and remove buttons
  document.querySelectorAll('.sets-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      selectedExercises[index].sets = parseInt(e.target.value) || 0;
    });
  });

  document.querySelectorAll('.reps-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      selectedExercises[index].reps = parseInt(e.target.value) || 0;
    });
  });

  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      selectedExercises.splice(index, 1); // Remove exercise
      renderExerciseList();
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

// Render saved workouts
function renderSavedWorkouts(workouts) {
  savedWorkoutList.innerHTML = ''; // Clear saved workouts

  workouts.forEach(workout => {
    const workoutDiv = document.createElement('div');
    workoutDiv.className = 'saved-workout';

    const date = workout.date;
    const exercises = workout.exercises.map(e => `${e.name}: ${e.sets} sets x ${e.reps} reps`).join('<br>');

    workoutDiv.innerHTML = `
      <h3>Workout on ${date}</h3>
      <p>${exercises}</p>
    `;

    savedWorkoutList.appendChild(workoutDiv);
  });
}

// Utility to get today's date
function getToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Load exercises and saved workouts on page load
loadExercises();
loadWorkouts();
