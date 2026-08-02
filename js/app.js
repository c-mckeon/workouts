
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
// Exercise metadata loaded into the dropdown so added exercises preserve editor settings.
const exerciseMetadataById = {};

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
async function loadExercises() {
  const exercisesRef = database.ref('exercises');
  const [snapshot, frequencyMap] = await Promise.all([
    exercisesRef.once('value'),
    computeExerciseFrequency()
  ]);

  const data = snapshot.val() || {};
  renderExerciseDropdown(data, frequencyMap);
}

async function computeExerciseFrequency() {
  const snapshot = await database.ref('workouts').once('value');
  const workouts = snapshot.val();
  const frequencyMap = {};

  if (!workouts || typeof workouts !== 'object') {
    return frequencyMap;
  }

  Object.values(workouts).forEach((workout) => {
    if (!workout || !Array.isArray(workout.exercises)) return;
    workout.exercises.forEach((exercise) => {
      const key = exercise.id || exercise.name;
      if (!key) return;
      frequencyMap[key] = (frequencyMap[key] || 0) + 1;
    });
  });

  return frequencyMap;
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
  setupWorkoutYearSelector();
};

function setupWorkoutYearSelector() {
  const yearSelect = document.getElementById('workout-year-filter');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  const years = ['all', currentYear, currentYear - 1, currentYear - 2];
  yearSelect.innerHTML = '';

  years.forEach((year, idx) => {
    const option = document.createElement('option');
    option.value = year === 'all' ? 'all' : year.toString();
    option.textContent = year === 'all' ? 'All years' : year.toString();
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  });
}



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

    const exerciseCategory = selectedOption.dataset.category || selectedOption.parentElement?.label || 'Unknown';
    const exerciseMetadata = exerciseMetadataById[exerciseId] || {};
    const fields = Array.isArray(exerciseMetadata.fields) ? exerciseMetadata.fields : ['sets', 'reps'];
    const trackSetsReps = fields.includes('sets') || fields.includes('reps');
    const initialSetsList = trackSetsReps ? [{ reps: '', weight: '', note: '' }] : [];

    selectedExercises.push({
        id: exerciseId,
        name: exerciseName,
        category: exerciseCategory,
      fields,
      customLabel: exerciseMetadata.customLabel || '',
        sets: trackSetsReps ? 1 : 0,
        reps: 0,
        note: '',
        setsList: initialSetsList,
        activeSetIndex: 0,
        showSR: false
    });

    renderExerciseList();
    saveWorkoutDraft();
    if (!startTime) {
      startTime = Date.now();
      elapsedTime = 0;
      database
        .ref('access_logs/start_time')
        .set(startTime)
        .then(() => {
          startClock();
          pauseDiv.style.display = 'block';
          resetDiv.style.display = 'block';
          updateClockDisplay();
        })
        .catch((error) => {
          console.error('Error updating start_time:', error);
        });
    }
});

let dropdownContent = []; // Global variable to store the generated dropdown content

