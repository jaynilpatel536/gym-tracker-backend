/**
 * seedMissingExercises.js
 * Uploads missing exercise images to Cloudinary and inserts
 * them into the ExerciseTemplate collection.
 *
 * Run: node seedMissingExercises.js
 */

const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const ExerciseTemplate = require('./models/ExerciseTemplate');
const { uploadToCloudinary } = require('./config/cloudinary');

const EXERCISE_DIR = path.join(__dirname, 'exercise');

// ─── Exercise definitions (name must match the filename exactly minus extension) ─
const MISSING_EXERCISES = [
  // CHEST
  {
    name: 'Decline Bench Press',
    file: 'Decline bench press.jpg',
    category: 'Push',
    muscleGroup: 'Chest',
    secondaryMuscleGroup: 'Triceps',
    sets: 3, repsRange: '8-12', defaultRestSeconds: 90,
    notes: 'Lower portion of chest activation. Keep shoulders retracted throughout.',
  },
  {
    name: 'Dumbbell Fly',
    file: 'Dumbbell Fly.jpeg',
    category: 'Push',
    muscleGroup: 'Chest',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '10-15', defaultRestSeconds: 60,
    notes: 'Keep slight bend in elbows throughout. Stretch at bottom, squeeze at top.',
  },
  {
    name: 'Incline Cable Fly',
    file: 'Incline Cable Fly.jpg',
    category: 'Push',
    muscleGroup: 'Chest',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Upper chest isolation. Set cables low, bring them up and together.',
  },

  // BACK
  {
    name: 'Bent Over Row',
    file: 'Bent Over Row.jpg',
    category: 'Pull',
    muscleGroup: 'Back',
    secondaryMuscleGroup: 'Biceps',
    sets: 4, repsRange: '8-12', defaultRestSeconds: 90,
    notes: 'Keep back flat and hinged at 45°. Row to lower chest/upper abdomen.',
  },
  {
    name: 'Chin-up',
    file: 'Chin-up.jpg',
    category: 'Pull',
    muscleGroup: 'Back',
    secondaryMuscleGroup: 'Biceps',
    sets: 3, repsRange: '6-10', defaultRestSeconds: 90,
    notes: 'Underhand grip. Focus on pulling elbows down to engage lats fully.',
  },
  {
    name: 'Straight-arm Lat Pulldown',
    file: 'Straight-arm Lat Pulldown.jpg',
    category: 'Pull',
    muscleGroup: 'Back',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Keep arms straight throughout. Great lat isolation movement.',
  },
  {
    name: 'V-Bar Lat Pulldown',
    file: 'V-Bar Lat Pulldown.jpeg',
    category: 'Pull',
    muscleGroup: 'Back',
    secondaryMuscleGroup: 'Biceps',
    sets: 3, repsRange: '10-12', defaultRestSeconds: 75,
    notes: 'Neutral grip attachment. Targets mid-lats and lower lats.',
  },
  {
    name: 'Single-Arm Cable Lat Pulldown',
    file: 'Single-Arm Cable Lat Pulldown.jpeg',
    category: 'Pull',
    muscleGroup: 'Back',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '10-12', defaultRestSeconds: 60,
    notes: 'Allows greater range of motion and corrects left-right imbalances.',
  },

  // SHOULDERS
  {
    name: 'Cable Upright Row',
    file: 'Cable Upright Row.jpg',
    category: 'Push',
    muscleGroup: 'Shoulders',
    secondaryMuscleGroup: 'Traps',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Use wide grip to reduce impingement risk. Lead with elbows.',
  },

  // TRICEPS
  {
    name: 'Bench Dips',
    file: 'Bench Dips.jpg',
    category: 'Push',
    muscleGroup: 'Triceps',
    secondaryMuscleGroup: 'Chest',
    sets: 3, repsRange: '10-15', defaultRestSeconds: 60,
    notes: 'Keep hips close to bench. Add weight on lap for extra resistance.',
  },
  {
    name: 'One-arm Reverse Pushdown',
    file: 'One-arm Reverse Pushdown.jpeg',
    category: 'Push',
    muscleGroup: 'Triceps',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Underhand grip. Corrects imbalances and hits lateral head of triceps.',
  },
  {
    name: 'Overhead Rope Extension',
    file: 'Overhead Rope Extension.jpeg',
    category: 'Push',
    muscleGroup: 'Triceps',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '10-15', defaultRestSeconds: 60,
    notes: 'Targets long head of triceps. Face away from cable machine.',
  },

  // LEGS / QUADS
  {
    name: 'Walking Lunges',
    file: 'Walking Lunges.jpeg',
    category: 'Legs',
    muscleGroup: 'Quads',
    secondaryMuscleGroup: 'Glutes',
    sets: 3, repsRange: '12-16', defaultRestSeconds: 75,
    notes: 'Step forward into lunge, alternate legs. Keep torso upright.',
  },
  {
    name: 'Romanian Deadlift',
    file: 'Romanian Deadlift.webp',
    category: 'Legs',
    muscleGroup: 'Hamstrings',
    secondaryMuscleGroup: 'Glutes',
    sets: 3, repsRange: '8-12', defaultRestSeconds: 90,
    notes: 'Hinge at hips, keep bar close to body. Feel stretch in hamstrings.',
  },
  {
    name: 'Seated Leg Curl',
    file: 'Seated Leg Curl.jpeg',
    category: 'Legs',
    muscleGroup: 'Hamstrings',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '10-15', defaultRestSeconds: 60,
    notes: 'Seated version provides more constant tension than lying variation.',
  },

  // CALVES
  {
    name: 'Seated Calf Raise',
    file: 'Seated Calf Raise.jpg',
    category: 'Legs',
    muscleGroup: 'Calves',
    secondaryMuscleGroup: '',
    sets: 4, repsRange: '15-20', defaultRestSeconds: 45,
    notes: 'Targets the soleus. Use full range of motion — full stretch to full contraction.',
  },
  {
    name: 'Standing Barbell Calf Raise',
    file: 'Standing Barbell Calf Raise.jpg',
    category: 'Legs',
    muscleGroup: 'Calves',
    secondaryMuscleGroup: '',
    sets: 4, repsRange: '15-20', defaultRestSeconds: 45,
    notes: 'Primarily targets the gastrocnemius. Pause at top and bottom.',
  },

  // TRAPS
  {
    name: 'Dumbbell Shrugs',
    file: 'Dumbbell Shrugs.jpg.jpg',
    category: 'Pull',
    muscleGroup: 'Traps',
    secondaryMuscleGroup: '',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Hold contraction at top for 1 second. Avoid rolling the shoulders.',
  },

  // ABS / CORE
  {
    name: 'Bicycle Crunch',
    file: 'Bicycle Crunch.jpeg',
    category: 'Core',
    muscleGroup: 'Abs',
    secondaryMuscleGroup: 'Obliques',
    sets: 3, repsRange: '20-30', defaultRestSeconds: 45,
    notes: 'Slow and controlled. Rotate torso, not just elbows.',
  },
  {
    name: 'Hanging Knee Oblique Raise',
    file: 'Hanging Knee Oblique Raise.jpg',
    category: 'Core',
    muscleGroup: 'Abs',
    secondaryMuscleGroup: 'Obliques',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Rotate knees to each side for oblique engagement.',
  },
  {
    name: 'Plank',
    file: 'Plank.jpeg',
    category: 'Core',
    muscleGroup: 'Abs',
    secondaryMuscleGroup: 'Core',
    sets: 3, repsRange: '30-60s', defaultRestSeconds: 60,
    notes: 'Keep body in a straight line. Engage glutes and core throughout.',
  },
  {
    name: 'Russian Twist',
    file: 'Russian Twist.jpg',
    category: 'Core',
    muscleGroup: 'Abs',
    secondaryMuscleGroup: 'Obliques',
    sets: 3, repsRange: '20-30', defaultRestSeconds: 45,
    notes: 'Add weight plate for more resistance. Rotate from the torso, not arms.',
  },
  {
    name: 'Hanging Knee Raise with Twist',
    file: 'hanging_knee_raise_with_twist.jpg',
    category: 'Core',
    muscleGroup: 'Abs',
    secondaryMuscleGroup: 'Obliques',
    sets: 3, repsRange: '12-15', defaultRestSeconds: 60,
    notes: 'Targets lower abs and obliques simultaneously.',
  },
];

