// Firebase configuration for the backup app
const firebaseConfigBackup = {
    apiKey: "AIzaSyBHTxBczxMfGACF3-5T8nUpdBZwGAwxTbM",
    authDomain: "backup-ca1df.firebaseapp.com",
    databaseURL: "https://backup-ca1df-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "backup-ca1df",
    storageBucket: "backup-ca1df.firebasestorage.app",
    messagingSenderId: "774891748464",
    appId: "1:774891748464:web:d82af98ceed9224ecb48b5"
  };
  
  // Initialize Firebase for the backup app with a unique name
  const backupApp = firebase.initializeApp(firebaseConfigBackup, "backup");
  
  // Get references to Firebase services for the backup app
  const backupDatabase = backupApp.database();
  const backupAuth = backupApp.auth(); // For authentication service
  
  // Event listener for the document
  document.addEventListener('DOMContentLoaded', () => {
    const backupBtn = document.getElementById('backupbtn');
    const passwordPrompt = document.getElementById('passwordPrompt');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('error');
    const submitPasswordBtn = document.getElementById('submitPassword');
    const signOutBtn = document.getElementById('signOutBtn'); // Button to trigger sign out
  
    // Listen for the backup button click
    backupBtn.addEventListener('click', () => {
      passwordPrompt.style.display = 'block'; // Show the password prompt
    });
  
    submitPasswordBtn.addEventListener('click', () => {
      const enteredPassword = passwordInput.value; // Get the entered password
  
      // Validate the password against the stored password before authenticating
      validatePassword(enteredPassword);
    });
  

  
    // Function to check the current authentication state
    function checkAuthState() {
      const user = backupAuth.currentUser;
      if (user) {
        console.log("User is signed in with UID:", user.uid);  // Log user info if signed in
      } else {
        console.log("User is signed out.");
      }
    }
  

  
    // Validate the entered password by checking it against the Firebase database
    function validatePassword(enteredPassword) {
      const passwordRef = backupDatabase.ref('backup_password'); // Reference to the password node in the backup database
  
      passwordRef.once('value')
        .then((snapshot) => {
          const storedPassword = snapshot.val(); // Get the stored password
  
          if (storedPassword && enteredPassword === storedPassword) {
            console.log('Password matched. Proceeding with authentication...');
  
            // Authenticate the user anonymously after successful password validation
            backupAuth.signInAnonymously()
              .then(() => {
                            console.log("User authenticated anonymously.");
                checkAuthState();
                // Proceed with backup or other tasks
                triggerBackup();
                passwordPrompt.style.display = 'none';
                errorDiv.textContent = '';
              })
              .catch((error) => {
                console.error("Authentication failed: ", error);
                errorDiv.textContent = 'Authentication failed. Please try again.';
              });
          } else {
            // If the password is incorrect
            errorDiv.textContent = 'Incorrect password. Please try again.';
          }
        })
        .catch((error) => {
          console.error('Error validating password:', error);
          errorDiv.textContent = 'Error validating password, please try again.';
        });
    }
  
    // Function to trigger the backup (copy data from main database to backup)
    function triggerBackup() {
      const mainDatabaseRef = firebase.database().ref('workouts');  // Reference to the main app's database
      const backupDatabaseRef = backupDatabase.ref('workouts');     // Reference to the backup app's database
  
      mainDatabaseRef.once('value')
        .then((snapshot) => {
          const data = snapshot.val();  // Get data from the main database
          if (data) {
            backupDatabaseRef.set(data)  // Set the data in the backup database
              .then(() => {
                console.log('Backup triggered successfully!');
              })
              .catch((error) => {
                console.error('Error during backup operation:', error);
              });
          } else {
            console.log('No data to back up');
          }
        })
        .catch((error) => {
          console.error('Error reading main database:', error);
        });
    }
  
    // Call checkAuthState when the page loads to see if the user is signed in already
    checkAuthState();
  
  });
  