function renderExerciseDropdown(exercises, frequencyMap = {}, fromFocusAreas = false) {
  console.log("renderExerciseDropdown() called");

  // Get the dropdown element
  const exerciseSelect = document.getElementById("exerciseSelect");

  // Check if the dropdown exists in the HTML
  if (!exerciseSelect) {
    console.error("❌ ERROR: exerciseSelect element not found!");
    return;
  }

  // Clear existing options
  exerciseSelect.innerHTML = "";

  // Add default placeholder option
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select Exercise";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  exerciseSelect.appendChild(placeholderOption);

  // Check if exercises exist and are valid
  if (!exercises || typeof exercises !== "object" || Object.keys(exercises).length === 0) {
    console.warn("⚠️ WARNING: No exercises found! Dropdown will be empty.");
    return;
  }

  dropdownContent = [];  // Reset the global variable before generating new content
  Object.keys(exerciseMetadataById).forEach(key => delete exerciseMetadataById[key]);

  const groupByCategory = document.getElementById("seefocusCheckbox")?.checked;
  const validCategories = Object.keys(exercises)
    .filter(category => category && typeof category === "string" && category.toLowerCase() !== "none" && category.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const sortOptions = (options) => {
    return options.sort((a, b) => {
      const freqA = Number(a.frequency) || 0;
      const freqB = Number(b.frequency) || 0;
      if (freqA !== freqB) return freqB - freqA;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  };

  if (groupByCategory) {
    validCategories.forEach((category) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category.replace("_", " ").toUpperCase();

      const sortedOptions = sortOptions(
        Object.entries(exercises[category] || {})
          .map(([exerciseId, exercise]) => ({ exerciseId, exercise }))
          .filter(({ exercise }) => exercise && typeof exercise === "object" && exercise.name && typeof exercise.name === "string" && exercise.name.toLowerCase() !== "none" && exercise.name.trim())
          .map(({ exerciseId, exercise }) => ({
            exerciseId,
            name: exercise.name.trim(),
            frequency: Number(frequencyMap[exerciseId]) || 0
          }))
      );

      sortedOptions.forEach(({ exerciseId, name }) => {
        const exerciseFields = Array.isArray(exercises[category][exerciseId]?.fields) ? exercises[category][exerciseId].fields : ['sets', 'reps'];
        exerciseMetadataById[exerciseId] = {
          fields: exerciseFields,
          customLabel: exercises[category][exerciseId]?.customLabel || ''
        };
        const option = document.createElement("option");
        option.value = exerciseId;
        option.textContent = name;
        option.dataset.category = category;
        optgroup.appendChild(option);
      });

      dropdownContent.push(optgroup);
      exerciseSelect.appendChild(optgroup);
    });
  } else {
    const allOptions = [];

    validCategories.forEach((category) => {
      Object.entries(exercises[category] || {}).forEach(([exerciseId, exercise]) => {
        if (!exercise || typeof exercise !== "object" || !exercise.name || typeof exercise.name !== "string" || exercise.name.toLowerCase() === "none" || !exercise.name.trim()) {
          return;
        }
        allOptions.push({
          exerciseId,
          name: exercise.name.trim(),
          frequency: Number(frequencyMap[exerciseId]) || 0,
          category
        });
      });
    });

    sortOptions(allOptions).forEach(({ exerciseId, name, category }) => {
      const exerciseFields = Array.isArray(exercises[category][exerciseId]?.fields) ? exercises[category][exerciseId].fields : ['sets', 'reps'];
      exerciseMetadataById[exerciseId] = {
        fields: exerciseFields,
        customLabel: exercises[category][exerciseId]?.customLabel || ''
      };
      const option = document.createElement("option");
      option.value = exerciseId;
      option.textContent = name;
      option.dataset.category = category;
      exerciseSelect.appendChild(option);
    });
  }

  console.log("✅ Dropdown updated successfully.");
}



// Listen for focus area checkbox toggle and reload exercises
document.getElementById("seefocusCheckbox").addEventListener("change", loadExercises);



////////// Here is functionality for viewing and editing past workout fields

// 📌 Look inside "/workouts/"
var basePath = "/workouts/";
var workoutKeys = [];
var currentIndex = 0;

//  Load all workout node keys
function loadWorkouts() {
    database.ref(basePath).once("value").then(snapshot => {
        if (snapshot.exists()) {
            workoutKeys = Object.keys(snapshot.val());
            console.log("Workout Keys:", workoutKeys); // DEBUG LOG

            if (workoutKeys.length > 0) {
                currentIndex = 0;
                displayCurrentNode();
            } else {
                document.getElementById("fields").innerHTML = "<p>No workouts found.</p>";
            }
        } else {
            console.log("No data found at", basePath);
        }
    }).catch(error => console.error("Error fetching workouts:", error));
}

// Display current workout node
function displayCurrentNode() {
    if (workoutKeys.length === 0) return;

    var workoutID = workoutKeys[currentIndex];
    var fullPath = basePath + workoutID;
    
    console.log("Fetching data from:", fullPath); // DEBUG LOG

    database.ref(fullPath).once("value").then(snapshot => {
        var data = snapshot.val();
        console.log("Data received:", data); // DEBUG LOG
        var fieldsHTML = "";

        // 📌 Workout-Level Fields (Dynamically show all fields except "exercises")
        if (data) {
          fieldsHTML += `<h3>Workout Info</h3>`;
          // Define the workout fields with custom labels
          const workoutFields = {
              date: "Date",
              duration: "Duration",
              intensity: "Intensity",
              intensityNote: "Note",
              result: "Result" 
          };
      
          for (const key in workoutFields) {
              fieldsHTML += `
                  <label style="display:inline-block; width:65px">${workoutFields[key]}: </label>
                  <input type="text" style=" width:350px" id="workout_${key}" value="${data[key] || ''}"><br>
              `;
          }
      }
      

        // 📌 Exercise-Level Fields
        if (data && data.exercises) {
            fieldsHTML += `<br><h3>Exercises</h3>`;
            data.exercises.forEach((exercise, index) => {
                const setsList = Array.isArray(exercise.setsList) ? exercise.setsList : [];
                const preserveLegacy = !setsList.length;
                const legacySets = exercise.sets || '';
                const legacyReps = exercise.reps || '';
                const legacyWeight = exercise.weight || '';

                fieldsHTML += `
                    <div class="exercise-entry" data-index="${index}" style="margin-bottom: 16px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;">
                      <div style="display:flex; flex-wrap:wrap; gap: 0.75rem; align-items:flex-start;">
                        <div style="min-width: 200px; flex: 1 1 220px;">
                          <label style="display:block; font-weight:600; margin-bottom: 4px;">Name</label>
                          <input type="text" id="name_${index}" value="${exercise.name || ''}" style="width:100%; margin-bottom: 8px;">
                          <label style="display:block; font-weight:600; margin-bottom: 4px;">Note</label>
                          <input type="text" id="note_${index}" value="${exercise.note || ''}" style="width:100%; margin-bottom: 8px;">
                          <button type="button" class="btn btn-danger btn-sm" onclick="deleteExercise(${index})">Delete exercise</button>
                        </div>
                        <div style="flex: 2 1 400px;">
                          <div style="display:flex; align-items:center; gap: 0.75rem; margin-bottom: 8px;">
                            <strong>Sets</strong>
                            <button type="button" class="btn btn-sm btn-outline-secondary add-editor-set-btn" data-index="${index}">+ Add set</button>
                          </div>
                          <div id="setsWrapper_${index}">
                            ${setsList.length > 0 ? setsList.map((set, setIndex) => `
                              <div class="set-row" data-exercise-index="${index}" data-set-index="${setIndex}" style="display:flex; gap: 0.5rem; align-items:center; margin-bottom: 6px; flex-wrap:wrap;">
                                <span style="min-width: 24px;">#${setIndex + 1}</span>
                                <input type="number" id="set_reps_${index}_${setIndex}" value="${set.reps || ''}" placeholder="Reps" style="width:80px;">
                                <input type="number" id="set_weight_${index}_${setIndex}" value="${set.weight || ''}" placeholder="Weight" style="width:80px;">
                                <input type="text" id="set_note_${index}_${setIndex}" value="${set.note || ''}" placeholder="Note" style="width:160px;">
                                <button type="button" class="btn btn-sm btn-outline-danger remove-set-editor-btn" data-exercise-index="${index}" data-set-index="${setIndex}">Remove</button>
                              </div>
                            `).join('') : `
                              <div class="legacy-row" style="display:flex; gap: 0.5rem; align-items:center; flex-wrap:wrap; margin-bottom: 6px;">
                                <label style="min-width: 45px;">Sets</label>
                                <input type="number" id="legacy_sets_${index}" value="${legacySets}" placeholder="Sets" style="width:80px;">
                                <label style="min-width: 45px;">Reps</label>
                                <input type="number" id="legacy_reps_${index}" value="${legacyReps}" placeholder="Reps" style="width:80px;">
                                <label style="min-width: 55px;">Weight</label>
                                <input type="number" id="legacy_weight_${index}" value="${legacyWeight}" placeholder="Weight" style="width:80px;">
                              </div>
                            `}
                          </div>
                        </div>
                      </div>
                    </div>
                `;
            });
        }

        document.getElementById("fields").innerHTML = fieldsHTML || "<p>No exercises found.</p>";
    }).catch(error => console.error("Error fetching node data:", error));
}

// ➡️ Move to next workout
function nextNode() {
    if (workoutKeys.length > 0) {
        currentIndex = (currentIndex + 1) % workoutKeys.length;
        console.log("Next node index:", currentIndex, "Key:", workoutKeys[currentIndex]); // DEBUG LOG
        displayCurrentNode();
    }
}

// ⬅️ Move to previous workout
function prevNode() {
    if (workoutKeys.length > 0) {
        currentIndex = (currentIndex - 1 + workoutKeys.length) % workoutKeys.length;
        displayCurrentNode();
    }
}

function addpastexercise() {
  var index = document.querySelectorAll('#fields .exercise-entry').length;
  var newExerciseHTML = `
      <div class="exercise-entry" data-index="${index}" style="margin-bottom: 16px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;">
          <div style="display:flex; flex-wrap:wrap; gap: 0.75rem; align-items:flex-start;">
            <div style="min-width: 200px; flex: 1 1 220px;">
              <label style="display:block; font-weight:600; margin-bottom: 4px;">Name</label>
              <input type="text" id="name_${index}" value="" style="width:100%; margin-bottom: 8px;">
              <label style="display:block; font-weight:600; margin-bottom: 4px;">Note</label>
              <input type="text" id="note_${index}" value="" style="width:100%; margin-bottom: 8px;">
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteExercise(${index})">Delete exercise</button>
            </div>
            <div style="flex: 2 1 400px;">
              <div style="display:flex; align-items:center; gap: 0.75rem; margin-bottom: 8px;">
                <strong>Sets</strong>
                <button type="button" class="btn btn-sm btn-outline-secondary add-editor-set-btn" data-index="${index}">+ Add set</button>
              </div>
              <div id="setsWrapper_${index}">
                <div class="set-row" data-exercise-index="${index}" data-set-index="0" style="display:flex; gap: 0.5rem; align-items:center; margin-bottom: 6px; flex-wrap:wrap;">
                  <span style="min-width: 24px;">#1</span>
                  <input type="number" id="set_reps_${index}_0" value="" placeholder="Reps" style="width:80px;">
                  <input type="number" id="set_weight_${index}_0" value="" placeholder="Weight" style="width:80px;">
                  <input type="text" id="set_note_${index}_0" value="" placeholder="Note" style="width:160px;">
                  <button type="button" class="btn btn-sm btn-outline-danger remove-set-editor-btn" data-exercise-index="${index}" data-set-index="0">Remove</button>
                </div>
              </div>
            </div>
          </div>
      </div>
  `;
  document.getElementById("fields").insertAdjacentHTML("beforeend", newExerciseHTML);
}



//  Save changes (Workout + Exercises)
function saveChanges() {
    var workoutID = workoutKeys[currentIndex];
    var fullPath = basePath + workoutID;

    // Collect updated workout-level fields
    var workoutUpdates = {};
    var workoutInputs = document.querySelectorAll("#fields input[id^='workout_']");
    workoutInputs.forEach(input => {
        var field = input.id.replace("workout_", "");
        workoutUpdates[field] = input.value;
    });

    // Collect updated exercises
    var exerciseUpdates = [];
    var exerciseEntries = document.querySelectorAll('#fields .exercise-entry');

    exerciseEntries.forEach(entry => {
        var index = entry.dataset.index;
        var name = entry.querySelector(`#name_${index}`)?.value || '';
        var note = entry.querySelector(`#note_${index}`)?.value || '';
        var setsList = [];

        entry.querySelectorAll('.set-row').forEach(setRow => {
            var setIndex = setRow.dataset.setIndex;
            var repsValue = entry.querySelector(`#set_reps_${index}_${setIndex}`)?.value;
            var weightValue = entry.querySelector(`#set_weight_${index}_${setIndex}`)?.value;
            var noteValue = entry.querySelector(`#set_note_${index}_${setIndex}`)?.value;

            if (repsValue || weightValue || noteValue) {
                setsList.push({
                    reps: repsValue || '',
                    weight: weightValue || '',
                    note: noteValue || ''
                });
            }
        });

        if (setsList.length > 0) {
            exerciseUpdates.push({
                name,
                note,
                setsList
            });
            return;
        }

        var legacySets = parseInt(entry.querySelector(`#legacy_sets_${index}`)?.value, 10);
        var legacyReps = parseInt(entry.querySelector(`#legacy_reps_${index}`)?.value, 10);
        var legacyWeight = parseFloat(entry.querySelector(`#legacy_weight_${index}`)?.value);

        var exerciseObj = { name, note };
        if (!isNaN(legacySets)) exerciseObj.sets = legacySets;
        if (!isNaN(legacyReps)) exerciseObj.reps = legacyReps;
        if (!isNaN(legacyWeight)) exerciseObj.weight = legacyWeight;

        exerciseUpdates.push(exerciseObj);
    });

    // Update Firebase
    database.ref(fullPath).update(workoutUpdates) // Update workout-level fields
        .then(() => database.ref(fullPath + "/exercises").set(exerciseUpdates)) // Update exercises
        .then(() => alert("Changes saved!"))
        .catch(error => alert("Error: " + error.message));
}

function deleteExercise(index) {
  if (!confirm("Are you sure you want to delete this exercise?")) return;

  var workoutID = workoutKeys[currentIndex];
  var fullPath = basePath + workoutID + "/exercises";

  database.ref(fullPath).once("value").then(snapshot => {
      var exercises = snapshot.val();
      if (!exercises || index >= exercises.length) return;

      // Remove the exercise from the array
      exercises.splice(index, 1);

      // Update Firebase with the new array (without the deleted exercise)
      return database.ref(fullPath).set(exercises);
  }).then(() => {
      displayCurrentNode(); // Refresh UI
  }).catch(error => {
      alert("Error deleting exercise: " + error.message);
  });
}


function deleteworkout() {
  // Confirm the deletion action with the user.
  if (!confirm("Are you sure you want to delete this workout? This action cannot be undone.")) {
    return;
  }
  
  // Retrieve the current workout ID using your workoutKeys array and currentIndex.
  var workoutID = workoutKeys[currentIndex];
  var fullPath = basePath + workoutID; // e.g., '/workouts/' + workoutID

  // Remove the workout from the Firebase database.
  database.ref(fullPath).remove()
    .then(() => {
      alert("Workout deleted successfully!");
      
      // Refresh local index and editor UI.
      workoutKeys.splice(currentIndex, 1);
      if (currentIndex >= workoutKeys.length) {
        currentIndex = Math.max(workoutKeys.length - 1, 0);
      }
      if (workoutKeys.length > 0) {
        displayCurrentNode();
      } else {
        document.getElementById("editForm").innerHTML = "";
        document.getElementById("fields").innerHTML = "<p>No workouts found.</p>";
      }
    })
    .catch(error => {
      alert("Error deleting workout: " + error.message);
    });
}

function initWorkoutEditorControls() {
  const workoutPrevBtn = document.getElementById("workoutPrevBtn");
  const workoutNextBtn = document.getElementById("workoutNextBtn");
  const saveChangesBtn = document.getElementById("saveChangesBtn");
  const deleteWorkoutBtn = document.getElementById("deleteWorkoutBtn");
  const addPastExerciseBtn = document.getElementById("addPastExerciseBtn");
  const fieldsContainer = document.getElementById("fields");

  if (workoutPrevBtn) workoutPrevBtn.addEventListener("click", prevNode);
  if (workoutNextBtn) workoutNextBtn.addEventListener("click", nextNode);
  if (saveChangesBtn) saveChangesBtn.addEventListener("click", saveChanges);
  if (deleteWorkoutBtn) deleteWorkoutBtn.addEventListener("click", deleteworkout);
  if (addPastExerciseBtn) addPastExerciseBtn.addEventListener("click", addpastexercise);

  if (fieldsContainer) {
    fieldsContainer.addEventListener("click", (event) => {
      const addSetButton = event.target.closest(".add-editor-set-btn");
      const removeSetButton = event.target.closest(".remove-set-editor-btn");

      if (addSetButton) {
        const exerciseIndex = addSetButton.dataset.index;
        const setsWrapper = document.getElementById(`setsWrapper_${exerciseIndex}`);
        if (!setsWrapper) return;
        const nextSetIndex = setsWrapper.querySelectorAll('.set-row').length;
        const newSetHTML = `
          <div class="set-row" data-exercise-index="${exerciseIndex}" data-set-index="${nextSetIndex}" style="display:flex; gap: 0.5rem; align-items:center; margin-bottom: 6px; flex-wrap:wrap;">
            <span style="min-width: 24px;">#${nextSetIndex + 1}</span>
            <input type="number" id="set_reps_${exerciseIndex}_${nextSetIndex}" value="" placeholder="Reps" style="width:80px;">
            <input type="number" id="set_weight_${exerciseIndex}_${nextSetIndex}" value="" placeholder="Weight" style="width:80px;">
            <input type="text" id="set_note_${exerciseIndex}_${nextSetIndex}" value="" placeholder="Note" style="width:160px;">
            <button type="button" class="btn btn-sm btn-outline-danger remove-set-editor-btn" data-exercise-index="${exerciseIndex}" data-set-index="${nextSetIndex}">Remove</button>
          </div>
        `;
        setsWrapper.insertAdjacentHTML('beforeend', newSetHTML);
        return;
      }

      if (removeSetButton) {
        const row = removeSetButton.closest('.set-row');
        if (row) {
          row.remove();
        }
      }
    });
  }
}

loadWorkouts();
  initWorkoutEditorControls();


//////////////////////////////////////////////////////////////////////// Creating exercises, editing past workouts 

//-////////////////////////////////////////////////////////////////////// Exercise list editing
// Global variables for managing the current type, category, exercise keys, and index.
var currentExerciseType = "exercises"; // default type; user can change via typeSelector
var currentExerciseCategory = null;    // will be set by the category selector
var exerciseKeys = [];                 // Firebase keys for exercises in the selected category
var exerciseDataMap = {};             // exercise metadata keyed by Firebase ID
var currentExerciseIndex = 0;

// Load available categories from the chosen root node (exercises or focusareas)
function loadCategories(type) {
  currentExerciseType = type;
  var refPath = "/" + type + "/";
  database.ref(refPath).once("value").then(snapshot => {
    if (snapshot.exists()) {
      var categories = Object.keys(snapshot.val());
      var selector = document.getElementById("categorySelector");
      if (selector) {
        // Clear previous options
        selector.innerHTML = "";
        categories.forEach(cat => {
          var option = document.createElement("option");
          option.value = cat;
          option.textContent = cat;
          selector.appendChild(option);
        });
        // Set the current category to the first one and load its exercises for the editor.
        currentExerciseCategory = categories[0];
        loadExercisesEditor();
      }
    } else {
      console.log("No categories found under " + refPath);
    }
  }).catch(error => console.error("Error loading categories:", error));
}

// Event listener for when the type selection changes.
document.getElementById("typeSelector").addEventListener("change", function(e) {
  loadCategories(e.target.value);
});

// Event listener for when the category selection changes.
document.getElementById("categorySelector").addEventListener("change", function(e) {
  currentExerciseCategory = e.target.value;
  loadExercisesEditor();
});

document.getElementById("exerciseSelector").addEventListener("change", function(e) {
  currentExerciseIndex = exerciseKeys.indexOf(e.target.value);
  if (currentExerciseIndex < 0) currentExerciseIndex = 0;
  displayExercise();
});

const saveExoBtn = document.getElementById("saveExoBtn");
const deleteExoBtn = document.getElementById("deleteExoBtn");
if (saveExoBtn) saveExoBtn.addEventListener("click", saveexo);
if (deleteExoBtn) deleteExoBtn.addEventListener("click", deleteexo);

function loadExercisesEditor() {
  if (!currentExerciseCategory) return;
  var refPath = "/" + currentExerciseType + "/" + currentExerciseCategory;
  console.log("Fetching exercises from:", refPath);
  
  database.ref(refPath).once("value").then(snapshot => {
    if (snapshot.exists()) {
      const exerciseData = snapshot.val() || {};
      exerciseDataMap = exerciseData;
      exerciseKeys = Object.keys(exerciseData).filter(key => key !== 'note');
      console.log("Exercise Keys:", exerciseKeys); // DEBUG
      renderExerciseSelector();
      if (exerciseKeys.length > 0) {
        currentExerciseIndex = 0;
        displayExercise();
      } else {
        document.getElementById("exerciseeditorsection").innerHTML = "<p>No exercises found in this category.</p>";
      }
    } else {
      document.getElementById("exerciseeditorsection").innerHTML = `<p>No data found at ${refPath}.</p>`;
    }
  }).catch(error => console.error("Error fetching exercises:", error));
}

function renderExerciseSelector() {
  var selector = document.getElementById("exerciseSelector");
  if (!selector) return;
  selector.innerHTML = "";
  exerciseKeys.forEach(exerciseId => {
    var option = document.createElement("option");
    option.value = exerciseId;
    option.textContent = (exerciseDataMap[exerciseId] && exerciseDataMap[exerciseId].name) ? exerciseDataMap[exerciseId].name : exerciseId;
    selector.appendChild(option);
  });
  if (exerciseKeys.length > 0) {
    selector.value = exerciseKeys[currentExerciseIndex] || exerciseKeys[0];
  }
}

// Display the current exercise for editing/viewing.
function displayExercise() {
  if (exerciseKeys.length === 0) return;

  // Filter out the "note" key from exerciseKeys
  const filteredExerciseKeys = exerciseKeys.filter(key => key !== "note");

  // If there are no valid exercises, return
  if (filteredExerciseKeys.length === 0) {
    document.getElementById("exerciseeditorsection").innerHTML = "<p>No valid exercises available.</p>";
    return;
  }

  // Get the current exercise ID based on the filtered list
  var exerciseID = filteredExerciseKeys[currentExerciseIndex];
  var refPath = "/" + currentExerciseType + "/" + currentExerciseCategory + "/" + exerciseID;
  console.log("Fetching exercise from:", refPath); // DEBUG

  database.ref(refPath).once("value").then(snapshot => {
    var data = snapshot.val();
    console.log("Exercise data received:", data); // DEBUG

    var editorHTML = "";
    if (data) {
      const fields = Array.isArray(data.fields) ? data.fields : ['sets', 'reps'];
      const customLabel = data.customLabel || '';

      editorHTML += `<h3>Exercise Info</h3>`;
      editorHTML += `
        <label style="display:inline-block; width:50px;">Name:</label>
        <input type="text" id="exercise_name" value="${data.name || ''}"><br>
        <label style="display:inline-block; width:50px;">Note:</label>
        <input type="text" id="exercise_note" value="${data.note || ''}"><br>
        <div style="margin-top: 10px;">
          <strong>Track fields:</strong><br>
          <label><input type="checkbox" class="field-checkbox" value="sets" ${fields.includes('sets') ? 'checked' : ''}> Sets</label>
          <label><input type="checkbox" class="field-checkbox" value="reps" ${fields.includes('reps') ? 'checked' : ''}> Reps</label>
          <label><input type="checkbox" class="field-checkbox" value="weight" ${fields.includes('weight') ? 'checked' : ''}> Weight</label>
          <label><input type="checkbox" class="field-checkbox" value="custom" ${fields.includes('custom') ? 'checked' : ''}> Custom</label>
        </div>
        <div id="customFieldContainer" style="margin-top: 10px; ${fields.includes('custom') ? '' : 'display:none;'}">
          <label style="display:inline-block; width:120px;">Custom field label:</label>
          <input type="text" id="exercise_custom_label" value="${customLabel}"><br>
        </div>
        <p>Exercise ${currentExerciseIndex + 1} of ${filteredExerciseKeys.length}</p>
      `;
    } else {
      editorHTML = "<p>No data for this exercise.</p>";
    }
    document.getElementById("exerciseeditorsection").innerHTML = editorHTML;
    const selector = document.getElementById("exerciseSelector");
    if (selector) selector.value = exerciseID;
    setupExerciseTrackingToggle();
  }).catch(error => console.error("Error displaying exercise:", error));
}

function setupExerciseTrackingToggle() {
  const customContainer = document.getElementById('customFieldContainer');
  if (!customContainer) return;

  document.querySelectorAll('.field-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.value === 'custom') {
        customContainer.style.display = cb.checked ? 'block' : 'none';
      }
    });
  });
}

