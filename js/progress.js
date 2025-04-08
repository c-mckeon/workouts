document.getElementById('toggleprogressBtn').addEventListener('click', () => {
  const progressArea = document.getElementById('progressarea');
  progressArea.classList.toggle('hidden');
  fillAdditionalDropdowns();
});


// Firebase reference for ORMexercises 
const ORMexerciseRef = database.ref('ORMexercises');

// Function to fill the dropdowns
function fillAdditionalDropdowns() {
    const dropdownIds = ["ORMexerciseInput", "ORMexerciseDropdown"];  // IDs of other dropdowns you want to fill

    // Loop through each dropdown and append the data from Firebase
    dropdownIds.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            // Clear existing options
            dropdown.innerHTML = "";

            // Fetch exercises from Firebase
            ORMexerciseRef.once('value', snapshot => {
                const exercises = snapshot.val();

                if (exercises) {
                    // Loop through the exercises and append them to the dropdown
                    Object.keys(exercises).forEach(exerciseId => {
                        const exercise = exercises[exerciseId];
                        const option = document.createElement('option');
                        option.value = exerciseId;
                        option.textContent = exercise.name;  // Assuming each exercise has a 'name' property
                        dropdown.appendChild(option);
                    });
                }

                // Add the "Add New Exercise" option at the bottom
                const addOption = document.createElement('option');
                addOption.value = "add_new";
                addOption.textContent = "Add New Exercise";
                dropdown.appendChild(addOption);
            });

            // Event listener to handle the "Add New Exercise" option
            dropdown.addEventListener('change', function() {
                if (dropdown.value === 'add_new') {
                    // Prompt the user to enter a new exercise name
                    const newExerciseName = prompt("Enter the name of the new exercise:");

                    if (newExerciseName) {
                        // Save the new exercise to Firebase
                        const newExerciseRef = ORMexerciseRef.push();
                        newExerciseRef.set({
                            name: newExerciseName
                        })
                        .then(() => {
                            alert("New exercise added successfully!");
                            // Optionally, refresh the dropdown content after adding
                            fillAdditionalDropdowns();
                        })
                        .catch(error => {
                            console.error("Error adding new exercise:", error);
                            alert("Failed to add new exercise.");
                        });
                    }
                }
            });
        } else {
            console.error(`❌ ERROR: ${dropdownId} element not found!`);
        }
    });
}



// Record performance data (exercise, sets, reps, weight, 1RM)
function sendPerformanceData() {
  const exerciseKey = document.getElementById('ORMexerciseInput').value; // this is the key
  const reps = parseInt(document.getElementById('ORMrepsInput').value, 10);
  const weight = parseFloat(document.getElementById('ORMweightInput').value);

  // Validate input
  if (!exerciseKey || isNaN(reps) || isNaN(weight)) {
    alert("Please fill in all fields correctly.");
    return;
  }

  // Fetch the exercise name from Firebase based on the key
  firebase.database().ref('ORMexercises/' + exerciseKey).once('value', snapshot => {
    const exerciseName = snapshot.val().name; // Assuming 'name' is the field in Firebase

    if (!exerciseName) {
      alert('Exercise name not found.');
      return;
    }

    // Calculate the estimated 1RM using the Epley formula
    const epley = weight * (1 + reps / 30);
    const brzycki = weight * (36 / (37 - reps));
    const lombardi = weight * Math.pow(reps, 0.10);
    const oconner = weight * (1 + 0.025 * reps);
    const wathan = (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
    const mayhew = (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));

    // Output each formula's estimate
    console.log(`Epley: ${epley.toFixed(2)}`);
    console.log(`Brzycki: ${brzycki.toFixed(2)}`);
    console.log(`Lombardi: ${lombardi.toFixed(2)}`);
    console.log(`O’Conner: ${oconner.toFixed(2)}`);
    console.log(`Wathan: ${wathan.toFixed(2)}`);
    console.log(`Mayhew: ${mayhew.toFixed(2)}`);

    // Calculate the average of all formulas
    const estimated1RM = (epley + brzycki + lombardi + oconner + wathan + mayhew) / 6;
    console.log(`Average 1RM: ${estimated1RM.toFixed(2)}`);

    const timestamp = new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString();
    const unixtime = new Date().getTime() + 2 * 60 * 60 * 1000;

    // Push the data to Firebase under the "estimoneRepMax" node
    firebase.database().ref('estimoneRepMax').push({
      exercise: exerciseKey,
      name: exerciseName, // Save the exercise name, not the Firebase key
      reps: reps,
      weight: weight,
      estimated1RM: estimated1RM,
      timestamp: timestamp,
      unixtime: unixtime
    });
  });
}



// Function to delete a performance entry with confirmation
function deletePerformance(performanceKey) {
  // Ask the user for confirmation
  var isConfirmed = confirm("Are you sure you want to delete this performance entry?");
  
  if (isConfirmed) {
    // Get a reference to the specific performance entry in the database
    var performanceRef = firebase.database().ref('estimoneRepMax/' + performanceKey);
    
    // Remove the performance entry from the database
    performanceRef.remove().then(function() {

    }).catch(function(error) {

    });
  } else {

  }
}





