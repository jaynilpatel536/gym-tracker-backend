// Default 7-Day Workout Routines (Plan 1 & Plan 2)

const IMAGE_MAP = {
  'Deadlift': 'Deadlift.jpeg',
  'Pull-up': 'Pull-up.jpg',
  'Lat Pulldown': 'Lat Pulldown.jpg',
  'Seated Cable Row': 'Seated Cable Row.jpg',
  'One-arm Dumbbell Row': 'One-arm Dumbbell Row.jpeg',
  'Straight-arm Lat Pulldown': 'Straight-arm Lat Pulldown.jpg',
  'Bent Over Lateral Raise': 'Bent Over Lateral Raise.jpeg',
  'Standing Dumbbell Curl': 'Standing Dumbbell Curl.jpeg',
  'Standing Hammer Curl': 'Standing Hammer Curl.jpg',
  'Wrist Curl': 'Wrist Curl.jpeg',
  'Reverse Wrist Curl': 'Reverse Wrist Curl.webp',
  'Incline Dumbbell Press': 'Incline Dumbbell Press.jpg',
  'Bench Press': 'Bench Press.jpeg',
  'Incline Cable Fly': 'Incline Cable Fly.jpg',
  'Decline Cable Fly': 'Decline Cable Fly.jpeg',
  'Dumbbell Lateral Raise': 'Dumbbell Lateral Raise.jpg',
  'Standing Dumbbell Shoulder Press': 'Standing Dumbbell Shoulder Press.jpg',
  'Face Pull': 'Face Pull.jpg',
  'Barbell Shrugs': 'Barbell Shrugs.jpeg',
  'Rope Pushdown': 'Rope Pushdown.jpeg',
  'Seated EZ Bar Extension': 'Seated EZ Bar Triceps Extension.jpeg',
  'Seated EZ Bar Triceps Extension': 'Seated EZ Bar Triceps Extension.jpeg',
  'Bench Dips': 'Bench Dips.jpg',
  'Squat': 'Squat.jpg',
  'Angled Leg Press': 'Angled Leg Press.jpg',
  'Leg Extension': 'Leg Extension.jpg',
  'Stiff-legged Deadlift': 'Stiff-legged Deadlift.jpeg',
  'Standing Calf Raise': 'Standing Barbell Calf Raise.jpg',
  'Hanging Knee Raise': 'Hanging Knee Raise.jpeg',
  'Cable Crunch': 'Cable Crunch.jpg',
  'Hanging Knee Oblique Raise': 'Hanging Knee Oblique Raise.jpg',
  'Barbell Rollout': 'Barbell Rollout.jpg',
  'Chin-up': 'Chin-up.jpg',
  'V-Bar Lat Pulldown': 'V-Bar Lat Pulldown.jpeg',
  'Bent Over Row': 'Bent Over Row.jpg',
  'Incline Dumbbell Curl': 'Incline Dumbbell Curl.jpeg',
  'Preacher Curl': 'Preacher Curl.jpeg',
  'Incline Press Machine': 'Incline Press Machine.webp',
  'Dumbbell Press': 'Dumbbell Press.jpg',
  'Dumbbell Fly': 'Dumbbell Fly.jpeg',
  'Decline bench press': 'Decline bench press.jpg',
  'Parallel Bar Dips': 'Parallel Bar Dips.jpg',
  'Single Arm Cable Lateral Raise': 'Single Arm Cable Lateral Raise.gif',
  'Dumbbell Shrugs': 'Dumbbell Shrugs.jpg.jpg',
  'Reverse Pushdown': 'Reverse Pushdown.jpg',
  'One-arm Reverse Pushdown': 'One-arm Reverse Pushdown.jpeg',
  'Sumo Squat': 'Sumo Squat.jpeg',
  'Romanian Deadlift': 'Romanian Deadlift.webp',
  'Walking Lunges': 'Walking Lunges.jpeg',
  'Seated Leg Curl': 'Seated Leg Curl.jpeg',
  'Seated Calf Raise': 'Seated Calf Raise.jpg',
  'Roman Chair Leg Raise': 'Roman Chair Leg Raise.jpeg',
  'Bicycle Crunch': 'Bicycle Crunch.jpeg',
  'Russian Twist': 'Russian Twist.jpg',
  'Plank': 'Plank.jpeg',
};

