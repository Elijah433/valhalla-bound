// Real, functional stretch library — each entry explains the actual
// mechanism (why it helps), not just the motion itself, matching the
// app's existing bar for defensible, real content (same rigor spirit as
// the Hávamál/saga sourcing standard, just for anatomy instead of
// mythology). Framed as general wellness guidance, not medical treatment
// — nothing here claims to cure or treat a diagnosed condition.

export type BodyArea =
  | 'neck' | 'shoulders' | 'lower_back' | 'hips' | 'hamstrings' | 'full_body';

export interface Stretch {
  id: string;
  name: string;        // Norse-flavored name, matching app voice
  plainName: string;   // the actual common name, for search/clarity
  area: BodyArea;
  rune: string;
  duration: string;
  symptomTags: string[]; // search terms like "headache", "sciatica"
  steps: string[];
  whyItHelps: string;    // the real mechanism explanation
}

export const BODY_AREAS: { key: BodyArea; label: string; rune: string }[] = [
  { key: 'neck',       label: 'Neck',        rune: 'ᚺ' },
  { key: 'shoulders',  label: 'Shoulders',   rune: 'ᛋ' },
  { key: 'lower_back', label: 'Lower Back',  rune: 'ᚦ' },
  { key: 'hips',       label: 'Hips',        rune: 'ᚱ' },
  { key: 'hamstrings', label: 'Hamstrings',  rune: 'ᚢ' },
  { key: 'full_body',  label: 'Full Body',   rune: 'ᛟ' },
];

