// Function to format the date as "DD MMM"
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { day: '2-digit', month: 'short' };
  return date.toLocaleDateString('en-GB', options); // Adjusted for 'en-GB' to get the format DD MMM
}

// Function to get the background color based on intensity (light to dark green)
function getIntensityColor(intensity) {
  intensity = intensity || 5; // Default intensity is 5 if not provided
  intensity = Math.max(1, Math.min(10, intensity)); // Clamp intensity between 1 and 10
  if (intensity === 1) return 'rgb(230, 240, 230)'; // Intensity 1: White
  if (intensity === 2) return 'rgb(210, 240, 206)'; // Intensity 2: Light Gray
  if (intensity === 3) return 'rgb(183, 240, 183)'; // Intensity 3: Pale Green
  if (intensity === 4) return 'rgb(160, 236, 160)'; // Intensity 4: Lighter Green
  if (intensity === 5) return 'rgb(130, 230, 130)'; // Intensity 5: Light Green
  if (intensity === 6) return 'rgb(105, 220, 105)'; // Intensity 6: Medium Light Green
  if (intensity === 7) return 'rgb(100, 205, 100)';  // Intensity 7: Medium Green
  if (intensity === 8) return 'rgb(85, 195, 85)';  // Intensity 8: Darker Green
  if (intensity === 9) return 'rgb(70, 185, 70)';   // Intensity 9: Dark Green
  if (intensity === 10) return 'rgb(65, 175, 65)';  // Intensity 10: Darkest Green
}

// Select the button element
const clickButton = document.querySelector('.click');

// Add event listener for the click event
clickButton.addEventListener('click', () => {
  const visualsContainer = document.querySelector('#visuals-container');

  if (clickButton.textContent === 'Show chart') {
    console.log('Button clicked. Running analytics...');
    runanalytics(); // Save the draft after adding an exercise
    generatevisuals(); // Ensure this function is defined elsewhere
    clickButton.textContent = 'Hide chart'; // Change button text to "Hide"
  } else {
    visualsContainer.innerHTML = ''; // Clear the content of visuals container
    clickButton.textContent = 'Show chart'; // Change button text to "Show chart"
  }
});


