/**
 * Mock recovery program data for RecoveryAssistant page
 * Will be replaced by API calls when the backend endpoints are ready.
 */

export interface Exercise {
  id: string;
  name: string;
  type: 'mobility' | 'strength' | 'stretching' | 'breathing';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  sets?: number;
  reps?: number;
  instructions: string[];
  benefits: string[];
  warnings: string[];
  videoUrl: string;
  image: string;
}

export interface RecoveryProgram {
  id: string;
  surgeryType: string;
  week: number;
  phase: string;
  exercises: Exercise[];
  tips: string[];
}

export const mockRecoveryProgram: RecoveryProgram = {
  id: 'program-001',
  surgeryType: 'Knee Arthroscopy',
  week: 2,
  phase: 'Early Recovery',
  exercises: [
    {
      id: 'ex-001',
      name: 'Ankle Pumps',
      type: 'mobility',
      difficulty: 'beginner',
      duration: 5,
      sets: 3,
      reps: 20,
      instructions: [
        'Lie on your back with legs straight',
        'Point your toes down as far as you can',
        'Pull your toes up toward you as far as you can',
        'Repeat slowly and smoothly',
      ],
      benefits: [
        'Improves blood circulation',
        'Prevents blood clots',
        'Reduces swelling',
      ],
      warnings: [
        'Stop if you feel sharp pain',
        'Do not force the movement',
      ],
      videoUrl: '#',
      image: '🦶',
    },
    {
      id: 'ex-002',
      name: 'Quadriceps Sets',
      type: 'strength',
      difficulty: 'beginner',
      duration: 5,
      sets: 3,
      reps: 15,
      instructions: [
        'Lie on your back with legs straight',
        'Tighten the muscle on top of your thigh',
        'Push the back of your knee into the floor',
        'Hold for 5 seconds, then relax',
      ],
      benefits: [
        'Strengthens thigh muscles',
        'Supports knee joint',
        'Prevents muscle atrophy',
      ],
      warnings: [
        'Do not hold your breath',
        'Start gently',
      ],
      videoUrl: '#',
      image: '💪',
    },
    {
      id: 'ex-003',
      name: 'Straight Leg Raises',
      type: 'strength',
      difficulty: 'intermediate',
      duration: 10,
      sets: 2,
      reps: 10,
      instructions: [
        'Lie on your back with one knee bent',
        'Keep the other leg straight',
        'Tighten the thigh muscle and lift the leg 6-12 inches',
        'Hold for 5 seconds, then lower slowly',
      ],
      benefits: [
        'Builds quadriceps strength',
        'Improves knee stability',
        'Enhances mobility',
      ],
      warnings: [
        'Do not arch your back',
        'Keep movements controlled',
        'Consult your doctor if painful',
      ],
      videoUrl: '#',
      image: '🏋️',
    },
    {
      id: 'ex-004',
      name: 'Deep Breathing',
      type: 'breathing',
      difficulty: 'beginner',
      duration: 5,
      instructions: [
        'Sit or lie in a comfortable position',
        'Breathe in slowly through your nose',
        'Hold for 2-3 seconds',
        'Breathe out slowly through your mouth',
        'Repeat 10 times',
      ],
      benefits: [
        'Improves lung function',
        'Reduces stress',
        'Promotes healing',
      ],
      warnings: [
        'Do not hyperventilate',
      ],
      videoUrl: '#',
      image: '🌬️',
    },
  ],
  tips: [
    '🧊 Apply ice to your knee for 15-20 minutes every 2-3 hours to reduce swelling',
    '💊 Take medications as prescribed by your doctor',
    '🛌 Elevate your leg above heart level when resting',
    '🚶 Start gentle walking as advised by your physiotherapist',
    '📱 Track your progress daily and report any concerns to your doctor',
  ],
};