const BASE_URL = process.env.PUBLIC_API_URL || 'https://gym-tracker-backend-qpu8.onrender.com';

const getExerciseImageUrl = (name) => {
  const filename = IMAGE_MAP[name];
  if (!filename) return '';
  return `${BASE_URL}/exercise-images/${encodeURIComponent(filename)}`;
};

// Plan 1 Routine (Day 1-3 repeated for Day 4-6)
const plan1Pull = [
  { category: 'Back', name: 'Deadlift', sets: 3, repsRange: '5-8' },
  { category: 'Back', name: 'Lat Pulldown', sets: 3, repsRange: '8-12' },
  { category: 'Back', name: 'Seated Cable Row', sets: 3, repsRange: '8-12' },
  { category: 'Rear Delts', name: 'Face Pull', sets: 3, repsRange: '12-15' },
  { category: 'Traps', name: 'Barbell Shrugs', sets: 3, repsRange: '10-15' },
  { category: 'Biceps', name: 'Standing Dumbbell Curl', sets: 3, repsRange: '8-12' },
  { category: 'Biceps', name: 'Standing Hammer Curl', sets: 3, repsRange: '10-12' },
  { category: 'Forearms', name: 'Wrist Curl', sets: 2, repsRange: '12-15' },
  { category: 'Forearms', name: 'Reverse Wrist Curl', sets: 2, repsRange: '12-15' },
];

const plan1Push = [
  { category: 'Chest', name: 'Incline Dumbbell Press', sets: 3, repsRange: '8-12' },
  { category: 'Chest', name: 'Bench Press', sets: 3, repsRange: '6-10' },
  { category: 'Chest', name: 'Decline Cable Fly', sets: 2, repsRange: '12-15' },
  { category: 'Chest', name: 'Parallel Bar Dips', sets: 3, repsRange: '8-12' },
  { category: 'Shoulders', name: 'Standing Dumbbell Shoulder Press', sets: 3, repsRange: '8-12' },
  { category: 'Shoulders', name: 'Dumbbell Lateral Raise', sets: 3, repsRange: '12-15' },
  { category: 'Triceps', name: 'Rope Pushdown', sets: 3, repsRange: '10-15' },
  { category: 'Triceps', name: 'Seated EZ Bar Extension', sets: 3, repsRange: '10-15' },
];

const plan1Legs = [
  { category: 'Quads', name: 'Squat', sets: 4, repsRange: '6-10' },
  { category: 'Quads', name: 'Angled Leg Press', sets: 3, repsRange: '10-12' },
  { category: 'Quads', name: 'Leg Extension', sets: 3, repsRange: '12-15' },
  { category: 'Hamstrings', name: 'Stiff-legged Deadlift', sets: 3, repsRange: '8-12' },
  { category: 'Calves', name: 'Standing Calf Raise', sets: 4, repsRange: '12-15' },
  { category: 'Abs', name: 'Cable Crunch', sets: 3, repsRange: '12-15' },
  { category: 'Abs', name: 'Hanging Knee Raise', sets: 3, repsRange: '12-15' },
];

const restDayObj = {
  isRestDay: true,
  exercises: [],
  recoveryTips: [
    'Complete Rest',
    '20-30 min Walking (Optional)',
    '10-15 min Stretching',
    'Hydration',
    'Dermaroller (Evening)',
  ],
  stretchingSuggestions: [
    'Full-body static stretching, 10-15 minutes.',
    'Foam roll major muscle groups worked earlier in the week.',
  ],
  hydrationReminder: 'Drink water consistently through the day, even on rest days.',
};

const workoutDaysPlan1 = [
  { dayNumber: 1, name: 'Day 1 – Pull', isRestDay: false, exercises: plan1Pull },
  { dayNumber: 2, name: 'Day 2 – Push', isRestDay: false, exercises: plan1Push },
  { dayNumber: 3, name: 'Day 3 – Legs', isRestDay: false, exercises: plan1Legs },
  { dayNumber: 4, name: 'Day 4 – Pull', isRestDay: false, exercises: plan1Pull },
  { dayNumber: 5, name: 'Day 5 – Push', isRestDay: false, exercises: plan1Push },
  { dayNumber: 6, name: 'Day 6 – Legs', isRestDay: false, exercises: plan1Legs },
  { dayNumber: 7, name: 'Day 7 – Rest Day', ...restDayObj },
];