async function runanalytics() {
  const sourceRef = firebase.database().ref('/'); // Root of the source database
  const destinationRef = firebase.database().ref('/analyticsdb'); // Destination database
  const analyticsRef = destinationRef.child('analytics/exercise-count'); // Path for analytics

  console.log('Starting runanalytics...');

  try {
    // Fetch the entire database
    const snapshot = await sourceRef.once('value');
    const data = snapshot.val();

    if (data) {
      // Prepare exercise frequency map
      const exercises = {}; // Object to store exercise frequency

      // Check if workouts exist
      if (data.workouts) {
        const workouts = Object.values(data.workouts);

        // Iterate over each workout
        workouts.forEach((workout) => {
          if (workout.exercises) {
            const exerciseList = Object.values(workout.exercises);

            // Count the frequency of each exercise
            exerciseList.forEach((exercise) => {
              if (exercise.name) {
                // Sanitize the exercise name to use it as a valid key
                const sanitizedExerciseName = exercise.name.replace(/[.#$/\[\]]/g, '_');
                exercises[sanitizedExerciseName] = (exercises[sanitizedExerciseName] || 0) + 1;
              }
            });
          }
        });
      }

      // Sort exercises by frequency (most frequent first)
      const sortedExercises = Object.entries(exercises)
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .map(([exercise]) => exercise); // Extract sorted exercise names

      // Write analytics data and sorted exercises to the database
      await analyticsRef.set({
        sortedExercises,
        frequencies: exercises
      });

      console.log('Analytics data written successfully.');
    }
  } catch (error) {
    console.error('Error during runanalytics:', error);
  }
}

async function generatevisuals() {
  const analyticsRef = firebase.database().ref('/analyticsdb/analytics/exercise-count');
  const sourceRef = firebase.database().ref('/');

  try {
    // Fetch analytics data (exercise counts and sorted exercises)
    console.log('Fetching analytics data from Firebase...');
    const analyticsSnapshot = await analyticsRef.once('value');
    const analyticsData = analyticsSnapshot.val();

    console.log('Analytics Data:', analyticsData); // Log the fetched analytics data

    if (!analyticsData || !analyticsData.sortedExercises) {
      console.error('No analytics data available to generate visuals.');
      return;
    }

    const sortedExercises = analyticsData.sortedExercises; // Sorted exercise names
    console.log('Sorted Exercises:', sortedExercises); // Log sorted exercises

    // Fetch workouts data
    const sourceSnapshot = await sourceRef.once('value');
    const data = sourceSnapshot.val();

    if (!data || !data.workouts) {
      console.error('No workouts data available to generate visuals.');
      return;
    }

    const workouts = Object.values(data.workouts);

    // Group workouts by date and find the maximum intensity for each date
    const workoutsByDate = workouts.reduce((acc, workout) => {
      const date = workout.date;
      const intensity = workout.intensity;

      // Create or update workout entry for the date
      if (!acc[date]) {
        acc[date] = { workouts: [], maxIntensity: intensity };
      }

      // Add the workout to the date's group
      acc[date].workouts.push(workout);
      // Update the max intensity for the day
      acc[date].maxIntensity = Math.max(acc[date].maxIntensity, intensity);

      return acc;
    }, {});

    console.log('Workouts Grouped by Date:', workoutsByDate); // Log grouped workouts

    // Create HTML table dynamically
    const tableContainer = document.getElementById('visuals-container');
    tableContainer.innerHTML = ''; // Clear previous visuals

    const table = document.createElement('table');
    table.className = 'exercise-table';
    table.style.borderCollapse = 'collapse'; // Ensure borders collapse into a single border

    // Create header row (Dates)
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th'); // Empty cell for the corner
    headerRow.appendChild(emptyHeader);

    Object.keys(workoutsByDate).forEach((date) => {
      const dateHeader = document.createElement('th');
      const formattedDate = formatDate(date);
      dateHeader.textContent = formattedDate;
      dateHeader.style.border = '1px solid black'; // Add border to each header cell
      headerRow.appendChild(dateHeader);
    });

    table.appendChild(headerRow);

    // Create rows for each exercise
    sortedExercises.forEach((exercise) => {
      const row = document.createElement('tr');

      // Add row header (exercise name)
      const exerciseCell = document.createElement('th');
      exerciseCell.textContent = exercise;
      exerciseCell.style.border = '1px solid black'; // Add border to the exercise name cell
      row.appendChild(exerciseCell);

      // Add cells for each date
      Object.keys(workoutsByDate).forEach((date) => {
        const cell = document.createElement('td');
        cell.style.border = '1px solid black'; // Add border to each data cell

        // Check if the exercise was performed on this date
        const didExercise = workoutsByDate[date].workouts.some((workout) => {
          const exercises = workout.exercises || {};
          return Object.values(exercises).some((e) => {
            const sanitizedExercise = e.name.replace(/[.#$/\[\]]/g, '_');
            const sanitizedSortedExercise = exercise.replace(/[.#$/\[\]]/g, '_');
            return sanitizedExercise === sanitizedSortedExercise;
          });
        });

        // Get the intensity color for this date's workouts
        const intensityColor = getIntensityColor(workoutsByDate[date].maxIntensity);

        // Color the cell based on the intensity color if the exercise was performed
        if (didExercise) {
          cell.style.backgroundColor = intensityColor; // Apply the intensity color
        } else {
          cell.style.backgroundColor = '#f0f0f0'; // Light gray for not performed
        }

        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    tableContainer.appendChild(table);
  } catch (error) {
    console.error('Error during generatevisuals:', error);
  }
}
