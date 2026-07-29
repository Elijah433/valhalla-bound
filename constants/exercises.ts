export interface Exercise {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'olympic' | 'cable' | 'bodyweight' | 'recovery' | 'custom';
  muscles: string;
  // 'both' means achievable with a realistic minimal home setup (dumbbells,
  // pull-up bar, kettlebell, bodyweight) as well as at a commercial gym.
  // 'gym' means it genuinely needs a barbell+rack, cable stack, or a
  // dedicated machine most home setups won't have. Custom exercises don't
  // get a fixed value here — the person adding one is asked directly.
  equipment: 'gym' | 'both';
}

export const EXERCISES: Exercise[] = [
  // ── PUSH ──────────────────────────────────────────
  { id: 'bench', name: 'Bench Press', category: 'push', muscles: 'Chest, Triceps, Shoulders', equipment: 'gym'  },
  { id: 'incline_bench', name: 'Incline Bench Press', category: 'push', muscles: 'Upper Chest, Shoulders', equipment: 'gym'  },
  { id: 'decline_bench', name: 'Decline Bench Press', category: 'push', muscles: 'Lower Chest, Triceps', equipment: 'gym'  },
  { id: 'db_press', name: 'Dumbbell Press', category: 'push', muscles: 'Chest, Triceps', equipment: 'both'  },
  { id: 'incline_db_press', name: 'Incline Dumbbell Press', category: 'push', muscles: 'Upper Chest, Shoulders', equipment: 'both'  },
  { id: 'ohp', name: 'Overhead Press', category: 'push', muscles: 'Shoulders, Triceps', equipment: 'gym'  },
  { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', category: 'push', muscles: 'Shoulders, Triceps', equipment: 'both'  },
  { id: 'arnold_press', name: 'Arnold Press', category: 'push', muscles: 'Shoulders, Triceps', equipment: 'both'  },
  { id: 'lateral_raise', name: 'Lateral Raises', category: 'push', muscles: 'Side Delts', equipment: 'both'  },
  { id: 'front_raise', name: 'Front Raises', category: 'push', muscles: 'Front Delts', equipment: 'both'  },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', category: 'push', muscles: 'Triceps', equipment: 'gym'  },
  { id: 'skull_crusher', name: 'Skull Crusher', category: 'push', muscles: 'Triceps', equipment: 'both'  },
  { id: 'close_grip_bench', name: 'Close Grip Bench Press', category: 'push', muscles: 'Triceps, Chest', equipment: 'gym'  },
  { id: 'dips', name: 'Dips', category: 'push', muscles: 'Chest, Triceps', equipment: 'both'  },
  { id: 'chest_fly', name: 'Dumbbell Fly', category: 'push', muscles: 'Chest', equipment: 'both'  },
  { id: 'pec_deck', name: 'Pec Deck Machine', category: 'push', muscles: 'Chest', equipment: 'gym'  },

  // ── PULL ──────────────────────────────────────────
  { id: 'deadlift', name: 'Deadlift', category: 'pull', muscles: 'Back, Hamstrings, Glutes', equipment: 'gym'  },
  { id: 'sumo_deadlift', name: 'Sumo Deadlift', category: 'pull', muscles: 'Glutes, Hamstrings, Back', equipment: 'gym'  },
  { id: 'pullup', name: 'Pull Ups', category: 'pull', muscles: 'Lats, Biceps', equipment: 'both'  },
  { id: 'chinup', name: 'Chin Ups', category: 'pull', muscles: 'Lats, Biceps', equipment: 'both'  },
  { id: 'row', name: 'Barbell Row', category: 'pull', muscles: 'Back, Biceps', equipment: 'gym'  },
  { id: 'db_row', name: 'Dumbbell Row', category: 'pull', muscles: 'Back, Biceps', equipment: 'both'  },
  { id: 'tbar_row', name: 'T-Bar Row', category: 'pull', muscles: 'Mid Back, Lats', equipment: 'gym'  },
  { id: 'seated_row', name: 'Seated Cable Row', category: 'pull', muscles: 'Back, Biceps', equipment: 'gym'  },
  { id: 'lat_pulldown', name: 'Lat Pulldown', category: 'pull', muscles: 'Lats, Biceps', equipment: 'gym'  },
  { id: 'straight_arm_pulldown', name: 'Straight Arm Pulldown', category: 'pull', muscles: 'Lats', equipment: 'gym'  },
  { id: 'face_pull', name: 'Face Pull', category: 'pull', muscles: 'Rear Delts, Traps', equipment: 'gym'  },
  { id: 'shrug', name: 'Barbell Shrug', category: 'pull', muscles: 'Traps', equipment: 'gym'  },
  { id: 'curl', name: 'Barbell Curl', category: 'pull', muscles: 'Biceps', equipment: 'gym'  },
  { id: 'db_curl', name: 'Dumbbell Curl', category: 'pull', muscles: 'Biceps', equipment: 'both'  },
  { id: 'hammer_curl', name: 'Hammer Curl', category: 'pull', muscles: 'Biceps, Forearms', equipment: 'both'  },
  { id: 'preacher_curl', name: 'Preacher Curl', category: 'pull', muscles: 'Biceps', equipment: 'gym'  },
  { id: 'incline_curl', name: 'Incline Dumbbell Curl', category: 'pull', muscles: 'Biceps', equipment: 'both'  },
  { id: 'rack_pull', name: 'Rack Pull', category: 'pull', muscles: 'Upper Back, Traps', equipment: 'gym'  },

  // ── LEGS ──────────────────────────────────────────
  { id: 'squat', name: 'Back Squat', category: 'legs', muscles: 'Quads, Glutes, Hamstrings', equipment: 'gym'  },
  { id: 'front_squat', name: 'Front Squat', category: 'legs', muscles: 'Quads, Core', equipment: 'gym'  },
  { id: 'goblet_squat', name: 'Goblet Squat', category: 'legs', muscles: 'Quads, Glutes, Core', equipment: 'both'  },
  { id: 'rdl', name: 'Romanian Deadlift', category: 'legs', muscles: 'Hamstrings, Glutes', equipment: 'both'  },
  { id: 'leg_press', name: 'Leg Press', category: 'legs', muscles: 'Quads, Glutes', equipment: 'gym'  },
  { id: 'hack_squat', name: 'Hack Squat', category: 'legs', muscles: 'Quads, Glutes', equipment: 'gym'  },
  { id: 'lunge', name: 'Lunges', category: 'legs', muscles: 'Quads, Glutes', equipment: 'both'  },
  { id: 'walking_lunge', name: 'Walking Lunges', category: 'legs', muscles: 'Quads, Glutes', equipment: 'both'  },
  { id: 'split_squat', name: 'Bulgarian Split Squat', category: 'legs', muscles: 'Quads, Glutes', equipment: 'both'  },
  { id: 'hip_thrust', name: 'Hip Thrust', category: 'legs', muscles: 'Glutes, Hamstrings', equipment: 'both'  },
  { id: 'glute_bridge', name: 'Glute Bridge', category: 'legs', muscles: 'Glutes', equipment: 'both'  },
  { id: 'leg_curl', name: 'Leg Curl', category: 'legs', muscles: 'Hamstrings', equipment: 'gym'  },
  { id: 'leg_extension', name: 'Leg Extension', category: 'legs', muscles: 'Quads', equipment: 'gym'  },
  { id: 'calf_raise', name: 'Calf Raises', category: 'legs', muscles: 'Calves', equipment: 'both'  },
  { id: 'seated_calf_raise', name: 'Seated Calf Raises', category: 'legs', muscles: 'Soleus, Calves', equipment: 'gym'  },
  { id: 'step_up', name: 'Step Ups', category: 'legs', muscles: 'Quads, Glutes', equipment: 'both'  },
  { id: 'good_morning', name: 'Good Morning', category: 'legs', muscles: 'Hamstrings, Lower Back', equipment: 'gym'  },

  // ── CORE ──────────────────────────────────────────
  { id: 'plank', name: 'Plank', category: 'core', muscles: 'Core, Shoulders', equipment: 'both'  },
  { id: 'side_plank', name: 'Side Plank', category: 'core', muscles: 'Obliques, Core', equipment: 'both'  },
  { id: 'crunch', name: 'Crunches', category: 'core', muscles: 'Abs', equipment: 'both'  },
  { id: 'leg_raise', name: 'Leg Raises', category: 'core', muscles: 'Lower Abs', equipment: 'both'  },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raises', category: 'core', muscles: 'Lower Abs, Hip Flexors', equipment: 'both'  },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', category: 'core', muscles: 'Core, Lats', equipment: 'both'  },
  { id: 'russian_twist', name: 'Russian Twist', category: 'core', muscles: 'Obliques', equipment: 'both'  },
  { id: 'bicycle_crunch', name: 'Bicycle Crunch', category: 'core', muscles: 'Abs, Obliques', equipment: 'both'  },
  { id: 'cable_crunch', name: 'Cable Crunch', category: 'core', muscles: 'Abs', equipment: 'gym'  },
  { id: 'dragon_flag', name: 'Dragon Flag', category: 'core', muscles: 'Full Core', equipment: 'both'  },
  { id: 'dead_bug', name: 'Dead Bug', category: 'core', muscles: 'Core, Stability', equipment: 'both'  },
  { id: 'pallof_press', name: 'Pallof Press', category: 'core', muscles: 'Core, Anti-Rotation', equipment: 'gym'  },

  // ── OLYMPIC ──────────────────────────────────────────
  { id: 'power_clean', name: 'Power Clean', category: 'olympic', muscles: 'Full Body, Explosive', equipment: 'gym'  },
  { id: 'clean_jerk', name: 'Clean & Jerk', category: 'olympic', muscles: 'Full Body, Explosive', equipment: 'gym'  },
  { id: 'snatch', name: 'Snatch', category: 'olympic', muscles: 'Full Body, Explosive', equipment: 'gym'  },
  { id: 'hang_clean', name: 'Hang Clean', category: 'olympic', muscles: 'Traps, Glutes, Explosive', equipment: 'gym'  },
  { id: 'push_press', name: 'Push Press', category: 'olympic', muscles: 'Shoulders, Legs, Explosive', equipment: 'gym'  },
  { id: 'push_jerk', name: 'Push Jerk', category: 'olympic', muscles: 'Shoulders, Full Body', equipment: 'gym'  },
  { id: 'kb_swing', name: 'Kettlebell Swing', category: 'olympic', muscles: 'Glutes, Hamstrings, Core', equipment: 'both'  },
  { id: 'kb_clean', name: 'Kettlebell Clean', category: 'olympic', muscles: 'Full Body, Explosive', equipment: 'both'  },
  { id: 'kb_snatch', name: 'Kettlebell Snatch', category: 'olympic', muscles: 'Full Body, Explosive', equipment: 'both'  },

  // ── CABLE ──────────────────────────────────────────
  { id: 'cable_fly', name: 'Cable Fly', category: 'cable', muscles: 'Chest', equipment: 'gym'  },
  { id: 'cable_crossover', name: 'Cable Crossover', category: 'cable', muscles: 'Chest', equipment: 'gym'  },
  { id: 'cable_lateral_raise', name: 'Cable Lateral Raise', category: 'cable', muscles: 'Side Delts', equipment: 'gym'  },
  { id: 'cable_curl', name: 'Cable Curl', category: 'cable', muscles: 'Biceps', equipment: 'gym'  },
  { id: 'cable_pushdown', name: 'Cable Pushdown', category: 'cable', muscles: 'Triceps', equipment: 'gym'  },
  { id: 'cable_row', name: 'Cable Row', category: 'cable', muscles: 'Back, Biceps', equipment: 'gym'  },
  { id: 'cable_pull_through', name: 'Cable Pull Through', category: 'cable', muscles: 'Glutes, Hamstrings', equipment: 'gym'  },
  { id: 'cable_woodchop', name: 'Cable Woodchop', category: 'cable', muscles: 'Core, Obliques', equipment: 'gym'  },
  { id: 'cable_kickback', name: 'Cable Glute Kickback', category: 'cable', muscles: 'Glutes', equipment: 'gym'  },

  // ── BODYWEIGHT ──────────────────────────────────────────
  { id: 'pushup', name: 'Push Ups', category: 'bodyweight', muscles: 'Chest, Triceps, Core', equipment: 'both'  },
  { id: 'diamond_pushup', name: 'Diamond Push Ups', category: 'bodyweight', muscles: 'Triceps, Chest', equipment: 'both'  },
  { id: 'pike_pushup', name: 'Pike Push Ups', category: 'bodyweight', muscles: 'Shoulders, Triceps', equipment: 'both'  },
  { id: 'muscle_up', name: 'Muscle Ups', category: 'bodyweight', muscles: 'Lats, Chest, Triceps', equipment: 'both'  },
  { id: 'handstand_pushup', name: 'Handstand Push Ups', category: 'bodyweight', muscles: 'Shoulders, Triceps', equipment: 'both'  },
  { id: 'bodyweight_squat', name: 'Bodyweight Squat', category: 'bodyweight', muscles: 'Quads, Glutes', equipment: 'both'  },
  { id: 'jump_squat', name: 'Jump Squats', category: 'bodyweight', muscles: 'Quads, Glutes, Explosive', equipment: 'both'  },
  { id: 'burpee', name: 'Burpees', category: 'bodyweight', muscles: 'Full Body', equipment: 'both'  },
  { id: 'box_jump', name: 'Box Jumps', category: 'bodyweight', muscles: 'Quads, Glutes, Explosive', equipment: 'both'  },
  { id: 'inverted_row', name: 'Inverted Row', category: 'bodyweight', muscles: 'Back, Biceps', equipment: 'both'  },
  { id: 'dip', name: 'Parallel Bar Dips', category: 'bodyweight', muscles: 'Chest, Triceps', equipment: 'both'  },

  // ── CARDIO ──────────────────────────────────────────
  { id: 'run', name: 'Running', category: 'cardio', muscles: 'Full Body, Cardio', equipment: 'both'  },
  { id: 'tempo_run', name: 'Tempo Run', category: 'cardio', muscles: 'Full Body, Cardio', equipment: 'both'  },
  { id: 'interval_run', name: 'Interval Sprints', category: 'cardio', muscles: 'Full Body, Explosive', equipment: 'both'  },
  { id: 'long_run', name: 'Long Distance Run', category: 'cardio', muscles: 'Full Body, Endurance', equipment: 'both'  },
  { id: 'row_machine', name: 'Rowing Machine', category: 'cardio', muscles: 'Full Body, Back', equipment: 'gym'  },
  { id: 'bike', name: 'Stationary Bike', category: 'cardio', muscles: 'Legs, Cardio', equipment: 'both'  },
  { id: 'assault_bike', name: 'Assault Bike', category: 'cardio', muscles: 'Full Body, Cardio', equipment: 'gym'  },
  { id: 'jump_rope', name: 'Jump Rope', category: 'cardio', muscles: 'Full Body, Cardio', equipment: 'both'  },
  { id: 'stair_climb', name: 'Stair Climb', category: 'cardio', muscles: 'Legs, Cardio', equipment: 'both'  },
  { id: 'swim', name: 'Swimming', category: 'cardio', muscles: 'Full Body, Cardio', equipment: 'gym'  },
  { id: 'battle_ropes', name: 'Battle Ropes', category: 'cardio', muscles: 'Arms, Core, Cardio', equipment: 'gym'  },
  { id: 'sled_push', name: 'Sled Push', category: 'cardio', muscles: 'Legs, Full Body', equipment: 'gym'  },
  { id: 'walk', name: 'Walking', category: 'cardio', muscles: 'Full Body, Low Impact', equipment: 'both'  },
  { id: 'hike', name: 'Hiking', category: 'cardio', muscles: 'Full Body, Low Impact', equipment: 'both'  },

  // ── RECOVERY ──────────────────────────────────────────
  { id: 'foam_roll', name: 'Foam Rolling', category: 'recovery', muscles: 'Full Body, Fascia', equipment: 'both'  },
  { id: 'yoga', name: 'Yoga Flow', category: 'recovery', muscles: 'Full Body, Flexibility', equipment: 'both'  },
  { id: 'mobility', name: 'Mobility Work', category: 'recovery', muscles: 'Joints, Flexibility', equipment: 'both'  },
  { id: 'stretching', name: 'Static Stretching', category: 'recovery', muscles: 'Full Body', equipment: 'both'  },
  { id: 'hip_flexor_stretch', name: 'Hip Flexor Stretch', category: 'recovery', muscles: 'Hip Flexors', equipment: 'both'  },
  { id: 'hamstring_stretch', name: 'Hamstring Stretch', category: 'recovery', muscles: 'Hamstrings', equipment: 'both'  },
  { id: 'thoracic_rotation', name: 'Thoracic Rotation', category: 'recovery', muscles: 'Spine, Upper Back', equipment: 'both'  },
  { id: 'cold_exposure', name: 'Cold Exposure', category: 'recovery', muscles: 'Recovery, CNS', equipment: 'both'  },
  { id: 'meditation', name: 'Meditation', category: 'recovery', muscles: 'Mental Recovery', equipment: 'both'  },
  { id: 'sauna', name: 'Sauna Session', category: 'recovery', muscles: 'Recovery, Circulation', equipment: 'gym'  },
  { id: 'massage', name: 'Massage / Soft Tissue', category: 'recovery', muscles: 'Full Body, Recovery', equipment: 'both'  },
];