// Navigate to the next exercise.
function nextexo() {
  if (exerciseKeys.length > 0) {
    do {
      currentExerciseIndex = (currentExerciseIndex + 1) % exerciseKeys.length;
    } while (exerciseKeys[currentExerciseIndex] === "note"); // Skip the "note" node

    renderExerciseSelector();
    displayExercise();
  }
}

// Navigate to the previous exercise.
function prevexo() {
  if (exerciseKeys.length > 0) {
    do {
      currentExerciseIndex = (currentExerciseIndex - 1 + exerciseKeys.length) % exerciseKeys.length;
    } while (exerciseKeys[currentExerciseIndex] === "note"); // Skip the "note" node

    renderExerciseSelector();
    displayExercise();
  }
}

// Delete the current exercise from Firebase.
function deleteexo() {
  if (exerciseKeys.length === 0) return;
  if (!confirm("Are you sure you want to delete this exercise?")) return;
  var exerciseID = exerciseKeys[currentExerciseIndex];
  var refPath = "/" + currentExerciseType + "/" + currentExerciseCategory + "/" + exerciseID;

  database.ref(refPath).remove()
    .then(() => {
      alert("Exercise deleted successfully!");
      // Remove the deleted exercise from the local keys array.
      exerciseKeys.splice(currentExerciseIndex, 1);
      if (currentExerciseIndex >= exerciseKeys.length) {
        currentExerciseIndex = Math.max(exerciseKeys.length - 1, 0);
      }
      displayExercise();
    })
    .catch(error => alert("Error deleting exercise: " + error.message));
}

