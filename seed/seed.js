require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const WorkoutDay = require('../models/WorkoutDay');
const Exercise = require('../models/Exercise');
const { workoutDays, getExerciseImageUrl } = require('./seedData');

const run = async () => {
  await connectDB();

  console.log('Clearing existing WorkoutDay/Exercise collections...');
  await Exercise.deleteMany({});
  await WorkoutDay.deleteMany({});

  for (const dayData of workoutDays) {
    const day = await WorkoutDay.create({
      dayNumber: dayData.dayNumber,
      name: dayData.name,
      isRestDay: dayData.isRestDay,
      recoveryTips: dayData.recoveryTips || [],
      stretchingSuggestions: dayData.stretchingSuggestions || [],
      hydrationReminder: dayData.hydrationReminder || '',
    });

    let order = 1;
    for (const ex of dayData.exercises) {
      await Exercise.create({
        workoutDay: day._id,
        order: order++,
        name: ex.name,
        category: ex.category,
        muscleGroup: ex.category,
        targetMuscle: '',
        sets: ex.sets,
        repsRange: ex.repsRange,
        imageUrl: getExerciseImageUrl(ex.name),
        benefits: [],
        tips: [],
        commonMistakes: [],
      });
    }

    console.log(`Seeded Day ${day.dayNumber} — ${day.name} (${dayData.exercises.length} exercises)`);
  }

  console.log('Seeding complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