export const STRETCHES: Stretch[] = [
  {
    id: 'upper_trap',
    name: "The Skald's Release",
    plainName: 'Upper Trapezius Stretch',
    area: 'neck',
    rune: 'ᚺ',
    duration: '30 sec each side',
    symptomTags: ['headache', 'tension headache', 'neck pain', 'stiff neck', 'desk', 'screen time'],
    steps: [
      'Sit or stand tall. Drop your right ear toward your right shoulder.',
      'Rest your right hand gently on top of your head — no pulling, just light weight.',
      'For a deeper stretch, reach your left arm down and back slightly.',
      'Hold, breathing slowly, then switch sides.',
    ],
    whyItHelps: 'The upper trapezius is one of the most common sites of built-up tension from stress and screen posture, and tightness here is a well-documented contributor to tension-type headaches. Lengthening this muscle reduces the pull on the base of the skull where many tension headaches originate.',
  },
  {
    id: 'levator_scap',
    name: "The Watchman's Turn",
    plainName: 'Levator Scapulae Stretch',
    area: 'neck',
    rune: 'ᚺ',
    duration: '30 sec each side',
    symptomTags: ['headache', 'neck pain', 'stiff neck', 'shoulder tension'],
    steps: [
      'Turn your head 45 degrees to the right, looking toward your armpit.',
      'Gently place your right hand on the back of your head.',
      'Allow the light weight of your hand to draw your chin down and in.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'The levator scapulae runs from the neck to the shoulder blade and is a common hidden source of one-sided neck stiffness — it tightens easily from sleeping position, phone use, and stress. This angle targets it specifically, which a straight-forward neck stretch usually misses.',
  },
  {
    id: 'chin_tucks',
    name: "The Watchtower Stance",
    plainName: 'Chin Tucks',
    area: 'neck',
    rune: 'ᚺ',
    duration: '10 reps',
    symptomTags: ['headache', 'posture', 'forward head posture', 'neck pain', 'desk'],
    steps: [
      'Sit or stand tall, looking straight ahead.',
      'Without tilting your head down, draw your chin straight back, like making a double chin.',
      'Hold for 2-3 seconds, then release.',
      'Repeat.',
    ],
    whyItHelps: 'This retrains the deep neck flexor muscles that counteract "forward head posture" — a very common pattern from desk and phone use where the head sits ahead of the shoulders, adding significant load to the neck and upper back over the course of a day.',
  },
  {
    id: 'cross_body_shoulder',
    name: "The Shield-Arm Cross",
    plainName: 'Cross-Body Shoulder Stretch',
    area: 'shoulders',
    rune: 'ᛋ',
    duration: '30 sec each side',
    symptomTags: ['shoulder pain', 'tight shoulders', 'upper back', 'posture'],
    steps: [
      'Bring your right arm straight across your chest.',
      'Use your left forearm to gently press the right arm closer to your body.',
      'Keep your shoulder down, away from your ear.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Targets the posterior deltoid and rotator cuff muscles at the back of the shoulder, which tend to stay chronically shortened in anyone who spends a lot of time reaching forward — desk work, driving, or pushing-focused training without matching pulling work.',
  },
  {
    id: 'doorway_chest',
    name: "The Longship Bow",
    plainName: 'Doorway Chest Stretch',
    area: 'shoulders',
    rune: 'ᛋ',
    duration: '30 sec',
    symptomTags: ['posture', 'rounded shoulders', 'chest tightness', 'desk'],
    steps: [
      'Stand in a doorway, arms up at 90 degrees, forearms on the frame.',
      'Step one foot forward through the doorway until you feel a stretch across your chest.',
      'Keep your core braced so your lower back doesn\'t arch.',
      'Hold, breathing normally.',
    ],
    whyItHelps: 'Chronically tight chest muscles (pectoralis major/minor) pull the shoulders forward and down, reinforcing rounded posture. Since this muscle group is worked constantly in pushing exercises (bench press, push-ups), it needs deliberate lengthening to stay balanced against the back muscles.',
  },
  {
    id: 'childs_pose',
    name: "The Longhouse Fold",
    plainName: "Child's Pose",
    area: 'lower_back',
    rune: 'ᚦ',
    duration: '45-60 sec',
    symptomTags: ['lower back pain', 'back pain', 'lumbar', 'stiffness', 'tight back'],
    steps: [
      'Kneel on the floor, big toes touching, knees wide.',
      'Sit your hips back toward your heels.',
      'Walk your hands forward and lower your chest toward the floor.',
      'Let your forehead rest down, and breathe into your lower back.',
    ],
    whyItHelps: 'Gently decompresses the lumbar spine by flexing it in a fully supported, low-load position. This is one of the safest ways to relieve stiffness after heavy lifting or long sitting, since it takes weight-bearing compression off the discs while still moving the joints through a comfortable range.',
  },
  {
    id: 'cat_cow',
    name: "The Wolf's Arch",
    plainName: 'Cat-Cow',
    area: 'lower_back',
    rune: 'ᚦ',
    duration: '10 slow reps',
    symptomTags: ['lower back pain', 'back pain', 'stiffness', 'morning stiffness'],
    steps: [
      'Start on hands and knees, wrists under shoulders, knees under hips.',
      'Inhale: drop your belly, arch your back, lift your head and tailbone (Cow).',
      'Exhale: round your spine toward the ceiling, tuck your chin (Cat).',
      'Move slowly between the two, following your breath.',
    ],
    whyItHelps: 'Moves the entire spine through flexion and extension in a controlled, low-impact way, which helps pump fluid through the spinal discs and reduce stiffness — especially useful first thing in the morning, when discs are at their most swollen from overnight rest and the spine is at its stiffest.',
  },
  {
    id: 'knee_to_chest',
    name: "The Fallen Oak",
    plainName: 'Knee-to-Chest Stretch',
    area: 'lower_back',
    rune: 'ᚦ',
    duration: '30 sec each leg',
    symptomTags: ['lower back pain', 'back pain', 'sciatica', 'lumbar'],
    steps: [
      'Lie on your back, both knees bent, feet flat on the floor.',
      'Pull one knee toward your chest with both hands, keeping the other foot planted.',
      'Keep your lower back flat against the floor.',
      'Hold, then switch legs.',
    ],
    whyItHelps: 'Gently stretches the lower back and glute on the side being pulled, while the flat-back position prevents the lumbar spine from overarching — a common mistake that can aggravate rather than relieve back tightness.',
  },
  {
    id: 'piriformis',
    name: "The Berserker's Knot",
    plainName: 'Piriformis Stretch',
    area: 'lower_back',
    rune: 'ᚦ',
    duration: '30-45 sec each side',
    symptomTags: ['sciatica', 'glute pain', 'hip pain', 'lower back pain', 'radiating pain', 'leg pain'],
    steps: [
      'Lie on your back, knees bent. Cross your right ankle over your left knee.',
      'Reach through and grab behind your left thigh.',
      'Pull your left knee toward your chest until you feel a stretch deep in the right glute.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'The sciatic nerve runs directly beneath (and in some people, through) the piriformis muscle. When this small deep hip muscle tightens, it can compress the nerve and cause pain that radiates down the leg — a pattern often mistaken for a spinal disc issue. Stretching it directly targets one of the most common sources of sciatica-type pain.',
  },
  {
    id: 'hip_flexor',
    name: "The Kneeling Oath",
    plainName: 'Kneeling Hip Flexor Stretch',
    area: 'hips',
    rune: 'ᚱ',
    duration: '30-45 sec each side',
    symptomTags: ['hip pain', 'tight hips', 'lower back pain', 'desk', 'sitting'],
    steps: [
      'Kneel on your right knee, left foot planted in front, both at 90 degrees.',
      'Tuck your pelvis slightly (like bracing your abs) and shift your hips forward.',
      'You should feel the stretch at the front of the right hip, not in your lower back.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Hip flexors (especially the iliopsoas) stay in a shortened position all day for anyone who sits often, and a tight hip flexor directly pulls the pelvis forward, increasing the arch in the lower back — a major, frequently-overlooked contributor to lower back discomfort that has nothing to do with the back itself.',
  },
  {
    id: 'figure_4',
    name: "The Runic Cross",
    plainName: 'Figure-4 Stretch',
    area: 'hips',
    rune: 'ᚱ',
    duration: '30-45 sec each side',
    symptomTags: ['hip pain', 'tight hips', 'sciatica', 'glute pain'],
    steps: [
      'Lie on your back, knees bent, feet flat.',
      'Cross your right ankle over your left knee, forming a "4" shape.',
      'Reach through and pull your left thigh toward your chest.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Directly stretches the glutes and outer hip rotators, a common source of tightness for anyone doing squats, lunges, or running regularly. Like the piriformis stretch, this can also help relieve sciatic-nerve-related discomfort since the two overlap significantly.',
  },
  {
    id: 'seated_hamstring',
    name: "The Long Reach",
    plainName: 'Seated Hamstring Stretch',
    area: 'hamstrings',
    rune: 'ᚢ',
    duration: '30-45 sec each side',
    symptomTags: ['tight hamstrings', 'leg tightness', 'lower back pain'],
    steps: [
      'Sit with one leg extended straight, the other bent with foot against your inner thigh.',
      'Keeping your back straight (not rounded), hinge forward from your hips.',
      'Reach toward your extended foot until you feel a stretch in the back of the thigh.',
      'Hold, then switch legs.',
    ],
    whyItHelps: 'Tight hamstrings limit how far you can hinge at the hips, which forces the lower back to round to compensate during everyday movements like bending over — a common contributor to lower back strain that many people never trace back to hamstring tightness.',
  },
  {
    id: 'standing_hamstring',
    name: "The Warrior's Bow",
    plainName: 'Standing Hamstring Stretch',
    area: 'hamstrings',
    rune: 'ᚢ',
    duration: '30 sec each side',
    symptomTags: ['tight hamstrings', 'leg tightness', 'post workout'],
    steps: [
      'Place one heel on a step or low surface, leg straight, toes pointing up.',
      'Keeping your back flat, hinge forward from your hips (not your waist).',
      'Lean forward until you feel a stretch in the back of the raised leg.',
      'Hold, then switch legs.',
    ],
    whyItHelps: 'A convenient variation of the hamstring stretch that doesn\'t require sitting on the floor — useful right after a workout when the muscle is warm and more receptive to lengthening, which is generally the best time to stretch for flexibility gains.',
  },
  {
    id: 'thoracic_rotation',
    name: "The Longship Turn",
    plainName: 'Thoracic Spine Rotation',
    area: 'full_body',
    rune: 'ᛟ',
    duration: '10 reps each side',
    symptomTags: ['upper back pain', 'stiffness', 'posture', 'rounded shoulders'],
    steps: [
      'Start on hands and knees. Place your right hand behind your head.',
      'Rotate your right elbow down toward your left arm, then open it up toward the ceiling.',
      'Follow the movement with your eyes, letting your upper back rotate.',
      'Repeat, then switch sides.',
    ],
    whyItHelps: 'The mid-back (thoracic spine) is designed to rotate, but long hours sitting and hunching over screens make it stiff, which often forces the neck or lower back to twist more than they should to compensate. Restoring this rotation takes pressure off both.',
  },
  {
    id: 'scalene',
    name: "The Longboat Lean",
    plainName: 'Scalene Stretch',
    area: 'neck',
    rune: 'ᚺ',
    duration: '20-30 sec each side',
    symptomTags: ['neck pain', 'headache', 'rib pain', 'shallow breathing', 'shoulder tension'],
    steps: [
      'Sit or stand tall. Place your right hand on your right collarbone, pressing it gently down.',
      'Tilt your head to the left, then slightly rotate your chin up and away from the anchored side.',
      'You should feel the stretch along the side of your neck, above the collarbone.',
      'Hold, breathing slowly, then switch sides.',
    ],
    whyItHelps: 'The scalene muscles run from the neck to the top two ribs and are involved in breathing as well as neck movement. They tighten easily from stress, shallow chest-breathing, and forward head posture, and when tight can also contribute to a feeling of tightness or restriction across the upper ribs.',
  },
  {
    id: 'quad_standing',
    name: "The Runner's Reach",
    plainName: 'Standing Quad Stretch',
    area: 'hamstrings', // grouped with lower-body stretches for now
    rune: 'ᚢ',
    duration: '30 sec each side',
    symptomTags: ['tight quads', 'knee pain', 'thigh tightness', 'post workout'],
    steps: [
      'Stand tall, holding onto something for balance if needed.',
      'Bend your right knee, bringing your heel toward your glutes.',
      'Grasp your right ankle or foot and gently pull it closer, keeping your knees close together.',
      'Keep your hips level and core braced. Hold, then switch sides.',
    ],
    whyItHelps: 'The quadriceps cross both the hip and knee joint, so chronic tightness here can pull on the front of the hip and contribute to an anterior pelvic tilt — a forward-tipped pelvis that, similar to tight hip flexors, can increase strain on the lower back.',
  },
  {
    id: 'lying_hamstring_strap',
    name: "The Bound Reach",
    plainName: 'Lying Hamstring Stretch (with strap or towel)',
    area: 'hamstrings',
    rune: 'ᚢ',
    duration: '30-45 sec each side',
    symptomTags: ['tight hamstrings', 'leg tightness', 'lower back pain', 'sciatica'],
    steps: [
      'Lie on your back. Loop a towel or resistance band around the ball of your right foot.',
      'Keeping your right leg straight, use the strap to draw it toward your chest.',
      'Keep your left leg flat on the floor and your lower back relaxed against the ground.',
      'Hold, then switch legs.',
    ],
    whyItHelps: 'Lying flat removes the lower back entirely from the movement, isolating the hamstring more effectively than seated or standing versions — useful if bending forward at the hips tends to aggravate your lower back.',
  },
  {
    id: 'downward_dog_hamstring',
    name: "The Longship's Prow",
    plainName: 'Downward-Dog Style Hamstring Stretch',
    area: 'hamstrings',
    rune: 'ᚢ',
    duration: '30-45 sec',
    symptomTags: ['tight hamstrings', 'calf tightness', 'full body', 'post workout'],
    steps: [
      'Start on hands and knees, then lift your hips up and back, forming an inverted "V" shape.',
      'Press your heels toward the floor (they don\'t need to touch).',
      'Pedal your feet slowly, bending one knee at a time to deepen the stretch on the straight leg.',
      'Hold, breathing steadily.',
    ],
    whyItHelps: 'Stretches the hamstrings and calves simultaneously while also decompressing the spine, making it an efficient full-posterior-chain stretch rather than isolating a single muscle group.',
  },
  {
    id: 'calf_stretch',
    name: "The Anchor Stance",
    plainName: 'Standing Calf Stretch',
    area: 'hamstrings',
    rune: 'ᚢ',
    duration: '30 sec each side',
    symptomTags: ['tight calves', 'ankle tightness', 'shin pain', 'post workout'],
    steps: [
      'Stand facing a wall, hands against it for support.',
      'Step your right foot back, keeping the leg straight and heel flat on the floor.',
      'Bend your front knee and lean forward slightly until you feel a stretch in the back leg\'s calf.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Tight calves limit ankle mobility, which can change how the foot strikes the ground during walking or running and shift extra load onto the knees or lower back to compensate for the restricted range at the ankle.',
  },
  {
    id: 'butterfly',
    name: "The Shieldmaiden's Fold",
    plainName: 'Butterfly Stretch',
    area: 'hips',
    rune: 'ᚱ',
    duration: '30-45 sec',
    symptomTags: ['tight hips', 'groin tightness', 'inner thigh'],
    steps: [
      'Sit with the soles of your feet together, knees falling out to the sides.',
      'Hold your feet with both hands and sit up tall.',
      'Gently press your knees toward the floor with your forearms, or hinge forward from the hips for more.',
      'Hold, breathing steadily.',
    ],
    whyItHelps: 'Targets the adductors (inner thigh muscles) and hip joint itself, which tend to tighten from long periods of sitting with the knees close together — restricted hip adductor mobility can limit how naturally the hips move during squatting, walking, and lateral movements.',
  },
  {
    id: 'seated_spinal_twist',
    name: "The Skald's Twist",
    plainName: 'Seated Spinal Twist',
    area: 'lower_back',
    rune: 'ᚦ',
    duration: '30 sec each side',
    symptomTags: ['lower back pain', 'upper back pain', 'stiffness', 'posture'],
    steps: [
      'Sit tall, legs extended. Bend your right knee and place the foot outside your left thigh.',
      'Place your right hand on the floor behind you, left elbow outside the right knee.',
      'Gently rotate your torso to the right, looking over your shoulder.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Rotates the spine through a range of motion that\'s easy to lose with a sedentary lifestyle, helping maintain the segmental mobility of the vertebrae rather than letting the spine stiffen into a single, restricted plane of movement.',
  },
  {
    id: 'thread_the_needle',
    name: "The Weaver's Reach",
    plainName: 'Thread-the-Needle',
    area: 'shoulders',
    rune: 'ᛋ',
    duration: '30 sec each side',
    symptomTags: ['upper back pain', 'shoulder tightness', 'between shoulder blades'],
    steps: [
      'Start on hands and knees.',
      'Slide your right arm underneath your left arm, palm up, lowering your right shoulder and ear to the floor.',
      'Keep your hips stacked over your knees as you rest into the stretch.',
      'Hold, then switch sides.',
    ],
    whyItHelps: 'Stretches the muscles between and around the shoulder blades (rhomboids and rear deltoid) along with a gentle thoracic spine rotation — a common tight spot for anyone who spends a lot of time with rounded shoulders at a desk.',
  },
];

// Powers the search bar — matches against the plain name, Norse name,
// and symptom tags, so typing "headache" surfaces the right stretches
// even though no stretch is literally named that.
export function searchStretches(query: string): Stretch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return STRETCHES.filter(s =>
    s.plainName.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.symptomTags.some(tag => tag.toLowerCase().includes(q))
  );
}

export function getStretchesByArea(area: BodyArea): Stretch[] {
  return STRETCHES.filter(s => s.area === area);
}

// ── Verified factual notes — only include claims that are traceable to a
// real, checkable source. Each fact should be something a curious user
// could verify themselves, not a rounded-off or invented approximation.
export interface StretchFact {
  id: string;
  title: string;
  fact: string;
  source: string;
}

export const STRETCH_FACTS: StretchFact[] = [
  {
    id: 'forward_head_load',
    title: 'The Weight of Looking Down',
    fact: 'In a neutral position, the average human head weighs about 10-12 lbs. As it tilts forward, the modeled effective load on the cervical spine rises sharply — to roughly 27 lbs at 15°, 40 lbs at 30°, 49 lbs at 45°, and 60 lbs at 60°, the angle many people unconsciously adopt looking down at a phone. These figures come from a widely-cited biomechanical model, not a direct measurement device on real necks — but the underlying point (more forward tilt means more load) is well established.',
    source: 'Hansraj, K.K. (2014). "Assessment of Stresses in the Cervical Spine Caused by Posture and Position of the Head." Surgical Technology International, 25, 277-279.',
  },
  {
    id: 'static_stretch_timing',
    title: 'Timing Matters More Than You Think',
    fact: 'Multiple studies have found that holding a static stretch right before explosive activity (sprinting, jumping, heavy lifting) can temporarily reduce power output and force production — in one study, sprint performance dropped measurably after a static stretching routine. Static stretching still has real value, just better placed after training or in a separate session, not as a pre-workout warm-up.',
    source: 'Simic, L., Sarabon, N., & Markovic, G. (2013). "Does pre-exercise static stretching inhibit maximal muscular performance?" Scandinavian Journal of Medicine & Science in Sports.',
  },
  {
    id: 'sciatic_nerve_size',
    title: "The Body's Longest Nerve",
    fact: 'The sciatic nerve is the longest and widest single nerve in the human body — about as wide as an adult thumb at its thickest point. It runs from the lower spine, deep beneath the glutes, all the way down the back of the leg to the foot, which is why irritation from a tight piriformis or a spinal issue can cause pain that radiates the entire length of the leg.',
    source: 'Davis D, Vasudevan A. "Sciatica." StatPearls, National Center for Biotechnology Information (NCBI).',
  },
  {
    id: 'lactic_acid_myth',
    title: 'The Soreness Myth',
    fact: "The burning feeling during a hard set and the soreness you feel a day or two later are not the same thing, and lactic acid isn't actually responsible for either one lingering. Lactate clears from the muscles within about 30-60 minutes after exercise ends, that part is settled. The soreness that shows up 24-72 hours later, delayed onset muscle soreness (DOMS), is most commonly attributed to microscopic muscle fiber damage and the inflammation that follows. The exact mechanism is still an active area of research, but lactic acid has been ruled out since the 1980s.",
    source: 'Cheung, K., Hume, P., & Maxwell, L. (2003). "Delayed Onset Muscle Soreness: Treatment Strategies and Performance Factors." Sports Medicine, 33(2), 145-164.',
  },
  {
    id: 'psoas_spine_leg_link',
    title: 'The Only Direct Line From Spine to Leg',
    fact: "The psoas major is the only muscle in the human body that directly connects the spine to the leg — it runs from the sides of the lower vertebrae all the way down to the femur (upper leg bone). Every other muscle linking the trunk to the leg attaches to the pelvis instead of the spine directly, which is part of why a tight psoas can pull directly on the lower back.",
    source: 'Kenhub Anatomy Library, "Psoas Major Muscle" (reviewed anatomical reference); Physiopedia, "Psoas Major."',
  },
];