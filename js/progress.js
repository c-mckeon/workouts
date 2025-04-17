document.getElementById('toggleprogressBtn').addEventListener('click', () => {
  const progressArea = document.getElementById('progressarea');
  progressArea.classList.toggle('hidden');
  fillAdditionalDropdowns();
  generateChart()
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

           // Add the "All exercises" option at the top
const allOption = document.createElement('option');
allOption.value = "all";
allOption.textContent = "All exercises";
dropdown.appendChild(allOption);

            
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

    // Output each formula's estimate
    console.log(`Epley: ${epley.toFixed(2)}`);
    console.log(`Brzycki: ${brzycki.toFixed(2)}`);
    console.log(`Lombardi: ${lombardi.toFixed(2)}`);
    console.log(`O’Conner: ${oconner.toFixed(2)}`);
    console.log(`Wathan: ${wathan.toFixed(2)}`);


    // Calculate the average of all formulas
    const estimated1RM = (epley + brzycki + lombardi + oconner + wathan ) / 5;
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
   
    generateChart();
  } else {

  }
}


// Generate the chart for a selected exercise or for all exercises
function generateChart() {
  const dropdown = document.getElementById('ORMexerciseInput');
  const selectedExerciseKey = dropdown.value.trim();
  const selectedExerciseText = dropdown.options[dropdown.selectedIndex].text.trim();
  
  if (!selectedExerciseKey) {
    alert("Please select an exercise.");
    return;
  }
  
  // First, fetch the exercise mapping (key → name) from ORMexercises
  firebase.database().ref('ORMexercises').once('value').then(function(exerciseSnapshot) {
    const exerciseMap = {};
    exerciseSnapshot.forEach(function(child) {
      exerciseMap[child.key] = child.val().name;
    });

    // Then, fetch performance data from Firebase (once, not listening for changes)
    firebase.database().ref('estimoneRepMax').once('value').then(function(snapshot) {
      var performanceList = document.getElementById("performanceList");
      performanceList.innerHTML = ""; // Clear the existing list

      // Define the dynamic smoothing function (unchanged)
      function dynamicSmoothing(chartData, sigma, windowSize) {
        let smoothedData = [];
        for (let i = 0; i < chartData.length; i++) {
          let centerTime = chartData[i].x;
          let rollingSum = 0;
          let rollingCount = 0;
          let gaussianSum = 0;
          let weightSum = 0;
          let pointCountInWindow = 0;
          let start = Math.max(0, i - windowSize);
          let end = Math.min(chartData.length - 1, i + windowSize);
          for (let j = start; j <= end; j++) {
            rollingSum += chartData[j].y;
            rollingCount++;
          }
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
          let density = Math.min(8, Math.max(1, pointCountInWindow));
          let blendFactor = (density - 1) / (8 - 1);
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

      let sigma = 1 * 24 * 60 * 60 * 1000;  // 10 days in milliseconds for Gaussian smoothing
      let windowSize = 0;                     // window size of 5

      // Check if "All exercises" is selected using the displayed text
      if (selectedExerciseText.toLowerCase() === "all exercises") {
        let groupedData = {};
        let smoothedGroupedData = {};

        snapshot.forEach(function(childSnapshot) {
          var performanceData = childSnapshot.val();

          // Update the performance list with every entry
          var li = document.createElement("li");
          li.style.display = "flex";

          var deleteButton = document.createElement("button");
          deleteButton.textContent = "-";
          deleteButton.style.marginRight = "10px";
          deleteButton.style.height = "20px";
          deleteButton.style.width = "20px";
          deleteButton.style.display = "flex";
          deleteButton.style.alignItems = "center";
          deleteButton.style.justifyContent = "center";
          deleteButton.style.padding = "0";
          deleteButton.addEventListener("click", function() {
            deletePerformance(childSnapshot.key);
          });
          li.appendChild(deleteButton);

          var span = document.createElement("span");
          span.textContent = `${performanceData.name}, Reps: ${performanceData.reps},  Weight: ${performanceData.weight} kg,  1RM: ${performanceData.estimated1RM.toFixed(2)}, ${performanceData.timestamp}`;
          li.appendChild(span);
          performanceList.appendChild(li);

          // Use the exerciseMap so that the label is the human-readable name, not the Firebase key
          const exerciseKey = performanceData.exercise;
          const exerciseName = exerciseMap[exerciseKey] || exerciseKey;

          // EXCLUDE starred exercises when charting all
          if (exerciseName.trim().startsWith('*')) {
            return;
          }

          if (!groupedData[exerciseName]) {
            groupedData[exerciseName] = [];
          }
          groupedData[exerciseName].push({
            x: new Date(performanceData.unixtime),
            y: parseFloat(performanceData.estimated1RM)
          });
        });

        if (Object.keys(groupedData).length === 0) {
          alert("No data found for the selected exercise.");
          return;
        }

        for (let exercise in groupedData) {
          groupedData[exercise].sort(function(a, b) {
            return a.x - b.x;
          });
          smoothedGroupedData[exercise] = dynamicSmoothing(groupedData[exercise], sigma, windowSize);
        }

        createOrUpdateChart(groupedData, smoothedGroupedData, selectedExerciseText);

      } else {
        // Single exercise mode: use the Firebase key for filtering
        var chartData = [];

        snapshot.forEach(function(childSnapshot) {
          var performanceData = childSnapshot.val();
          if (performanceData.exercise === selectedExerciseKey) {
            var li = document.createElement("li");
            li.style.display = "flex";

            var deleteButton = document.createElement("button");
            deleteButton.textContent = "-";
            deleteButton.style.marginRight = "10px";
            deleteButton.style.height = "20px";
            deleteButton.style.width = "20px";
            deleteButton.style.display = "flex";
            deleteButton.style.alignItems = "center";
            deleteButton.style.justifyContent = "center";
            deleteButton.style.padding = "0";
            deleteButton.addEventListener("click", function() {
              deletePerformance(childSnapshot.key);
            });
            li.appendChild(deleteButton);

            var span = document.createElement("span");
            span.textContent = `${performanceData.name}, Reps: ${performanceData.reps},  Weight: ${performanceData.weight} kg,  1RM: ${performanceData.estimated1RM.toFixed(2)}, ${performanceData.timestamp}`;
            li.appendChild(span);
            performanceList.appendChild(li);

            chartData.push({
              x: new Date(performanceData.unixtime),
              y: parseFloat(performanceData.estimated1RM)
            });
          }
        });

        if (chartData.length === 0) {
          alert("No data found for the selected exercise.");
          return;
        }

        chartData.sort(function(a, b) {
          return a.x - b.x;
        });
        let combinedSmoothedData = dynamicSmoothing(chartData, sigma, windowSize);

        createOrUpdateChart(chartData, combinedSmoothedData, selectedExerciseText);
      }
    }).catch(function(error) {
      console.error("Error fetching performance data:", error);
    });
  
  }).catch(function(error) {
    console.error("Error fetching exercises:", error);
  });

  document.getElementById('toggleButton').classList.remove('hidden');
}



// Function to create or update the chart using Chart.js
function createOrUpdateChart(chartData, smoothedData, exerciseLabel) {
  var ctx = document.getElementById('progress-chart').getContext('2d');

  if (window.performanceChart) {
    window.performanceChart.destroy();
  }

  let datasets = [];

  if (exerciseLabel.trim().toLowerCase() === "all exercises") {
    const colors = [
      '#FF6F61', // Coral
      '#2C9AB7', // Lavender
      '#88974b', // Olive Green
      '#F7B7A3', // Peach
      '#e60073', // purp
      '#6B5B95', // Sky Blue
      '#9dbf9d', // Cool Grey
      '#D5C6E0'  // Light Lilac
    ];
    
    let colorIndex = 0;
    for (let exercise in chartData) {
      let color = colors[colorIndex % colors.length];
      datasets.push({
        label: exercise, // Only the exercise name
        data: chartData[exercise],
        borderColor: color,
        pointBackgroundColor: color,
        pointRadius: 3,
        fill: false,
        tension: 0.3,
        cubicInterpolationMode: 'monotone',
        showLine: false
      });
      datasets.push({
        label: '', // No label for trendline
        data: smoothedData[exercise],
        borderColor: color,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        cubicInterpolationMode: 'monotone',
        // Do NOT set hidden: true here, as we want the trendline visible on the graph
      });
      colorIndex++;
    }
  } else {
    datasets = [{
      label: exerciseLabel, // Just the exercise name
      data: chartData,
      borderColor: 'blue',
      pointBackgroundColor: 'black',
      pointRadius: 3,
      fill: false,
      tension: 0.3,
      cubicInterpolationMode: 'monotone',
      showLine: false
    }, {
      label: '', // No label for trendline
      data: smoothedData,
      borderColor: 'red',
      pointRadius: 0,
      fill: false,
      tension: 0.3,
      cubicInterpolationMode: 'monotone',
      // Again, no hidden: true here to ensure trendline remains on the graph
    }];
  }


  
  window.performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      responsive: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'week',
            displayFormats: {
              day: 'dd MMM'
            }
          },
          min: '2025-04-06',
          max: new Date(new Date('2025-04-09').setMonth(new Date('2025-04-09').getMonth() + 1)).toISOString().split('T')[0],
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
        legend: {
          labels: {
            filter: function(legendItem, chartData) {
              // Exclude trendline datasets from the legend
              return legendItem.datasetIndex % 2 === 0; // Only show the exercise datasets (not trendlines)
            }
          }
        },
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


document.getElementById('toggleButton').addEventListener('click', function() {
  var performanceList = document.getElementById('performanceList');
  // Show the performance list
  performanceList.classList.remove('hidden');
  // Hide the button
  this.style.display = 'none';
});




function handleRecordMaxEffort() {
  // Step 1: Save the performance data
  sendPerformanceData();

  // Step 2: Set the dropdown to "All exercises" (by label)
  const dropdown = document.getElementById("ORMexerciseInput");
  if (!dropdown) return;

  let found = false;
  for (let option of dropdown.options) {
    if (option.textContent.trim().toLowerCase() === "all exercises") {
      dropdown.value = option.value; // Match the internal value that corresponds to the label
      found = true;
      break;
    }
  }

  if (!found) {
    console.warn("⚠️ Could not find an option labeled 'All exercises' in the dropdown.");
    return;
  }

  // Step 3: Defer generateChart() to allow the DOM/UI to reflect the new dropdown state
  setTimeout(() => {
    generateChart();
  }, 0);
}