// Optionally, the 'Exercise Editor' button can refresh the current view.
document.getElementById("showeditorbtn").addEventListener("click", function() {
  displayExercise();
});

// On initial load, populate categories from the default type.
loadCategories(currentExerciseType);


//////////////////////////////////////////////////////////////////////// Exercise list editing

//-////////////////////////////////////////////////////////////////////// Workout creation and saving


// Render the exercise list dynamically, including intensity note field
function renderExerciseList() {
  exerciseList.innerHTML = ''; // Clear the list

  selectedExercises.forEach((exercise, index) => {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.className = 'exercise-item';

    const setsList = Array.isArray(exercise.setsList) ? exercise.setsList : [];
    const totalSets = setsList.length;
    const fields = Array.isArray(exercise.fields) ? exercise.fields : ['sets', 'reps'];
    const showSetsReps = fields.includes('sets') || fields.includes('reps');
    const showWeight = fields.includes('weight');
    const totalReps = setsList.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0);
    const totalWeight = setsList.reduce((sum, set) => sum + ((parseInt(set.reps, 10) || 0) * (parseFloat(set.weight) || 0)), 0);
    const volumeLabel = showSetsReps && totalSets > 0 ? `${totalSets} sets • ${totalReps} reps • ${totalWeight} kg moved` : '';
    const volumeDetailsHtml = showSetsReps ? `<div class="volume-details">${volumeLabel || 'No sets yet'}</div>` : '';
    const activeSetIndex = Number.isInteger(exercise.activeSetIndex) ? Math.min(Math.max(exercise.activeSetIndex, 0), Math.max(totalSets - 1, 0)) : 0;
    const currentSet = setsList[activeSetIndex] || { reps: '', weight: '', note: '' };
    const canMoveOlder = totalSets > 1 && activeSetIndex > 0;
    const canMoveNewer = totalSets > 1 && activeSetIndex < totalSets - 1;
    const navHtml = totalSets >= 1 ? `
      <button class="btn btn-sm btn-outline-secondary set-up-btn" data-index="${index}" ${canMoveNewer ? '' : 'disabled'}>▲</button>
      <span class="set-counter">${activeSetIndex + 1}/${totalSets}</span>
      <button class="btn btn-sm btn-outline-secondary set-down-btn" data-index="${index}" ${canMoveOlder ? '' : 'disabled'}>▼</button>
    ` : '';

    const addSetButtonHtml = showSetsReps ? `<button class="btn btn-secondary btn-sm add-set-btn" data-index="${index}">Add set</button>` : '';
    const repsInputHtml = showSetsReps ? `<input type="number" class="form-control form-control-sm set-input set-reps-input" data-index="${index}" data-set-index="${activeSetIndex}" value="${currentSet.reps || ''}" placeholder="Reps">` : '';
    const weightInputHtml = showSetsReps && showWeight ? `<input type="number" class="form-control form-control-sm set-input set-weight-input" data-index="${index}" data-set-index="${activeSetIndex}" value="${currentSet.weight || ''}" placeholder="Weight">` : '';
    const setNoteHtml = showSetsReps ? `<input type="text" class="form-control form-control-sm set-input set-note-input" data-index="${index}" data-set-index="${activeSetIndex}" value="${currentSet.note || ''}" placeholder="Note">` : '';
    const removeSetButtonHtml = showSetsReps ? `<button class="btn btn-sm btn-outline-danger remove-set-btn" data-index="${index}" data-set-index="${activeSetIndex}">×</button>` : '';
    const setsContainerHtml = showSetsReps ? `
            <div class="single-set-row">
              ${navHtml}
              ${repsInputHtml}
              ${weightInputHtml}
              ${setNoteHtml}
              ${removeSetButtonHtml}
            </div>
          ` : '';

    exerciseDiv.innerHTML = `
    <div class="row p-1 align-items-center exercise-row" style="flex-wrap:nowrap; gap:0.5rem;">
      <div class="col-auto col-md-2 pe-2 exercise-name-col">
        <span>${exercise.name}</span>
      </div>
      <div class="col-auto d-flex align-items-center gap-2 add-set-group">
        ${addSetButtonHtml}
        <div class="sets-container" id="setsContainer_${index}">
          ${setsContainerHtml}
        </div>
      </div>
      <div class="col-auto volume-col">
        ${volumeDetailsHtml}
      </div>
      <div class="col-auto note-col">
        <input type="text" class="form-control form-control-sm note-input" placeholder="Exercise note" data-index="${index}" value="${exercise.note || ''}">
      </div>
      <div class="col-auto ms-auto">
        <button class="btn btn-danger btn-sm remove-btn" data-index="${index}">X</button>
      </div>
    </div>
    `;

    exerciseList.appendChild(exerciseDiv);
  });

  // Add intensity field with intensity note (global for the workout, not per exercise)
  const intensityDiv = document.createElement('div');
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
  updateVolumeSummary();
}