async function seedExercises() {
  console.log('\n🚀 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected.\n');

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const ex of MISSING_EXERCISES) {
    const filePath = path.join(EXERCISE_DIR, ex.file);

    try {
      // Check if already exists (case-insensitive)
      const exists = await ExerciseTemplate.findOne({
        name: { $regex: new RegExp(`^${ex.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (exists) {
        console.log(`⏭️  SKIP (already exists): ${ex.name}`);
        skipped++;
        continue;
      }

      console.log(`📤 Uploading image for: ${ex.name} ...`);
      const uploadResult = await uploadToCloudinary(filePath, {
        type: 'images',
        publicId: `exercise_${ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      });

      const newExercise = new ExerciseTemplate({
        name: ex.name,
        category: ex.category,
        muscleGroup: ex.muscleGroup,
        secondaryMuscleGroup: ex.secondaryMuscleGroup || '',
        targetMuscle: ex.muscleGroup,
        imageUrl: uploadResult.secure_url,
        imagePublicId: uploadResult.public_id,
        notes: ex.notes || '',
        sets: ex.sets || 3,
        repsRange: ex.repsRange || '8-12',
        defaultRestSeconds: ex.defaultRestSeconds || 90,
      });

      await newExercise.save();
      console.log(`✅ ADDED: ${ex.name} → ${uploadResult.secure_url}`);
      added++;

    } catch (err) {
      console.error(`❌ FAILED: ${ex.name} — ${err.message}`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`🏁 Done! Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log('─────────────────────────────────────\n');
  process.exit(0);
}

seedExercises().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
