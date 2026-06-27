import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, Gift, Sparkles, Loader2, Check, HelpCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function Surveys({ surveys, completeSurvey, user, onSwitchTab }) {
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // CPX Research integration state
  const [subTab, setSubTab] = useState('daily');
  const [cpxUrl, setCpxUrl] = useState('');
  const [loadingCpx, setLoadingCpx] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (subTab === 'cpx' && !cpxUrl && user?.id) {
      setLoadingCpx(true);
      setFetchError(null);
      setIframeLoading(true);
      fetch(`${API_BASE}/surveys/cpx-url?userId=${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to generate survey URL');
          return res.json();
        })
        .then(data => {
          if (data.url) {
            setCpxUrl(data.url);
          } else {
            throw new Error('No URL returned from server');
          }
        })
        .catch(err => {
          console.error("Error fetching CPX url:", err);
          setFetchError(err.message || 'Error connecting to CPX Research server');
        })
        .finally(() => setLoadingCpx(false));
    }
  }, [subTab, cpxUrl, user?.id]);

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
          <div>You earned <strong>+{successInfo.rewardAmount} Coins</strong>!</div>
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
        /* Surveys List with Sub-Navigation Tabs */
        <>
          <div className="tab-navigation" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button 
              className={`tab-btn ${subTab === 'daily' ? 'active' : ''}`}
              onClick={() => setSubTab('daily')}
              style={{ flex: 1, padding: '10px' }}
            >
              📋 Daily Surveys
            </button>
            <button 
              className={`tab-btn ${subTab === 'cpx' ? 'active' : ''}`}
              onClick={() => setSubTab('cpx')}
              style={{ flex: 1, padding: '10px' }}
            >
              ⚡ CPX Research
            </button>
          </div>

          {subTab === 'daily' ? (
            <>
              <div className="section-title">
                <ClipboardList size={12} /> Available Surveys
              </div>

              {surveys.length === 0 ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', margin: '8px 0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>No Active Daily Surveys</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Create custom feedback campaigns and reward participants in Coins!
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '11px', background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: 'bold', display: 'block', margin: '0 auto' }}
                    onClick={() => onSwitchTab('create-campaign')}
                  >
                    + Create Survey
                  </button>
                </div>
              ) : (
                surveys.map(survey => {
                  const isCompleted = survey.completed === 1;

                  return (
                    <div className="card" key={survey.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: '1' }}>
                          <div className="task-title" style={{ fontSize: '13px', fontWeight: '700' }}>
                            {survey.title}
                          </div>
                          <div className="task-desc" style={{ fontSize: '11px', marginTop: '2px', color: '#b2bec3' }}>
                            {survey.description}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {survey.time_estimate} min
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                              <Gift size={12} /> +{survey.reward_amount} Coins 
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
                })
              )}
            </>
          ) : (
            /* CPX Surveys Iframe Content */
            <div className="tab-content-fade">
              <div className="section-title">
                <Sparkles size={12} /> CPX Survey Wall
              </div>

              {/* Informative Tips Box */}
              <div style={{
                background: 'rgba(0, 212, 255, 0.04)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <HelpCircle size={14} /> How it works
                </div>
                Complete third-party surveys matching your demographic to earn Coin rewards instantly. 
                {user?.premium_status === 1 ? (
                  <strong style={{ color: 'var(--accent-gold)', marginLeft: '4px' }}>
                    🔥 Your 2x Premium Booster is active!
                  </strong>
                ) : (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                    (Upgrade to Premium to get 2x rewards)
                  </span>
                )}
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--accent-red)' }}>
                  ⚠️ Disqualifications or screen-outs may occur if you don't match the target demographic.
                </div>
              </div>

              {loadingCpx && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '10px' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generating secure CPX portal link...</span>
                </div>
              )}

              {fetchError && (
                <div style={{ 
                  padding: '20px', 
                  color: 'var(--accent-red)', 
                  textAlign: 'center', 
                  background: 'rgba(255, 71, 87, 0.08)', 
                  border: '1px solid rgba(255, 71, 87, 0.15)', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  <p>{fetchError}</p>
                  <button 
                    className="btn-secondary" 
                    style={{ marginTop: '10px', fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => {
                      setCpxUrl('');
                      // Force reload state
                      setSubTab('daily');
                      setTimeout(() => setSubTab('cpx'), 100);
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {cpxUrl && (
                <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                  {iframeLoading && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      width: '100%', 
                      height: '550px', 
                      background: 'var(--bg-secondary)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      zIndex: 1
                    }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Loading Survey Wall...</span>
                    </div>
                  )}
                  <div style={{ 
                    width: '100%', 
                    height: '550px', 
                    overflow: 'auto', 
                    WebkitOverflowScrolling: 'touch',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
                  }}>
                    <iframe
                      src={cpxUrl}
                      title="CPX Research Surveys"
                      onLoad={() => setIframeLoading(false)}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