setupDraftListeners();

function setupDraftListeners() {
  exerciseList.addEventListener('click', (e) => {
    const addButton = e.target.closest('.add-set-btn');
    const removeButton = e.target.closest('.remove-btn');
    const removeSetButton = e.target.closest('.remove-set-btn');
    const setUpButton = e.target.closest('.set-up-btn');
    const setDownButton = e.target.closest('.set-down-btn');

    if (addButton) {
      addSetToExercise(addButton.dataset.index);
      return;
    }

    if (removeButton) {
      const index = removeButton.dataset.index;
      selectedExercises.splice(index, 1);
      renderExerciseList();
      saveWorkoutDraft();
      updateVolumeSummary();
      return;
    }

    if (removeSetButton) {
      const exerciseIndex = removeSetButton.dataset.index;
      const setIndex = removeSetButton.dataset.setIndex;
      removeSetFromExercise(exerciseIndex, setIndex);
      return;
    }

    if (setUpButton) {
      const exerciseIndex = parseInt(setUpButton.dataset.index, 10);
      const exercise = selectedExercises[exerciseIndex];
      if (exercise && Array.isArray(exercise.setsList) && exercise.setsList.length > 0) {
        exercise.activeSetIndex = Math.min((exercise.activeSetIndex || 0) + 1, exercise.setsList.length - 1);
        renderExerciseList();
        saveWorkoutDraft();
      }
      return;
    }

    if (setDownButton) {
      const exerciseIndex = parseInt(setDownButton.dataset.index, 10);
      const exercise = selectedExercises[exerciseIndex];
      if (exercise && Array.isArray(exercise.setsList) && exercise.setsList.length > 0) {
        exercise.activeSetIndex = Math.max((exercise.activeSetIndex || 0) - 1, 0);
        renderExerciseList();
        saveWorkoutDraft();
      }
      return;
    }
  });

  exerciseList.addEventListener('input', (e) => {
    const target = e.target;
    const exerciseIndex = target.dataset.index;
    const setIndex = target.dataset.setIndex;

    if (target.matches('.note-input')) {
      selectedExercises[exerciseIndex].note = target.value.trim();
      saveWorkoutDraft();
      updateVolumeSummary();
      return;
    }

    if (target.matches('.set-reps-input')) {
      selectedExercises[exerciseIndex].setsList[setIndex].reps = target.value;
      saveWorkoutDraft();
      updateVolumeSummary();
      return;
    }

    if (target.matches('.set-weight-input')) {
      selectedExercises[exerciseIndex].setsList[setIndex].weight = target.value;
      saveWorkoutDraft();
      updateVolumeSummary();
      return;
    }

    if (target.matches('.set-note-input')) {
      selectedExercises[exerciseIndex].setsList[setIndex].note = target.value;
      saveWorkoutDraft();
      return;
    }

    if (target.matches('#workoutIntensity')) {
      currentWorkout.intensity = target.value.trim();
      saveWorkoutDraft();
      return;
    }

    if (target.matches('#workoutIntensityNote')) {
      currentWorkout.intensityNote = target.value.trim();
      saveWorkoutDraft();
      return;
    }
  });
}

