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


// Function to fetch workout data from Firebase
async function fetchWorkouts() {
  const sourceRef = firebase.database().ref('/'); // Root of the source database
  try {
    // Fetch the entire database
    const snapshot = await sourceRef.once('value');
    const data = snapshot.val();

    if (data && data.workouts) {
      // Parse workouts data
      const workouts = Object.values(data.workouts).map(workout => ({
        date: workout.date,
        intensity: workout.intensity
      }));

      return workouts;
    } else {
      return []; // Return an empty array if no workouts exist
    }
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return []; // Return an empty array if there's an error
  }
}

// Add event listener to show calendar
document.getElementById("showcal").querySelector("button").addEventListener("click", async function() {
  // Fetch workout data from Firebase
  const workouts = await fetchWorkouts();
  
  // Create the calendar based on the fetched data
  createCalendar(workouts);
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

async function groupWorkoutsByDate() {
  const sourceRef = firebase.database().ref('/');

  try {
    // Fetch workouts data
    const sourceSnapshot = await sourceRef.once('value');
    const data = sourceSnapshot.val();

    if (!data || !data.workouts || !data.exercises) {
      console.error('No workouts or exercises data available.');
      return;
    }

    const workouts = Object.values(data.workouts);
    const exercises = data.exercises;

    return workouts.reduce((acc, workout) => {
      const date = workout.date;
      const intensity = workout.intensity;

      // Determine workout type
      let workoutType = "Regular"; // Default to "Regular"
      
      if (workout.exercises && workout.exercises.length === 1) {
        const exerciseName = workout.exercises[0].name;

        if (exerciseName === "Running") {
          workoutType = "Running";
        } else {
          // Check if exercise belongs to the "activity" class
          const activityExercises = Object.values(exercises.activity || {}).map(e => e.name);
          if (activityExercises.includes(exerciseName)) {
            workoutType = "Activity";
          }
        }
      }

      // Create or update workout entry for the date
      if (!acc[date]) {
        acc[date] = { workouts: [], maxIntensity: intensity, type: workoutType }; // Include 'type'
      }

      // Add the workout to the date's group
      acc[date].workouts.push(workout);

      // Update the max intensity for the day
      acc[date].maxIntensity = Math.max(acc[date].maxIntensity, intensity);

      // Update the workout type if it's more specific (e.g., "Running" > "Activity" > "Regular")
      const typePriority = { Running: 3, Activity: 2, Regular: 1 };
      if (typePriority[workoutType] > typePriority[acc[date].type]) {
        acc[date].type = workoutType;
      }

      return acc;
    }, {}); // Grouped workouts by date

  } catch (error) {
    console.error('Error fetching or processing workouts:', error);
  }
}


// Call the integrated groupWorkoutsByDate function
groupWorkoutsByDate().then(workoutsByDate => {
  if (workoutsByDate) {
    console.log('Grouped Workouts by Date:', workoutsByDate);
    // You can now use workoutsByDate for any further operations
  }
});






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


    // Fetch workouts data
    const sourceSnapshot = await sourceRef.once('value');
    const data = sourceSnapshot.val();

    if (!data || !data.workouts) {
      console.error('No workouts data available to generate visuals.');
      return;
    }

    const workouts = Object.values(data.workouts);

    // Call the helper function to group workouts by date
    const workoutsByDate = await groupWorkoutsByDate(workouts);

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









// Function to get the week number and the day of the week (1 = Monday, ..., 7 = Sunday)
function getWeekAndDay(date) {
  const startDate = new Date('2025-01-01'); // Week 1 starts on January 1, 2025 (Wednesday)

  // Get the difference in time (in milliseconds)
  const diffTime = date - startDate;
  
  // Calculate the number of days between the start date and the input date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate the week number (adjusted to start from Monday)
  const weekNumber = Math.ceil((diffDays + 1) / 7);
  
  date.setDate(date.getDate() - 1); // Subtract one day from the date
  let dayOfWeek = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  
  // If the day is Sunday (0), set it as 7
  dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  return { weekNumber, dayOfWeek };
}

// Function to determine the intensity color based on the workout intensity
function getIntensityColor(intensity) {
  intensity = intensity || 5; // Default intensity is 5 if not provided
  intensity = Math.max(1, Math.min(10, intensity)); // Clamp intensity between 1 and 10
  if (intensity === 1) return 'rgb(230, 240, 230)'; // Intensity 1: Light Green
  if (intensity === 2) return 'rgb(210, 240, 206)'; // Intensity 2: Light Green
  if (intensity === 3) return 'rgb(183, 240, 183)'; // Intensity 3: Light Green
  if (intensity === 4) return 'rgb(160, 236, 160)'; // Intensity 4: Green
  if (intensity === 5) return 'rgb(130, 230, 130)'; // Intensity 5: Green
  if (intensity === 6) return 'rgb(105, 220, 105)'; // Intensity 6: Dark Green
  if (intensity === 7) return 'rgb(100, 205, 100)'; // Intensity 7: Dark Green
  if (intensity === 8) return 'rgb(85, 195, 85)'; // Intensity 8: Dark Green
  if (intensity === 9) return 'rgb(70, 185, 70)'; // Intensity 9: Dark Green
  if (intensity === 10) return 'rgb(65, 175, 65)'; // Intensity 10: Dark Green
  return 'rgb(255, 255, 255)'; // Default to white
}

// Function to create the calendar based on workout data
// Function to create the calendar based on workout data
async function createCalendar() {
  // Assume workoutsByDate is generated by the groupWorkoutsByDate function
  const workoutsByDate = await groupWorkoutsByDate();

  const container = document.getElementById("calendar-container");

  // Create the table header
  const headerRow = `
    <tr>
      <th class="week-column">Week</th>
      <th class="day-column">M</th>
      <th class="day-column">T</th>
      <th class="day-column">W</th>
      <th class="day-column">T</th>
      <th class="day-column">F</th>
      <th class="day-column">S</th>
      <th class="day-column">S</th>
    </tr>
  `;

  let rows = "";


// Define the common border styles
const leftborder = "border-left: 2px solid black;";
const topborder = "border-top: 2px solid black;";
// Define the dates for the respective borders
const leftdates = [
  "2025-01-02", "2025-02-02", "2025-03-02", "2025-04-02", 
  "2025-05-02", "2025-06-02", "2025-07-02", "2025-08-02", 
  "2025-09-02", "2025-10-02", "2025-11-02", "2025-12-02"
];
const topdates = [
  "2025-01-07", "2025-01-08", 
  "2025-02-02","2025-02-03","2025-02-04","2025-02-05","2025-02-06","2025-02-07","2025-02-08",
  "2025-03-02","2025-03-03","2025-03-04","2025-03-05","2025-03-06","2025-03-07","2025-03-08",
  "2025-04-02","2025-04-03","2025-04-04","2025-04-05","2025-04-06","2025-04-07","2025-04-08",
  "2025-05-02","2025-05-03","2025-05-04","2025-05-05","2025-05-06","2025-05-07","2025-05-08",
  "2025-06-02","2025-06-03","2025-06-04","2025-06-05","2025-06-06","2025-06-07","2025-06-08",
  "2025-07-02","2025-07-03","2025-07-04","2025-07-05","2025-07-06","2025-07-07","2025-07-08",
  "2025-08-02","2025-08-03","2025-08-04","2025-08-05","2025-08-06","2025-08-07","2025-08-08",
  "2025-09-02","2025-09-03","2025-09-04","2025-09-05","2025-09-06","2025-09-07","2025-09-08",
  "2025-10-02","2025-10-03","2025-10-04","2025-10-05","2025-10-06","2025-10-07","2025-10-08",
  "2025-11-02","2025-11-03","2025-11-04","2025-11-05","2025-11-06","2025-11-07","2025-11-08",
  "2025-12-02","2025-12-03","2025-12-04","2025-12-05","2025-12-06","2025-12-07","2025-12-08",
];
// Generate the customBorders object dynamically
const customBorders = leftdates.reduce((acc, date) => {
  acc[date] = leftborder;  // Apply the left border for leftdates
  return acc;
}, {});

// Add top borders to the customBorders object for topdates, combining with existing borders
topdates.forEach(date => {
  // If the date already has a left border, append the top border to it, otherwise just set the top border
  if (customBorders[date]) {
    customBorders[date] += ` ${topborder}`;
  } else {
    customBorders[date] = topborder;
  }
});


  

  for (let i = 1; i <= 52; i++) {
    // Create each row for the week
    let row = `<tr><td>Week ${i}</td>`;

    for (let day = 1; day <= 7; day++) { // Days of the week: 1 = Monday, ..., 7 = Sunday
      const currentDate = new Date('2025-01-01');
      currentDate.setDate(currentDate.getDate() + (i - 1) * 7 + (day - 1)); // Calculate the exact date for this cell

      // Adjust the day by subtracting 2 days to align everything correctly
      currentDate.setDate(currentDate.getDate() - 1); // Shift by 1 more day

      const today = new Date();
      today.setDate(today.getDate() + 1);
      const currentDateString = currentDate.toISOString().split('T')[0]; // Format the date to YYYY-MM-DD
      const { weekNumber: todayWeek, dayOfWeek: todayDay } = getWeekAndDay(today);
      const { weekNumber: cellWeek, dayOfWeek: cellDay } = getWeekAndDay(currentDate);

      // Check if there's a workout for the current date
      const workoutData = workoutsByDate[currentDate.toISOString().split('T')[0]]; // Get the workout data for this date

      let color;

      // Check if today has no workout
      if (currentDate.toISOString().split('T')[0] === today.toISOString().split('T')[0] && !workoutData) {
        color = 'rgb(255, 255, 146)'; // Yellow for today if no workout
      }

      // Check if the current date is a past day with no workout
      else if (currentDate < today && !workoutData) {
        color = 'rgb(233, 233, 233)'; // Light grey for past days with no workout
      }
      // Check workout type if workout data exists
      else if (workoutData) {
        if (workoutData.type === 'Running') {
          color = 'rgb(139, 160, 243)'; // Blue for running workouts
        } else if (workoutData.type === 'Activity') {
          color = 'rgb(232, 172, 248)'; // Red for activity workouts
        } else {
          color = getIntensityColor(workoutData.maxIntensity); // Color based on maxIntensity for regular workouts
        }
      }
      // Default to white for future days with no workout
      else {
        color = 'rgb(255, 255, 255)';
      }

      // Apply custom borders if defined
      const customBorderStyle = customBorders[currentDateString] || "";

      row += `<td style="background-color:${color};border:1px solid grey;${customBorderStyle}"></td>`;
    }

    row += `</tr>`;
    rows += row;
  }

  // Insert the table into the calendar container
  container.innerHTML = `<table border="1" style="border-collapse: collapse;">${headerRow}${rows}</table>`;
}





// Add event listener to show calendar
document.getElementById("showcal").querySelector("button").addEventListener("click", function() {
  const button = document.querySelector('#showcal button');
  const calendarContainer = document.getElementById("calendar-container");

  // Your workout data (replace with actual data you have)
  const workouts = [

  ];

  // Toggle calendar visibility
  if (button.textContent === 'Show calendar') {
    // Show the calendar and generate it
    calendarContainer.style.display = 'block'; // Show the calendar
    createCalendar(workouts); // Generate calendar based on workouts data
    button.textContent = 'Hide calendar'; // Change button text to "Hide calendar"
  } else {
    // Hide the calendar
    calendarContainer.style.display = 'none'; // Hide the calendar
    button.textContent = 'Show calendar'; // Change button text back to "Show calendar"
  }
});
