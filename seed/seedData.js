// Inbuilt Default Workout Plans (Plan 1: PPL Cycle A & Plan 2: PPL Cycle B)

const IMAGE_MAP = {
  'Deadlift': 'Deadlift.jpeg',
  'Lat Pulldown': 'Lat Pulldown.jpg',
  'Seated Cable Row': 'Seated Cable Row.jpg',
  'Standing Dumbbell Curl': 'Standing Dumbbell Curl.jpeg',
  'Standing Hammer Curl': 'Standing Hammer Curl.jpg',
  'Face Pull': 'Face Pull.jpg',
  'Barbell Shrugs': 'Barbell Shrugs.jpeg',
  'Wrist Curl': 'Wrist Curl.jpeg',
  'Reverse Wrist Curl': 'Reverse Wrist Curl.webp',
  'Bench Press': 'Bench Press.jpeg',
  'Incline Dumbbell Press': 'Incline Dumbbell Press.jpg',
  'Parallel Bar Dips': 'Parallel Bar Dips.jpg',
  'Incline Bench Cable Fly': 'Incline Cable Fly.jpg',
  'Standing Incline Dumbbell Shoulder Press': 'Standing Dumbbell Shoulder Press.jpg',
  'Dumbbell Lateral Raise': 'Dumbbell Lateral Raise.jpg',
  'Rope Pushdown': 'Rope Pushdown.jpeg',
  'Overhead Rope Extension': 'Reverse Pushdown.jpg',
  'Barbell Squat': 'Squat.jpg',
  'Leg Press': 'Angled Leg Press.jpg',
  'Leg Extension': 'Leg Extension.jpg',
  'Stiff-Legged Deadlift': 'Stiff-legged Deadlift.jpeg',
  'Standing Barbell Calf Raise': 'Standing Barbell Calf Raise.jpg',
  'Cable Crunch': 'Cable Crunch.jpg',
  'Hanging Knee Raise': 'Hanging Knee Raise.jpeg',

  // Plan 2 Exercises
  'Pull-Up': 'Pull-up.jpg',
  'Single-Arm Cable Lat Pulldown': 'Lat Pulldown.jpg',
  'One-Arm Dumbbell Row': 'One-arm Dumbbell Row.jpeg',
  'Incline Dumbbell Curl': 'Incline Dumbbell Curl.jpeg',
  'Barbell Preacher Curl': 'Preacher Curl.jpeg',
  'Bent Over Lateral Raise': 'Bent Over Lateral Raise.jpeg',
  'Dumbbell Shrugs': 'Dumbbell Shrugs.jpg.jpg',
  'Dumbbell Press': 'Dumbbell Press.jpg',
  'Incline Press (Machine/Barbell)': 'Incline Press Machine.webp',
  'Standing Decline Cable Fly': 'Decline Cable Fly.jpeg',
  'Single-Arm Cable Lateral Raise': 'Single Arm Cable Lateral Raise.gif',
  'Seated EZ Bar Triceps Extension': 'Seated EZ Bar Triceps Extension.jpeg',
  'Pushdown': 'Reverse Pushdown.jpg',
  'Sumo Squat': 'Sumo Squat.jpeg',
  'Angled Leg Press': 'Angled Leg Press.jpg',
  'Ab Wheel Rollout': 'Barbell Rollout.jpg',
  'Roman Chair Leg Raise': 'Roman Chair Leg Raise.jpeg',
};

const BASE_URL = process.env.PUBLIC_API_URL || 'https://gym-tracker-backend-qpu8.onrender.com';

const getExerciseImageUrl = (name) => {
  const filename = IMAGE_MAP[name];
  if (!filename) return '';
  return `${BASE_URL}/exercise-images/${encodeURIComponent(filename)}`;
};