// Save workout to Firebase
saveWorkoutBtn.addEventListener('click', () => {
  if (selectedExercises.length === 0) {
    alert('Please add some exercises before saving!');
    return;
  }

  const workoutDuration = formatDuration(validateBtn.textContent);  // Convert clock time to "h m" format
  const intensityValue = document.getElementById('workoutIntensity')?.value || '';
  const intensityNoteValue = document.getElementById('workoutIntensityNote')?.value || '';

  const workoutExercises = selectedExercises.map(exercise => {
    const setsList = Array.isArray(exercise.setsList) ? exercise.setsList : [];
    const totalSets = setsList.length;
    const totalReps = setsList.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0);
    return {
      ...exercise,
      sets: totalSets,
      reps: totalReps,
      setsList: setsList
    };
  });

  const workout = {
    date: getToday(),
    exercises: workoutExercises,
    intensity: intensityValue,
    intensityNote: intensityNoteValue,
    duration: workoutDuration
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
      draft.exercises.forEach(exercise => {
        ensureSetsList(exercise);
      });
      selectedExercises.push(...draft.exercises); // Populate draft exercises
      if (draft.intensity) {
        currentWorkout.intensity = draft.intensity; // Load intensity
      }
      if (draft.intensityNote) {
        currentWorkout.intensityNote = draft.intensityNote; // Load intensity note
      }
      renderExerciseList(); // Render the draft
      updateVolumeSummary();
    }
  });
}

function ensureSetsList(exercise) {
  if (!exercise) return;
  if (!Array.isArray(exercise.setsList)) {
    exercise.setsList = [];
  }
  if (!Number.isInteger(exercise.activeSetIndex) || exercise.activeSetIndex < 0) {
    exercise.activeSetIndex = 0;
  }
  if (exercise.setsList.length > 0 && exercise.activeSetIndex >= exercise.setsList.length) {
    exercise.activeSetIndex = exercise.setsList.length - 1;
  }
}

function addSetToExercise(exerciseIndex) {
  const index = parseInt(exerciseIndex, 10);
  const exercise = selectedExercises[index];
  if (!exercise) return;
  const fields = Array.isArray(exercise.fields) ? exercise.fields : ['sets', 'reps'];
  if (!(fields.includes('sets') || fields.includes('reps'))) return;
  ensureSetsList(exercise);

  const lastSet = exercise.setsList[exercise.setsList.length - 1] || { reps: '', weight: '', note: '' };
  exercise.setsList.push({
    reps: lastSet.reps || '',
    weight: lastSet.weight || '',
    note: lastSet.note || ''
  });
  exercise.activeSetIndex = exercise.setsList.length - 1;

  saveWorkoutDraft();
  renderExerciseList();
}