// Generate the chart for a selected exercise
function generateChart() {
  const selectedExercise = document.getElementById('ORMexerciseDropdown').value;
  if (!selectedExercise) {
    alert("Please select an exercise.");
    return;
  }

  // Fetch performance data from Firebase (once, not listening for changes)
  firebase.database().ref('estimoneRepMax').on('value', function(snapshot) {
    var performanceList = document.getElementById("performanceList");
    performanceList.innerHTML = ""; // Clear the existing list

    var chartData = [];

    snapshot.forEach(function(childSnapshot) {
      var performanceData = childSnapshot.val();

      // Only process data for the selected exercise
      if (performanceData.exercise === selectedExercise) {
        // Update the performance list
        var li = document.createElement("li");
        li.style.display = "flex";

        // Create a delete button for each entry
var deleteButton = document.createElement("button");
deleteButton.textContent = "-";

// Style the delete button to be centrally aligned and scaled around the center line
deleteButton.style.marginRight = "10px"; // Keep the right margin
deleteButton.style.height = "20px"; // Set height
deleteButton.style.width = "20px"; // Optional: set width equal to height to make it square
deleteButton.style.display = "flex"; // Use flexbox to align content
deleteButton.style.alignItems = "center"; // Vertically center the "-" symbol
deleteButton.style.justifyContent = "center"; // Horizontally center the "-" symbol
deleteButton.style.padding = "0"; // Remove default padding
deleteButton.addEventListener("click", function() {
  deletePerformance(childSnapshot.key); // Handle delete performance entry
});

// Append the button to the list item
li.appendChild(deleteButton);


        // Create a span element to display performance data
        var span = document.createElement("span");
        span.textContent = `${performanceData.name}, Reps: ${performanceData.reps},  Weight: ${performanceData.weight} kg,  1RM: ${performanceData.estimated1RM.toFixed(2)}, ${performanceData.timestamp}`;
        li.appendChild(span);

        performanceList.appendChild(li);

        // Add to chart data for the selected exercise
        chartData.push({
          x: new Date(performanceData.unixtime),  // x-axis: date
          y: parseFloat(performanceData.estimated1RM)  // y-axis: estimated 1RM
        });
      }
    });

    if (chartData.length === 0) {
      alert("No data found for the selected exercise.");
      return;
    }

    // Sort the chartData based on the x values (unixtime) to ensure chronological order
    chartData.sort(function(a, b) {
      return a.x - b.x;
    });

    // Optional: apply dynamic smoothing to the data (using your existing method)
    function dynamicSmoothing(chartData, sigma, windowSize) {
      let smoothedData = [];
      for (let i = 0; i < chartData.length; i++) {
        let centerTime = chartData[i].x;

        let rollingSum = 0;
        let rollingCount = 0;
        let gaussianSum = 0;
        let weightSum = 0;
        let pointCountInWindow = 0;

        // Compute rolling average (index-based window)
        let start = Math.max(0, i - windowSize);
        let end = Math.min(chartData.length - 1, i + windowSize);
        for (let j = start; j <= end; j++) {
          rollingSum += chartData[j].y;
          rollingCount++;
        }

        // Compute Gaussian smoothing (time-based)
        for (let j = 0; j < chartData.length; j++) {
          let timeDiff = chartData[j].x - centerTime;
          if (Math.abs(timeDiff) <= sigma) {
            pointCountInWindow++;
          }
          let weight = Math.exp(-Math.pow(timeDiff, 2) / (2 * Math.pow(sigma, 2)));
          gaussianSum += chartData[j].y * weight;
          weightSum += weight;
        }

        let rollingAvgY = rollingSum / rollingCount;
        let gaussianAvgY = gaussianSum / weightSum;

        // Normalize density from 1–8 to blendFactor 0–1
        let density = Math.min(8, Math.max(1, pointCountInWindow));
        let blendFactor = (density - 1) / (8 - 1); // 0 at 1 point, 1 at 8 points

        // Adjust to start at 20% Gaussian (i.e., 80% rolling)
        let gaussianWeight = 0.5 + 0.5 * blendFactor;
        let rollingWeight = 1 - gaussianWeight;

        let blendedY = rollingWeight * rollingAvgY + gaussianWeight * gaussianAvgY;

        smoothedData.push({
          x: chartData[i].x,
          y: blendedY
        });
      }
      return smoothedData;
    }

    // Example values for smoothing: 10 days in ms for Gaussian and window size of 5
    let sigma = 10 * 24 * 60 * 60 * 1000;
    let windowSize = 5;
    let combinedSmoothedData = dynamicSmoothing(chartData, sigma, windowSize);

    // Create or update the chart on the canvas with id "progress-chart"
    createOrUpdateChart(chartData, combinedSmoothedData, selectedExercise);
  }).catch(function(error) {
    console.error("Error fetching data:", error);
  });
}


// Function to create or update the chart using Chart.js
function createOrUpdateChart(chartData, smoothedData, exerciseLabel) {
  var ctx = document.getElementById('progress-chart').getContext('2d');

  // Destroy previous chart if it exists
  if (window.performanceChart) {
    window.performanceChart.destroy();
  }

  window.performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: ' Estimated 1RM',
        data: chartData,
        borderColor: 'blue',
        pointBackgroundColor: 'black',
        pointRadius: 3,
        fill: false,
        tension: 0.3,
        cubicInterpolationMode: 'monotone',
        showLine: false,
      }, {
        label: 'Trendline',
        data: smoothedData,
        borderColor: 'red',
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        cubicInterpolationMode: 'monotone'
      }]
    },
    options: {
      responsive: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'dd MMM yyyy'
            }
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Estimated 1RM (kg)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: function(context) {
              return new Date(context[0].parsed.x).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              });
            }
          }
        }
      }
    }
  });
}
