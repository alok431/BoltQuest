import React, { useState } from 'react';
import { ClipboardList, Clock, Gift, Sparkles, Loader2, Check } from 'lucide-react';

export default function Surveys({ surveys, completeSurvey, user }) {
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleStartSurvey = (survey) => {
    setActiveSurvey(survey);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setSuccessInfo(null);
  };

  const handleSelectOption = (questionQ, optionVal) => {
    setAnswers(prev => ({
      ...prev,
      [questionQ]: optionVal
    }));
  };

  const handleNext = () => {
    if (!activeSurvey) return;
    if (currentQuestionIdx < activeSurvey.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleSubmit = async () => {
    if (!activeSurvey || submitting) return;

    // Check if all questions are answered
    const unanswered = activeSurvey.questions.filter(q => !answers[q.q]);
    if (unanswered.length > 0) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeSurvey(activeSurvey.id, answers);
      setSuccessInfo(result);
      setActiveSurvey(null);
      setTimeout(() => setSuccessInfo(null), 5000);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="surveys" className="tab-content-fade">
      {/* Success Notification */}
      {successInfo && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.15) 0%, rgba(123, 237, 159, 0.05) 100%)',
          border: '1px solid rgba(46, 213, 115, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: '#2ed573',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> Survey Completed Successfully!
          </div>
          <div>You earned <strong>+{successInfo.rewardAmount.toFixed(2)} TON</strong> and <strong>+{successInfo.rewardPoints} Points</strong>!</div>
          {successInfo.levelInfo?.leveledUp && (
            <div style={{ color: '#ffd700', fontWeight: '700', marginTop: '4px' }}>
              🎉 Leveled up to Level {successInfo.levelInfo.newLevel}!
            </div>
          )}
        </div>
      )}

      {/* Active Survey Overlay Panel */}
      {activeSurvey ? (
        <div className="card" style={{ borderColor: 'var(--accent-cyan)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              {activeSurvey.title}
            </span>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '9px' }}
              onClick={() => setActiveSurvey(null)}
            >
              Quit
            </button>
          </div>

          {/* Question Index Progress */}
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '700' }}>
            Question {currentQuestionIdx + 1} of {activeSurvey.questions.length}
          </div>

          <div style={{ minHeight: '140px' }}>
            {/* Question Text */}
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>
              {activeSurvey.questions[currentQuestionIdx].q}
            </div>

            {/* Answer Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSurvey.questions[currentQuestionIdx].opts.map((opt, i) => {
                const questionText = activeSurvey.questions[currentQuestionIdx].q;
                const isSelected = answers[questionText] === opt;

                return (
                  <div 
                    key={i}
                    onClick={() => handleSelectOption(questionText, opt)}
                    style={{
                      padding: '12px',
                      background: isSelected ? 'rgba(0, 212, 255, 0.08)' : 'var(--bg-card)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-color)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      fontWeight: isSelected ? '700' : '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '10px' }}>
            <button 
              className="btn-secondary" 
              onClick={handleBack} 
              disabled={currentQuestionIdx === 0}
              style={{ flex: 1, padding: '10px' }}
            >
              Back
            </button>

            {currentQuestionIdx < activeSurvey.questions.length - 1 ? (
              <button 
                className="btn-primary" 
                onClick={handleNext}
                disabled={!answers[activeSurvey.questions[currentQuestionIdx].q]}
                style={{ flex: 1, padding: '10px' }}
              >
                Next
              </button>
            ) : (
              <button 
                className="btn-primary" 
                onClick={handleSubmit}
                disabled={!answers[activeSurvey.questions[currentQuestionIdx].q] || submitting}
                style={{ flex: 1, padding: '10px', background: 'var(--grad-gold-orange)' }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Submit Survey'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Surveys List */
        <>
          <div className="section-title">
            <ClipboardList size={12} /> Available Surveys
          </div>

          {surveys.map(survey => {
            const isCompleted = survey.completed === 1;

            return (
              <div className="card" key={survey.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: '1' }}>
                    <div className="task-title" style={{ fontSize: '13px', fontWeight: '700' }}>
                      {survey.title}
                    </div>
                    <div className="task-desc" style={{ fontSize: '11px', marginTop: '2px' }}>
                      {survey.description}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {survey.time_estimate} min
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                        <Gift size={12} /> +{survey.reward_amount.toFixed(2)} TON 
                        {user?.premium_status === 1 && ' (2x Booster)'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    {isCompleted ? (
                      <button className="start-btn completed-btn" disabled>
                        <Check size={12} style={{ marginRight: '4px' }} /> Done
                      </button>
                    ) : (
                      <button 
                        className="start-btn" 
                        onClick={() => handleStartSurvey(survey)}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