function removeSetFromExercise(exerciseIndex, setIndex) {
  const exerciseIdx = parseInt(exerciseIndex, 10);
  const setIdx = parseInt(setIndex, 10);
  const exercise = selectedExercises[exerciseIdx];
  if (!exercise || !Array.isArray(exercise.setsList)) return;

  exercise.setsList.splice(setIdx, 1);
  if (!Number.isInteger(exercise.activeSetIndex) || exercise.activeSetIndex >= exercise.setsList.length) {
    exercise.activeSetIndex = Math.max(exercise.setsList.length - 1, 0);
  }
  saveWorkoutDraft();
  renderExerciseList();
}

function updateVolumeSummary() {
  document.querySelectorAll('.exercise-item').forEach((exerciseDiv, index) => {
    const exercise = selectedExercises[index];
    if (!exercise) return;

    const setsList = Array.isArray(exercise.setsList) ? exercise.setsList : [];
    const fields = Array.isArray(exercise.fields) ? exercise.fields : ['sets', 'reps'];
    const showSetsReps = fields.includes('sets') || fields.includes('reps');
    const totalSets = setsList.length;
    const totalReps = setsList.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0);
    const totalWeight = setsList.reduce((sum, set) => sum + ((parseInt(set.reps, 10) || 0) * (parseFloat(set.weight) || 0)), 0);
    const label = showSetsReps && totalSets > 0 ? `${totalSets} sets • ${totalReps} reps • ${totalWeight} kg moved` : (showSetsReps ? 'No sets yet' : '');

    const labelEl = exerciseDiv.querySelector('.volume-details');
    if (labelEl) {
      labelEl.textContent = label;
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
  // This function existed previously but is now replaced with delegated listeners.
}

//////////////////////////////////////////////////////////////////////// Workout drafts and draft keeping


//-////////////////////////////////////////////////////////////////////// Add and edit section functionality
// Get elements// Get elements// Get elements
const toggleFormBtn = document.getElementById("toggleFormBtn");
const addExerciseSection = document.getElementById("addExerciseSection");
const workoutEditorBtn = document.getElementById("showeditorbtn");
const exoEditorBtn = document.getElementById("showexoeditorbtn");
const workoutEditorSection = document.getElementById("editorsection");
const exerciseEditorSection = document.getElementById("exerciseeditor");
const categorySelector = document.getElementById("categorySelector");
const typeSelector = document.getElementById("typeSelector");
const exerciseNotesSection = document.getElementById("exercisenotessection");

// Toggle form section and show/hide the two editor toggle buttons
toggleFormBtn.addEventListener("click", () => {
  addExerciseSection.classList.toggle("hidden");
  toggleFormBtn.textContent = addExerciseSection.classList.contains("hidden") ? "Add and Edit" : "Hide";

  if (addExerciseSection.classList.contains("hidden")) {
    workoutEditorBtn.classList.add("hidden");
    exoEditorBtn.classList.add("hidden");
    workoutEditorSection.classList.add("hidden");
    exerciseEditorSection.classList.add("hidden");
    workoutEditorBtn.textContent = "Workout Editor";
    exoEditorBtn.textContent = "Exercise Editor";
  } else {
    workoutEditorBtn.classList.remove("hidden");
    exoEditorBtn.classList.remove("hidden");
  }
});

// Toggle Workout Editor section
workoutEditorBtn.addEventListener("click", () => {
  workoutEditorSection.classList.toggle("hidden");
  exerciseEditorSection.classList.add("hidden");
  workoutEditorBtn.textContent = workoutEditorSection.classList.contains("hidden") ? "Workout Editor" : "Hide Workout Editor";
  exoEditorBtn.textContent = "Exercise Editor";
});

// Toggle Exercise Editor section
exoEditorBtn.addEventListener("click", () => {
  exerciseEditorSection.classList.toggle("hidden");
  workoutEditorSection.classList.add("hidden");
  exoEditorBtn.textContent = exerciseEditorSection.classList.contains("hidden") ? "Exercise Editor" : "Hide Exercise Editor";
  workoutEditorBtn.textContent = "Workout Editor";
});

// Function to load the focus area note
function loadFocusAreaNote() {
  const selectedFocusArea = categorySelector.value;
  exerciseNotesSection.innerHTML = ""; // Clear existing notes section

  if (selectedFocusArea) {
    const notesTextarea = document.createElement("textarea");
    notesTextarea.setAttribute("id", "notesInput");
    notesTextarea.style.width = "450px";
    notesTextarea.style.height = "100px";
    notesTextarea.style.marginTop = "10px";

    database.ref("focusareas").child(selectedFocusArea).once("value", (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data === "object" && data.note !== undefined && data.note.trim() !== "") {
        notesTextarea.value = data.note; // Load existing note
        notesTextarea.setAttribute("placeholder", ""); // No placeholder if note exists
      } else {
        notesTextarea.value = ""; // No note exists
        notesTextarea.setAttribute("placeholder", `Notes for ${selectedFocusArea}`); // Show placeholder
      }
    });

    exerciseNotesSection.appendChild(notesTextarea);
  }
}

// Listen for changes on the category selector
categorySelector.addEventListener("change", loadFocusAreaNote);

// Delay loading of notes when switching to "Focus Areas"
typeSelector.addEventListener("change", () => {
  if (typeSelector.value === "focusareas") {
    setTimeout(() => {
      loadFocusAreaNote();
    }, 500); // Short delay ensures categorySelector value updates first
  } else {
    exerciseNotesSection.innerHTML = ""; // Hide notes when switching to "Exercises"
  }
});



// Save changes made to the current exercise back to Firebase
function saveexo() {
  if (exerciseKeys.length === 0) return;
  var exerciseID = exerciseKeys[currentExerciseIndex];
  var refPath = "/" + currentExerciseType + "/" + currentExerciseCategory + "/" + exerciseID;

  var fields = Array.from(document.querySelectorAll('.field-checkbox'))
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  var updatedData = {
    name: document.getElementById("exercise_name").value,
    note: document.getElementById("exercise_note").value,
    fields: fields
  };

  var customLabelInput = document.getElementById("exercise_custom_label");
  if (fields.includes('custom') && customLabelInput) {
    updatedData.customLabel = customLabelInput.value || '';
  } else {
    updatedData.customLabel = '';
  }

  database.ref(refPath).update(updatedData)
    .then(() => {
      if (typeSelector.value === "focusareas") {
        var selectedFocusArea = categorySelector.value;
        var notesTextarea = document.getElementById("notesInput");
        if (selectedFocusArea && notesTextarea) {
          return database.ref("focusareas").child(selectedFocusArea).update({ note: notesTextarea.value });
        }
      }
      return Promise.resolve();
    })
    .then(() => {
      alert("Exercise updated successfully!");
      displayExercise();
    })
    .catch(error => alert("Error updating exercise: " + error.message));
}


//////////////////////////////////////////////////////////////////////// Add and edit section functionality

//-////////////////////////////////////////////////////////////////////// Past workouts list section

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

    const workoutFilterElement = document.getElementById('workout-filter');
    const selectedWorkoutFilter = workoutFilterElement
      ? workoutFilterElement.value.toLowerCase()
      : 'all';

    const workoutYearElement = document.getElementById('workout-year-filter');
    const selectedWorkoutYear = workoutYearElement ? workoutYearElement.value : 'all';

    const entries = Object.entries(workouts)
      .filter(([, workout]) => {
        if (!workout) return false;
        if (selectedWorkoutYear && selectedWorkoutYear !== 'all' && workout.date) {
          return workout.date.startsWith(selectedWorkoutYear);
        }
        return true;
      })
      .sort(([, a], [, b]) => (b.date || '').localeCompare(a.date || ''));

    entries.forEach(([, workout]) => {
      let workoutType = 'regular';
      if (workout.exercises && workout.exercises.length === 1) {
        const exerciseName = (workout.exercises[0].name || '').toLowerCase();
        workoutType = exerciseName === 'running' ? 'running' : 'activity';
      }
      if (selectedWorkoutFilter !== 'all' && workoutType !== selectedWorkoutFilter) {
        return;
      }

      const date = workout.date || '';
      const intensity = workout.intensity ? `Intensity: ${workout.intensity}/10` : '';
      const intensityNote = workout.intensityNote ? workout.intensityNote : '';
      const duration = workout.duration ? workout.duration : '';
      const dateText = `<strong>Workout on ${date}</strong>`;
      const intensityText = intensity ? `<span style="color: green;">${intensity}</span>` : '';
      const durationText = duration ? `<span style="color: green;">${duration}</span>` : '';
      const intensityNoteText = intensityNote ? `<span style="color: green;">${intensityNote}</span>` : '';

      const exercises = [...(workout.exercises || [])].reverse().map((e) => {
        const name = e.name || 'Unknown';
        const noteText = e.note ? ` <span style="color: red;">${e.note}</span>` : '';

        if (Array.isArray(e.setsList) && e.setsList.length > 0) {
          const setsList = e.setsList;
          const totalSets = setsList.length;
          const totalReps = setsList.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0);
          const weightMoved = setsList.reduce((sum, set) => sum + ((parseInt(set.reps, 10) || 0) * (parseFloat(set.weight) || 0)), 0);
          const summary = totalSets > 0 ? `${totalSets} sets • ${totalReps} reps${weightMoved ? ` • ${weightMoved} kg moved` : ''}` : '';
          const setDetails = setsList.map((set, idx) => {
            const reps = set.reps || '-';
            const weight = set.weight ? ` x ${set.weight}kg` : '';
            const setNote = set.note ? ` (${set.note})` : '';
            return `${idx + 1}) ${reps}${weight}${setNote}`;
          }).join(', ');
          return `<div style="margin:0; line-height:1.2;"><span style="color: blue;">${name}</span>: ${summary}${noteText}${setDetails ? ` — ${setDetails}` : ''}</div>`;
        }

        const parts = [];
        if (e.sets) parts.push(`${e.sets} sets`);
        if (e.reps) parts.push(`x ${e.reps} reps`);
        if (e.weight) parts.push(`@ ${e.weight}kg`);
        const legacyText = parts.join(' ');
        return `<div style="margin:0; line-height:1.2;"><span style="color: blue;">${name}</span>: ${legacyText}${noteText}</div>`;
      }).join('');

      const result = workout.result ? `<div style="margin:0.2rem 0 0 0; line-height:1.2;"><span style="color: darkorange;">Result: ${workout.result}</span></div>` : '';
      const workoutDiv = document.createElement('div');
      workoutDiv.className = 'saved-workout';
      workoutDiv.style.marginBottom = '1rem';
      workoutDiv.innerHTML = `
        <div style="margin:0; line-height:1.2;">${dateText}</div>
        <div style="margin:0; line-height:1.2;">${intensityText}${intensityText && durationText ? ' ' : ''}${durationText}${(intensityText || durationText) && intensityNoteText ? ' ' : ''}${intensityNoteText}</div>
        ${exercises}
        ${result}
      `;
      savedWorkoutList.appendChild(workoutDiv);
    });
  });
}

