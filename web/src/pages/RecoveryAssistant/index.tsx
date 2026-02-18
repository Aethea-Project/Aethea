import React, { useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Post-Surgery Recovery Assistant
 * Exercises, videos, and AI tips for recovery
 */

interface Exercise {
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

interface RecoveryProgram {
  id: string;
  surgeryType: string;
  week: number;
  phase: string;
  exercises: Exercise[];
  tips: string[];
}

const mockRecoveryProgram: RecoveryProgram = {
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

export default function RecoveryAssistantPage() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  const program = mockRecoveryProgram;

  const toggleComplete = (exerciseId: string) => {
    setCompletedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const progressPercentage = Math.round(
    (completedExercises.length / program.exercises.length) * 100
  );

  return (
    <div className="recovery-assistant-page">
      {/* Header */}
      <FeatureHeader
        title="Recovery Assistant"
        subtitle="Personalized exercises and guidance for your recovery"
        variant="rec"
        imageSrc={imageAssets.headers.recovery}
        imageAlt="Physical therapy and recovery"
      />

      {/* Progress Banner */}
      <div className="progress-banner">
        <div className="banner-content">
          <div className="progress-info">
            <h3>{program.surgeryType} Recovery</h3>
            <p>
              Week {program.week} • {program.phase}
            </p>
          </div>
          <div className="progress-stats">
            <div className="progress-circle">
              <svg width="80" height="80">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${progressPercentage * 2.2} 220`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="progress-text">
                <span className="progress-value">{progressPercentage}%</span>
              </div>
            </div>
            <div className="progress-label">
              <strong>
                {completedExercises.length} of {program.exercises.length}
              </strong>
              <span>exercises completed today</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Sidebar - Tips */}
        <div className="sidebar">
          <div className="tips-card">
            <h3>💡 Recovery Tips</h3>
            <div className="tips-list">
              {program.tips.map((tip, idx) => (
                <div key={idx} className="tip-item">
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="emergency-card">
            <h3>⚠️ When to Seek Help</h3>
            <ul>
              <li>Severe pain not controlled by medication</li>
              <li>Increased swelling or redness</li>
              <li>Fever above 38°C (100.4°F)</li>
              <li>Difficulty breathing or chest pain</li>
              <li>Numbness or tingling</li>
            </ul>
          </div>
        </div>

        {/* Main Content - Exercises */}
        <div className="main-content">
          <div className="section-header">
            <h2>Today's Exercises</h2>
            <button
              className="reset-btn"
              onClick={() => setCompletedExercises([])}
            >
              Reset Progress
            </button>
          </div>

          <div className="exercises-grid">
            {program.exercises.map((exercise) => {
              const isCompleted = completedExercises.includes(exercise.id);

              return (
                <div
                  key={exercise.id}
                  className={`exercise-card ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="exercise-header">
                    <div className="exercise-icon">{exercise.image}</div>
                    <div className="exercise-info">
                      <h3>{exercise.name}</h3>
                      <div className="exercise-meta">
                        <span className={`type-badge ${exercise.type}`}>
                          {exercise.type}
                        </span>
                        <span className={`difficulty-badge ${exercise.difficulty}`}>
                          {exercise.difficulty}
                        </span>
                      </div>
                    </div>
                    <button
                      className="complete-checkbox"
                      onClick={() => toggleComplete(exercise.id)}
                    >
                      {isCompleted ? '✓' : ''}
                    </button>
                  </div>

                  <div className="exercise-details">
                    {exercise.sets && exercise.reps && (
                      <div className="exercise-specs">
                        <span>
                          {exercise.sets} sets × {exercise.reps} reps
                        </span>
                        <span>•</span>
                        <span>{exercise.duration} min</span>
                      </div>
                    )}
                    {!exercise.sets && (
                      <div className="exercise-specs">
                        <span>{exercise.duration} min</span>
                      </div>
                    )}

                    <div className="exercise-preview">
                      <strong>Benefits:</strong>
                      <p>{exercise.benefits[0]}</p>
                    </div>
                  </div>

                  <div className="exercise-actions">
                    <button
                      className="view-details-btn"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      View Details
                    </button>
                    <button className="watch-video-btn">
                      ▶️ Watch Video
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="modal-overlay" onClick={() => setSelectedExercise(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedExercise.name}</h2>
              <button
                className="close-modal-btn"
                onClick={() => setSelectedExercise(null)}
              >
                ×
              </button>
            </div>

            <div className="exercise-detail-content">
              <div className="exercise-detail-icon">{selectedExercise.image}</div>

              <div className="detail-meta">
                <span className={`type-badge ${selectedExercise.type}`}>
                  {selectedExercise.type}
                </span>
                <span className={`difficulty-badge ${selectedExercise.difficulty}`}>
                  {selectedExercise.difficulty}
                </span>
                {selectedExercise.sets && selectedExercise.reps && (
                  <span className="spec-badge">
                    {selectedExercise.sets} sets × {selectedExercise.reps} reps
                  </span>
                )}
                <span className="spec-badge">{selectedExercise.duration} min</span>
              </div>

              <div className="detail-section">
                <h3>📋 Instructions</h3>
                <ol>
                  {selectedExercise.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ol>
              </div>

              <div className="detail-section">
                <h3>✅ Benefits</h3>
                <ul>
                  {selectedExercise.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section warnings">
                <h3>⚠️ Warnings</h3>
                <ul>
                  {selectedExercise.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>

              <button className="watch-full-video-btn">
                ▶️ Watch Full Video Tutorial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
