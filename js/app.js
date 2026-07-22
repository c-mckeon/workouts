import { initClock } from './clock.js';
import { initExerciseManagement } from './exerciseManager.js';
import { initEditorManager, refreshSavedWorkouts } from './editorManager.js';

async function initPage() {
  initClock();
  initEditorManager();
  await initExerciseManagement({ onWorkoutSaved: refreshSavedWorkouts });

  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const addExerciseSection = document.getElementById('addExerciseSection');
  const workoutEditorBtn = document.getElementById('showeditorbtn');
  const exoEditorBtn = document.getElementById('showexoeditorbtn');
  const workoutEditorSection = document.getElementById('editorsection');
  const exerciseEditorSection = document.getElementById('exerciseeditor');

  toggleFormBtn.addEventListener('click', () => {
    addExerciseSection.classList.toggle('hidden');
    toggleFormBtn.textContent = addExerciseSection.classList.contains('hidden') ? 'Add and Edit' : 'Hide';

    if (addExerciseSection.classList.contains('hidden')) {
      workoutEditorBtn.classList.add('hidden');
      exoEditorBtn.classList.add('hidden');
      workoutEditorSection.classList.add('hidden');
      exerciseEditorSection.classList.add('hidden');
      workoutEditorBtn.textContent = 'Workout Editor';
      exoEditorBtn.textContent = 'Exercise Editor';
    } else {
      workoutEditorBtn.classList.remove('hidden');
      exoEditorBtn.classList.remove('hidden');
    }
  });

  workoutEditorBtn.addEventListener('click', () => {
    workoutEditorSection.classList.toggle('hidden');
    exerciseEditorSection.classList.add('hidden');
    workoutEditorBtn.textContent = workoutEditorSection.classList.contains('hidden') ? 'Workout Editor' : 'Hide Workout Editor';
    exoEditorBtn.textContent = 'Exercise Editor';
  });

  exoEditorBtn.addEventListener('click', () => {
    exerciseEditorSection.classList.toggle('hidden');
    workoutEditorSection.classList.add('hidden');
    exoEditorBtn.textContent = exerciseEditorSection.classList.contains('hidden') ? 'Exercise Editor' : 'Hide Exercise Editor';
    workoutEditorBtn.textContent = 'Workout Editor';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