const workoutDays = [
  // ==================== PLAN 1 ====================
  {
    dayNumber: 1,
    name: 'Plan 1 · Day 1 – Pull A',
    planName: 'Plan 1',
    isRestDay: false,
    exercises: [
      { category: 'Back', name: 'Deadlift', sets: 3, repsRange: '5-8' },
      { category: 'Back', name: 'Lat Pulldown', sets: 3, repsRange: '8-12' },
      { category: 'Back', name: 'Seated Cable Row', sets: 3, repsRange: '8-12' },
      { category: 'Biceps', name: 'Standing Dumbbell Curl', sets: 3, repsRange: '8-12' },
      { category: 'Biceps', name: 'Standing Hammer Curl', sets: 3, repsRange: '10-12' },
      { category: 'Rear Delts', name: 'Face Pull', sets: 3, repsRange: '12-15' },
      { category: 'Traps', name: 'Barbell Shrugs', sets: 3, repsRange: '10-15' },
      { category: 'Forearms', name: 'Wrist Curl', sets: 2, repsRange: '12-15' },
      { category: 'Forearms', name: 'Reverse Wrist Curl', sets: 2, repsRange: '12-15' },
    ],
  },
  {
    dayNumber: 2,
    name: 'Plan 1 · Day 2 – Push A',
    planName: 'Plan 1',
    isRestDay: false,
    exercises: [
      { category: 'Chest', name: 'Bench Press', sets: 3, repsRange: '6-10' },
      { category: 'Chest', name: 'Incline Dumbbell Press', sets: 3, repsRange: '8-12' },
      { category: 'Chest', name: 'Parallel Bar Dips', sets: 3, repsRange: '8-12' },
      { category: 'Chest', name: 'Incline Bench Cable Fly', sets: 2, repsRange: '12-15' },
      { category: 'Shoulders', name: 'Standing Incline Dumbbell Shoulder Press', sets: 3, repsRange: '8-12' },
      { category: 'Shoulders', name: 'Dumbbell Lateral Raise', sets: 3, repsRange: '12-15' },
      { category: 'Triceps', name: 'Rope Pushdown', sets: 3, repsRange: '10-15' },
      { category: 'Triceps', name: 'Overhead Rope Extension', sets: 3, repsRange: '10-15' },
    ],
  },
  {
    dayNumber: 3,
    name: 'Plan 1 · Day 3 – Legs A',
    planName: 'Plan 1',
    isRestDay: false,
    exercises: [
      { category: 'Quads', name: 'Barbell Squat', sets: 4, repsRange: '6-10' },
      { category: 'Quads', name: 'Leg Press', sets: 3, repsRange: '10-12' },
      { category: 'Quads', name: 'Leg Extension', sets: 3, repsRange: '12-15' },
      { category: 'Hamstrings', name: 'Stiff-Legged Deadlift', sets: 3, repsRange: '8-12' },
      { category: 'Calves', name: 'Standing Barbell Calf Raise', sets: 4, repsRange: '12-15' },
      { category: 'Abs', name: 'Cable Crunch', sets: 3, repsRange: '12-15' },
      { category: 'Abs', name: 'Hanging Knee Raise', sets: 3, repsRange: '12-15' },
    ],
  },

  // ==================== PLAN 2 ====================
  {
    dayNumber: 4,
    name: 'Plan 2 · Day 1 – Pull B',
    planName: 'Plan 2',
    isRestDay: false,
    exercises: [
      { category: 'Back', name: 'Deadlift', sets: 3, repsRange: '5-8' },
      { category: 'Back', name: 'Pull-Up', sets: 3, repsRange: '6-10' },
      { category: 'Back', name: 'Single-Arm Cable Lat Pulldown', sets: 3, repsRange: '8-12' },
      { category: 'Back', name: 'One-Arm Dumbbell Row', sets: 3, repsRange: '8-12' },
      { category: 'Biceps', name: 'Incline Dumbbell Curl', sets: 3, repsRange: '8-12' },
      { category: 'Biceps', name: 'Barbell Preacher Curl', sets: 3, repsRange: '10-12' },
      { category: 'Rear Delts', name: 'Bent Over Lateral Raise', sets: 3, repsRange: '12-15' },
      { category: 'Traps', name: 'Dumbbell Shrugs', sets: 3, repsRange: '10-15' },
      { category: 'Forearms', name: 'Wrist Curl', sets: 2, repsRange: '12-15' },
      { category: 'Forearms', name: 'Reverse Wrist Curl', sets: 2, repsRange: '12-15' },
    ],
  },
  {
    dayNumber: 5,
    name: 'Plan 2 · Day 2 – Push B',
    planName: 'Plan 2',
    isRestDay: false,
    exercises: [
      { category: 'Chest', name: 'Dumbbell Press', sets: 3, repsRange: '8-12' },
      { category: 'Chest', name: 'Incline Press (Machine/Barbell)', sets: 3, repsRange: '8-12' },
      { category: 'Chest', name: 'Standing Decline Cable Fly', sets: 3, repsRange: '12-15' },
      { category: 'Chest', name: 'Parallel Bar Dips', sets: 2, repsRange: '8-12' },
      { category: 'Shoulders', name: 'Standing Incline Dumbbell Shoulder Press', sets: 3, repsRange: '8-12' },
      { category: 'Shoulders', name: 'Single-Arm Cable Lateral Raise', sets: 3, repsRange: '12-15' },
      { category: 'Triceps', name: 'Seated EZ Bar Triceps Extension', sets: 3, repsRange: '10-12' },
      { category: 'Triceps', name: 'Pushdown', sets: 3, repsRange: '10-15' },
    ],
  },
  {
    dayNumber: 6,
    name: 'Plan 2 · Day 3 – Legs B',
    planName: 'Plan 2',
    isRestDay: false,
    exercises: [
      { category: 'Quads', name: 'Sumo Squat', sets: 4, repsRange: '8-10' },
      { category: 'Quads', name: 'Angled Leg Press', sets: 3, repsRange: '10-12' },
      { category: 'Quads', name: 'Leg Extension', sets: 3, repsRange: '12-15' },
      { category: 'Hamstrings', name: 'Stiff-Legged Deadlift', sets: 3, repsRange: '8-12' },
      { category: 'Calves', name: 'Standing Barbell Calf Raise', sets: 4, repsRange: '12-15' },
      { category: 'Abs', name: 'Ab Wheel Rollout', sets: 3, repsRange: '10-15' },
      { category: 'Abs', name: 'Roman Chair Leg Raise', sets: 3, repsRange: '12-15' },
    ],
  },
];

module.exports = { workoutDays, getExerciseImageUrl };
