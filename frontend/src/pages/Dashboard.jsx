import React, { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import surveyQuestions from "../data/surveyQuestions";
import "../styles/dashboard.css";
import "../styles/global.css";
import Logo from "../components/Logo";
import { useAuth } from '../utils/AuthContext'; // adjust the path if needed
import Navbar from "../components/Navbar";
import API from '../utils/apiClient';

// register Chart.js plugin once
Chart.register(ChartDataLabels);

const installationLabels = {
  '1': 'Common Ground',
  '2': 'Breathing Pavilion',
};

const normalizeSingleValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
};

const ratingQuestions = ['q8', 'q9', 'q10', 'q11'];
const visitDurationMinutes = {
  'Less than 5 minutes': 2.5,
  '5-15 minutes': 10,
  '15-30 minutes': 22.5,
  '30 minutes to 1 hour': 45,
  'More than 1 hour': 75,
};

const formatMetricNumber = (value, digits = 1) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(digits);
};

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 'N/A';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)} hr`;
};

// helper function to aggregate survey responses
const aggregateResponses = (data, questionId) => {
  const counts = {};
  data.forEach(entry => {
    const responses = entry.responses;
    if (!responses || typeof responses !== "object") return;

    const response = responses[questionId];
    if (response) {
      const values = Array.isArray(response) ? response : [response];
      values.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
      });
    }
  });
  return counts;
};

const downloadConfig = {
  csv: {
    filename: 'survey_summary.csv',
  },
  pdf: {
    filename: 'survey_graphs_summary.pdf',
  },
  both: {
    filename: 'survey_reports.zip',
  },
  metrics_pdf: {
    filename: 'key_metrics_summary.pdf',
  },
};

const handleDownload = async (downloadFormat, options = {}) => {
  try {
    const response = await API.get('/generate-report', {
      params: {
        format: downloadFormat,
        tab: options.tab || 'visualization',
        installationId: options.installationId || 'all',
        zipCode: options.zipCode || 'all',
      },
      responseType: 'blob',
    });

    // creates a URL for the blob and triggers download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadConfig[downloadFormat].filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Error downloading the report:', err);
  }
};

export default function Dashboard() {
  const { isAuthenticated, surveyData } = useAuth();

  const [loadingCharts, setLoadingCharts] = useState(true);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics');
  const [selectedInstallation, setSelectedInstallation] = useState('all');
  const [selectedZipCode, setSelectedZipCode] = useState('all');
  
  const chartRefs = useRef({});
  const charts = useRef({});
  const downloadMenuRef = useRef(null);
  const [chartType, setChartType] = useState("pie");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const installationOptions = Object.entries(installationLabels).map(([id, label]) => ({
    id,
    label,
  }));

  const zipCodeOptions = Array.from(
    new Set(
      (Array.isArray(surveyData) ? surveyData : [])
        .map((entry) => normalizeSingleValue(entry.responses?.q7))
        .filter(Boolean)
    )
  ).sort();

  const filteredSurveyData = (Array.isArray(surveyData) ? surveyData : []).filter((entry) => {
    const installationMatches = selectedInstallation === 'all' || entry.installationId === selectedInstallation;
    const zipFilter = activeTab === 'visualization' ? selectedZipCode : 'all';
    const zipCodeMatches = zipFilter === 'all' || normalizeSingleValue(entry.responses?.q7) === zipFilter;
    return installationMatches && zipCodeMatches;
  });

  const uniqueInstallationsCount = new Set(
    filteredSurveyData.map((entry) => entry.installationId).filter(Boolean)
  ).size;

  const allRatingValues = filteredSurveyData.flatMap((entry) =>
    ratingQuestions
      .map((questionId) => Number(normalizeSingleValue(entry.responses?.[questionId])))
      .filter((value) => Number.isFinite(value) && value > 0)
  );

  const averageRating = allRatingValues.length
    ? allRatingValues.reduce((sum, value) => sum + value, 0) / allRatingValues.length
    : 0;

  const averageVisitDuration = (() => {
    const durationValues = filteredSurveyData
      .map((entry) => visitDurationMinutes[normalizeSingleValue(entry.responses?.q3)])
      .filter((value) => Number.isFinite(value));

    if (!durationValues.length) {
      return 0;
    }

    return durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length;
  })();

  const topZipCode = (() => {
    const counts = {};
    filteredSurveyData.forEach((entry) => {
      const zipCode = normalizeSingleValue(entry.responses?.q7);
      if (!zipCode) return;
      counts[zipCode] = (counts[zipCode] || 0) + 1;
    });

    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return topEntry ? `${topEntry[0]} (${topEntry[1]})` : 'N/A';
  })();

  const neighborhoodInterestRate = (() => {
    const interestAnswers = filteredSurveyData
      .map((entry) => normalizeSingleValue(entry.responses?.q13))
      .filter(Boolean);

    if (!interestAnswers.length) {
      return 0;
    }

    const yesCount = interestAnswers.filter((answer) => answer === 'Yes').length;
    return (yesCount / interestAnswers.length) * 100;
  })();

  const mostCommonActivity = (() => {
    const counts = aggregateResponses(filteredSurveyData, 'q12');
    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return topEntry ? topEntry[0] : 'N/A';
  })();

  const metricCards = [
    {
      label: 'Total Participants',
      value: formatMetricNumber(filteredSurveyData.length, 0),
      icon: '👥',
      tone: 'sky',
      info: 'Counts all survey submissions that match the current filters.',
    },
    {
      label: 'Total Installations',
      value: formatMetricNumber(uniqueInstallationsCount, 0),
      icon: '🎨',
      tone: 'orange',
      info: 'Counts the distinct art installations represented in the filtered survey results.',
    },
    {
      label: 'Avg Rating',
      value: formatMetricNumber(averageRating),
      icon: '⭐',
      tone: 'green',
      info: 'Average of the four 1-to-5 rating questions: welcome, safety, comfort, and overall experience.',
    },
    {
      label: 'Average Visit Duration',
      value: formatDuration(averageVisitDuration),
      icon: '⏱️',
      tone: 'navy',
      info: 'Estimated from the survey time-spent question using midpoint values for each visit-duration range.',
    },
  ];

  useEffect(() => {
    Object.values(charts.current).forEach((chart) => chart?.destroy());
    charts.current = {};

    if (activeTab !== 'visualization' || filteredSurveyData.length === 0) {
      setLoadingCharts(false);
      return;
    }

    setLoadingCharts(true);

    const frameId = window.requestAnimationFrame(() => {
      surveyQuestions.forEach(({ questionId }) => {
        const canvas = chartRefs.current[questionId];
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const data = aggregateResponses(filteredSurveyData, questionId);

        charts.current[questionId] = new Chart(ctx, {
          type: chartType,
          data: {
            labels: Object.keys(data),
            datasets: [{
              label: questionId,
              data: Object.values(data),
              backgroundColor: [
                "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
                "#FF9F40", "#E7E9ED", "#76A21E", "#C71F37", "#00A6B4"
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              datalabels: {
                formatter: (value, context) => {
                  const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${percentage}%`;
                },
                color: "#000",
                font: {
                  weight: "bold",
                  size: 13
                }
              },
              legend: {
                position: "bottom"
              }
            }
          }
        });
      });

      setLoadingCharts(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [surveyData, selectedInstallation, selectedZipCode, chartType, activeTab]);

  if (!isAuthenticated) {
    return (
      <>
        <Logo />
        <div className="dashboard-container">
          <h1>Error - 404, Cannot Access this Page!</h1>
        </div>
      </>
    );
  }

  return (
    <>
    <Navbar/>
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button
          type="button"
          className={`dashboard-tab${activeTab === 'metrics' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Key Metrics
        </button>
        <button
          type="button"
          className={`dashboard-tab${activeTab === 'visualization' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          Data Visualization
        </button>
      </div>

      <div className="dashboard-controls">
        {activeTab === 'visualization' && (
          <>
            <label htmlFor="chart-type">Chart Type:</label>
            <select
              id="chart-type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="pie">Pie</option>
              <option value="doughnut">Doughnut</option>
              <option value="bar">Bar</option>
            </select>
          </>
        )}

        <label htmlFor="installation-filter">Art Installation:</label>
        <select
          id="installation-filter"
          value={selectedInstallation}
          onChange={(e) => setSelectedInstallation(e.target.value)}
        >
          <option value="all">All Installations</option>
          {installationOptions.map((installation) => (
            <option key={installation.id} value={installation.id}>
              {installation.label}
            </option>
          ))}
        </select>

        {activeTab === 'visualization' && (
          <>
            <label htmlFor="zipcode-filter">Zip Code:</label>
            <select
              id="zipcode-filter"
              value={selectedZipCode}
              onChange={(e) => setSelectedZipCode(e.target.value)}
            >
              <option value="all">All Zip Codes</option>
              {zipCodeOptions.map((zipCode) => (
                <option key={zipCode} value={zipCode}>
                  {zipCode}
                </option>
              ))}
            </select>
          </>
        )}

        <div className="download-split-button" ref={downloadMenuRef}>
          {activeTab === 'metrics' ? (
            <button
              type="button"
              className="blue-button dashboard-download-button dashboard-download-main dashboard-download-single"
              onClick={() => handleDownload('metrics_pdf', {
                tab: 'metrics',
                installationId: selectedInstallation,
                zipCode: 'all',
              })}
            >
              Download PDF
            </button>
          ) : (
            <>
              <button
                type="button"
                className="blue-button dashboard-download-button dashboard-download-main"
                onClick={() => handleDownload('both', {
                  tab: 'visualization',
                  installationId: selectedInstallation,
                  zipCode: selectedZipCode,
                })}
              >
                Download
              </button>
              <div className="dashboard-download-dropdown">
                <button
                  type="button"
                  className="blue-button dashboard-download-button dashboard-download-toggle"
                  aria-label="Choose download format"
                  aria-expanded={isDownloadMenuOpen}
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                >
                  <span className="dashboard-download-caret" aria-hidden="true">▾</span>
                </button>
                <div className={`dashboard-download-menu${isDownloadMenuOpen ? ' is-open' : ''}`}>
                  <button type="button" onClick={() => { setIsDownloadMenuOpen(false); handleDownload('csv', { tab: 'visualization', installationId: selectedInstallation, zipCode: selectedZipCode }); }}>Download CSV</button>
                  <button type="button" onClick={() => { setIsDownloadMenuOpen(false); handleDownload('pdf', { tab: 'visualization', installationId: selectedInstallation, zipCode: selectedZipCode }); }}>Download PDF</button>
                  <button type="button" onClick={() => { setIsDownloadMenuOpen(false); handleDownload('both', { tab: 'visualization', installationId: selectedInstallation, zipCode: selectedZipCode }); }}>Download CSV + PDF</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {filteredSurveyData.length === 0 ? (
        <div className="dashboard-empty-state">
          <h3>No survey responses match these filters yet.</h3>
        </div>
      ) : activeTab === 'metrics' ? (
        <div className="metrics-dashboard">
          <div className="metrics-card-grid">
            {metricCards.map((card) => (
              <article key={card.label} className={`metric-card metric-card-${card.tone}`}>
                <div className="metric-card-info">
                  <button
                    type="button"
                    className="metric-card-info-button"
                    aria-label={`About ${card.label}`}
                  >
                    i
                  </button>
                  <div className="metric-card-tooltip" role="tooltip">
                    {card.info}
                  </div>
                </div>
                <div className="metric-card-icon" aria-hidden="true">{card.icon}</div>
                <div className="metric-card-label">{card.label}</div>
                <div className="metric-card-value">{card.value}</div>
              </article>
            ))}
          </div>

          <div className="metrics-detail-grid">
            <article className="metrics-panel">
              <h3>Audience Snapshot</h3>
              <p><strong>Top ZIP Code:</strong> {topZipCode}</p>
              <p><strong>Most Common Activity:</strong> {mostCommonActivity}</p>
            </article>

            <article className="metrics-panel">
              <h3>Experience Indicators</h3>
              <p><strong>Neighborhood Interest:</strong> {formatMetricNumber(neighborhoodInterestRate, 0)}%</p>
              <p><strong>Average Rating Basis:</strong> Welcome, Safety, Comfort, Experience</p>
            </article>
          </div>
        </div>
      ) : (
        <div className="dashboard-charts-section">
          {loadingCharts && (
            <div className="dashboard-chart-loading">
              <div className="spinner"></div>
            </div>
          )}
          <div className={`charts-container${loadingCharts ? ' charts-container-loading' : ''}`}>
            {surveyQuestions.map(({ questionId, question }) => (
              <div key={questionId} className="chart-block">
                <h3>{question}</h3>
                <canvas
                  ref={(el) => (chartRefs.current[questionId] = el)}
                  width={400}
                  height={400}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