// Add an event listener to re-render workouts when the filter changes
document.getElementById('workout-filter').addEventListener('change', () => {
  renderSavedWorkouts();
});

const workoutYearSelect = document.getElementById('workout-year-filter');
if (workoutYearSelect) {
  workoutYearSelect.addEventListener('change', () => {
    renderSavedWorkouts();
  });
}

// Toggle workouts (and the filter) when the "Show workouts" button is clicked
workoutButton.addEventListener('click', () => {
  const workoutFilterElement = document.getElementById('workout-filter');
  const workoutYearElement = document.getElementById('workout-year-filter');
  if (workoutButton.textContent === 'Show workouts') {
    renderSavedWorkouts(); // Populate the workouts
    savedWorkoutList.classList.remove('hidden'); // Make the workouts list visible
    workoutButton.textContent = 'Hide workouts'; // Change button text
    if (workoutFilterElement) workoutFilterElement.style.display = 'inline';
    if (workoutYearElement) workoutYearElement.style.display = 'inline';
  } else {
    savedWorkoutList.innerHTML = ''; // Clear the workouts content
    savedWorkoutList.classList.add('hidden'); // Hide the workouts list
    workoutButton.textContent = 'Show workouts'; // Change button text back
    if (workoutFilterElement) workoutFilterElement.style.display = 'none';
    if (workoutYearElement) workoutYearElement.style.display = 'none';
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



//-////////////////////////////////////////////////////////////////////// last workout result field 
function checkLastWorkoutResult() {
  const workoutsRef = database.ref('workouts');

  workoutsRef.orderByChild('date').limitToLast(1).once('value', snapshot => {
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const workout = child.val();
        const workoutKey = child.key;

        // Only show if result is missing or empty
        if (!workout.result || workout.result.trim() === '') {
          const date = workout.date || 'recently';
          const input = document.getElementById('lastworkoutresult');
          const resultSection = document.getElementById('resultsection');

          input.placeholder = `How did you feel after your workout on ${date}?`;
          input.dataset.key = workoutKey; // Save the key for use when saving
          resultSection.classList.remove('hidden');
        }
      });
    }
  });
}

function savelastworkoutresult() {
  const input = document.getElementById('lastworkoutresult');
  const workoutKey = input.dataset.key;
  const result = input.value.trim();

  if (!result) {
    alert('Please enter how you felt!');
    return;
  }

  const workoutRef = database.ref('workouts/' + workoutKey);
  workoutRef.update({ result: result }, (error) => {
    if (error) {
      console.error('Error saving result:', error);
    } else {
      document.getElementById('resultsection').classList.add('hidden');
    }
  });
}




// Initialize the app
loadExercises();
loadWorkoutDraft();
renderSavedWorkouts();  // Ensure saved workouts are shown when the app loads
checkLastWorkoutResult();