// Plan 2 Routine (Day 1-3 repeated for Day 4-6)
const plan2Pull = [
  { category: 'Back', name: 'Deadlift', sets: 3, repsRange: '5-8' },
  { category: 'Back', name: 'Pull-up', sets: 3, repsRange: '6-10' },
  { category: 'Back', name: 'Lat Pulldown', sets: 3, repsRange: '8-12' },
  { category: 'Back', name: 'One-arm Dumbbell Row', sets: 3, repsRange: '8-12' },
  { category: 'Rear Delts', name: 'Bent Over Lateral Raise', sets: 3, repsRange: '12-15' },
  { category: 'Traps', name: 'Barbell Shrugs', sets: 3, repsRange: '10-15' },
  { category: 'Biceps', name: 'Incline Dumbbell Curl', sets: 3, repsRange: '8-12' },
  { category: 'Biceps', name: 'Preacher Curl', sets: 3, repsRange: '10-12' },
  { category: 'Forearms', name: 'Wrist Curl', sets: 2, repsRange: '12-15' },
  { category: 'Forearms', name: 'Reverse Wrist Curl', sets: 2, repsRange: '12-15' },
];

const plan2Push = [
  { category: 'Chest', name: 'Dumbbell Press', sets: 3, repsRange: '8-12' },
  { category: 'Chest', name: 'Incline Press Machine', sets: 3, repsRange: '8-12' },
  { category: 'Chest', name: 'Decline Cable Fly', sets: 3, repsRange: '12-15' },
  { category: 'Chest', name: 'Parallel Bar Dips', sets: 2, repsRange: '8-12' },
  { category: 'Shoulders', name: 'Standing Dumbbell Shoulder Press', sets: 3, repsRange: '8-12' },
  { category: 'Shoulders', name: 'Single Arm Cable Lateral Raise', sets: 3, repsRange: '12-15' },
  { category: 'Triceps', name: 'Seated EZ Bar Triceps Extension', sets: 3, repsRange: '10-12' },
  { category: 'Triceps', name: 'Reverse Pushdown', sets: 3, repsRange: '10-15' },
];

const plan2Legs = [
  { category: 'Quads', name: 'Sumo Squat', sets: 4, repsRange: '8-10' },
  { category: 'Quads', name: 'Angled Leg Press', sets: 3, repsRange: '10-12' },
  { category: 'Quads', name: 'Leg Extension', sets: 3, repsRange: '12-15' },
  { category: 'Hamstrings', name: 'Stiff-legged Deadlift', sets: 3, repsRange: '8-12' },
  { category: 'Calves', name: 'Standing Calf Raise', sets: 4, repsRange: '12-15' },
  { category: 'Abs', name: 'Barbell Rollout', sets: 3, repsRange: '10-15' },
  { category: 'Abs', name: 'Roman Chair Leg Raise', sets: 3, repsRange: '12-15' },
];

const workoutDaysPlan2 = [
  { dayNumber: 1, name: 'Day 1 – Pull', isRestDay: false, exercises: plan2Pull },
  { dayNumber: 2, name: 'Day 2 – Push', isRestDay: false, exercises: plan2Push },
  { dayNumber: 3, name: 'Day 3 – Legs', isRestDay: false, exercises: plan2Legs },
  { dayNumber: 4, name: 'Day 4 – Pull', isRestDay: false, exercises: plan2Pull },
  { dayNumber: 5, name: 'Day 5 – Push', isRestDay: false, exercises: plan2Push },
  { dayNumber: 6, name: 'Day 6 – Legs', isRestDay: false, exercises: plan2Legs },
  { dayNumber: 7, name: 'Day 7 – Rest Day', ...restDayObj },
];

module.exports = { workoutDaysPlan1, workoutDaysPlan2, getExerciseImageUrl };
