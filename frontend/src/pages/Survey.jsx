import React, { useEffect, useState } from 'react';
import SurveyQuestion from '../components/SurveyQuestion';
import Logo from '../components/Logo';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/survey.css';
import API from '../utils/apiClient';
import surveyQuestions from '../data/surveyQuestions';

const installations = {
  '1': {
    name: 'Common Ground',
    image: '/Common_Ground.jpeg',
  },
  '2': {
    name: 'Breathing Pavilion',
    image: '/Breathing_Pavilion.jpeg',
  },
};

export default function SurveyPage() {
  const location = useLocation();
  const selectedInstallationId = location.state?.installationId || '1';
  const installation = installations[selectedInstallationId] || installations['1'];
  const [installationId] = useState(selectedInstallationId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const current = surveyQuestions[currentIndex];
  const questionKey = current.questionId;

  useEffect(() => {
    if (current.type === 'range' && !answers[questionKey]) {
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: ['3'],
      }));
    }
  }, [current.type, questionKey, answers]);

  const handleAnswerChange = (key, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: answer,
    }));
  };

  const handleNext = () => {
    if (!answers[questionKey] || answers[questionKey].length === 0) {
      setError("Please answer the question before proceeding.");
      return;
    }
    setError('');
    if (currentIndex < surveyQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      navigate('/survey-complete');
    }
  };

  const handleBack = () => {
    setError('');
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/submit-survey', {
        installationId,
        responses: answers,
      });
      console.log('Survey is submitted', res.data);
      navigate('/survey-complete');
    } catch (err) {
      setError(err.response?.data?.message || 'Survey submission failed.');
      console.error('Submission failure:', err);
    }
  };

  return (
    <>
      <Logo />
      <div className="survey-page">
        <h2>{installation.name}</h2>
        <img src={installation.image} alt={installation.name} className="survey-img" />
        <br></br>

        <div className="progress-container">
          <div className="progress-text">
            Question {currentIndex + 1} of {surveyQuestions.length}
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((currentIndex + 1) / surveyQuestions.length) * 100}%`
              }}
            />
          </div>
        </div>

        <SurveyQuestion
          question={current.question}
          options={current.options}
          multiple={current.multiple}
          questionType={current.type || "choice"}
          currentAnswer={answers[questionKey] || []}
          onAnswer={(answer) => handleAnswerChange(questionKey, answer)}
          onNext={handleNext}
          onBack={handleBack}
          isFirst={currentIndex === 0}
          isLast={currentIndex === surveyQuestions.length - 1}
          handleSubmit={handleSubmit}
        />

        {error && <p className="error-message">{error}</p>}
      </div>
    </>
  );
}
