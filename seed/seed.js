require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const WorkoutDay = require('../models/WorkoutDay');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const { workoutDaysPlan1, workoutDaysPlan2, getExerciseImageUrl } = require('./seedData');

const templateMap = {};

const getOrCreateTemplate = async (name, category) => {
  if (templateMap[name]) return templateMap[name];
  let template = await ExerciseTemplate.findOne({ name });
  if (!template) {
    template = await ExerciseTemplate.create({
      name,
      category,
      muscleGroup: category,
      targetMuscle: '',
      imageUrl: getExerciseImageUrl(name),
      benefits: [],
      tips: [],
      commonMistakes: [],
    });
  }
  templateMap[name] = template;
  return template;
};

const seedPlan = async (planCode, workoutDays) => {
  for (const dayData of workoutDays) {
    const day = await WorkoutDay.create({
      planCode,
      dayNumber: dayData.dayNumber,
      name: dayData.name,
      isRestDay: dayData.isRestDay,
      recoveryTips: dayData.recoveryTips || [],
      stretchingSuggestions: dayData.stretchingSuggestions || [],
      hydrationReminder: dayData.hydrationReminder || '',
    });

    let order = 1;
    for (const ex of dayData.exercises) {
      const template = await getOrCreateTemplate(ex.name, ex.category);
      await Exercise.create({
        workoutDay: day._id,
        template: template._id,
        order: order++,
        sets: ex.sets,
        repsRange: ex.repsRange,
      });
    }

    console.log(`Seeded ${planCode} Day ${day.dayNumber} — ${day.name} (${dayData.exercises.length} exercises)`);
  }
};

const run = async () => {
  await connectDB();

  console.log('Clearing existing WorkoutDay, Exercise, and ExerciseTemplate collections...');
  await Exercise.deleteMany({});
  await ExerciseTemplate.deleteMany({});
  await WorkoutDay.deleteMany({});

  try {
    console.log('Dropping old indexes on WorkoutDay collection...');
    await WorkoutDay.collection.dropIndexes();
  } catch (err) {
    console.log('No old indexes to drop or collection was fresh');
  }

  console.log('Seeding Default Plan 1...');
  await seedPlan('plan1', workoutDaysPlan1);

  console.log('Seeding Default Plan 2...');
  await seedPlan('plan2', workoutDaysPlan2);

  console.log('All Default Plans (Plan 1 & Plan 2) Seeded Successfully!');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