export const CATEGORY_LABELS: Record<Exercise['category'], string> = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  core: 'CORE',
  cardio: 'CARDIO',
  olympic: 'OLYMPIC',
  cable: 'CABLE',
  bodyweight: 'BODYWEIGHT',
  recovery: 'RECOVERY',
  custom: 'CUSTOM',
};

export const CATEGORY_RUNES: Record<Exercise['category'], string> = {
  push: 'ᚦ',
  pull: 'ᚱ',
  legs: 'ᚷ',
  core: 'ᚠ',
  cardio: 'ᚢ',
  olympic: 'ᛟ',
  cable: 'ᚲ',
  bodyweight: 'ᚺ',
  recovery: 'ᛁ',
  custom: 'ᚨ',
};

export const CATEGORY_COLORS: Record<Exercise['category'], string> = {
  push: '#C9A84C',
  pull: '#E05050',
  legs: '#7A9B6E',
  core: '#D4A84C',
  cardio: '#A8C4D4',
  olympic: '#8B6FD4',
  cable: '#C77DBA',
  bodyweight: '#5BA3C7',
  recovery: '#9A9590',
  custom: '#D48C4C',
};

export const CATEGORY_ORDER: Exercise['category'][] = [
  'push', 'pull', 'legs', 'core', 'olympic', 'bodyweight', 'cable', 'cardio', 'recovery', 'custom'
];