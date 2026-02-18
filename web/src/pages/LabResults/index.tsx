import React, { useEffect, useMemo, useState } from 'react';
import { theme } from '@core/ui/theme';
import { LabTest, LabStatus } from '@core/types/medical';
import { medicalApi } from '../../services/medicalApi';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Lab Results Page (Web)
 * Enterprise-level table view with charts and sorting
 */

export default function LabResultsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await medicalApi.fetchLabTests();
        if (!active) return;
        setLabTests(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lab tests');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(labTests.map((t) => t.category)))],
    [labTests]
  );

  const filteredTests = useMemo(() => {
    const base = selectedCategory === 'all'
      ? labTests
      : labTests.filter((t) => t.category === selectedCategory);

    return [...base].sort((a, b) => {
      if (sortBy === 'date') return b.date.getTime() - a.date.getTime();
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'name') return a.testName.localeCompare(b.testName);
      return 0;
    });
  }, [labTests, selectedCategory, sortBy]);

  // Get unique categories
  const getStatusColor = (status: LabStatus) => {
    switch (status) {
      case 'normal':
        return theme.colors.success[500];
      case 'borderline':
        return theme.colors.warning[500];
      case 'abnormal':
      case 'critical':
        return theme.colors.error[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const stats = {
    normal: labTests.filter((t) => t.status === 'normal').length,
    borderline: labTests.filter((t) => t.status === 'borderline').length,
    abnormal: labTests.filter((t) => t.status === 'abnormal' || t.status === 'critical').length,
  };

  if (loading) {
    return <div className="lab-results-page"><p className="loading">Loading lab results…</p></div>;
  }

  if (error) {
    return (
      <div className="lab-results-page">
        <p className="error">Failed to load lab results: {error}</p>
      </div>
    );
  }

  return (
    <div className="lab-results-page">
      {/* Header */}
      <FeatureHeader
        title="Lab Results"
        subtitle={`${labTests.length} total tests`}
        variant="lab"
        imageSrc={imageAssets.headers.lab}
        imageAlt="Medical laboratory equipment"
      />

      {/* Filters */}
      <div className="header-actions">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'name')}
        >
          <option value="date">Sort by Date</option>
          <option value="status">Sort by Status</option>
          <option value="name">Sort by Name</option>
        </select>
        
        <button className="btn-primary">
          Download All Reports
        </button>
      </div>

      <div className="page-content">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card stat-success">
              <div className="stat-number">{stats.normal}</div>
              <div className="stat-label">Normal</div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-number">{stats.borderline}</div>
              <div className="stat-label">Borderline</div>
            </div>

            <div className="stat-card stat-error">
              <div className="stat-number">{stats.abnormal}</div>
              <div className="stat-label">Abnormal</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-section">
            <h3 className="filter-title">Filter by Category</h3>
            <ul className="filter-list">
              {categories.map(category => (
                <li key={category}>
                  <button
                    className={`filter-item ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span className="filter-name">
                      {category === 'all' ? 'All Tests' : category}
                    </span>
                    <span className="filter-count">
                      {category === 'all'
                        ? labTests.length
                        : labTests.filter(t => t.category === category).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Table */}
          <div className="table-container">
            <table className="lab-table">
              <thead>
                <tr>
                  <th className="col-status">Status</th>
                  <th className="col-test">Test Name</th>
                  <th className="col-result">Result</th>
                  <th className="col-range">Reference Range</th>
                  <th className="col-date">Date</th>
                  <th className="col-doctor">Ordered By</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map(test => (
                  <tr
                    key={test.id}
                    className="table-row"
                    onClick={() => setSelectedTest(test)}
                  >
                    <td>
                      <span
                        className="status-indicator"
                        style={{ backgroundColor: getStatusColor(test.status) }}
                        title={test.status}
                      />
                    </td>
                    <td>
                      <div className="test-info">
                        <div className="test-name">{test.testName}</div>
                        <div className="test-category">{test.category}</div>
                      </div>
                    </td>
                    <td>
                      <div className="result-value">
                        <span className="value">{typeof test.value === 'number' ? test.value.toFixed(1) : test.value}</span>
                        <span className="unit">{test.unit}</span>
                      </div>
                    </td>
                    <td className="range-cell">
                      {test.referenceRange.text || 
                        `${test.referenceRange.min ?? '—'} - ${test.referenceRange.max ?? '—'} ${test.unit}`}
                    </td>
                    <td className="date-cell">
                      {test.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="doctor-cell">{test.orderedBy}</td>
                    <td>
                      <button className="btn-icon" title="View Details">
                        →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      {selectedTest && (
        <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTest(null)}>
              ×
            </button>

            <div className="modal-header">
              <h2>{selectedTest.testName}</h2>
              <span className={`badge badge-${selectedTest.status}`}>
                {selectedTest.status.toUpperCase()}
              </span>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Result</h3>
                <div className="result-display">
                  <span className="result-big-value">
                    {typeof selectedTest.value === 'number' ? selectedTest.value.toFixed(1) : selectedTest.value}
                  </span>
                  <span className="result-big-unit">{selectedTest.unit}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                <dl className="detail-list">
                  <div className="detail-row">
                    <dt>Category</dt>
                    <dd>{selectedTest.category}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Test Date</dt>
                    <dd>
                      {selectedTest.date.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt>Ordered By</dt>
                    <dd>{selectedTest.orderedBy}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Reference Range</dt>
                    <dd>
                      {selectedTest.referenceRange.text || 
                        `${selectedTest.referenceRange.min ?? '—'} - ${selectedTest.referenceRange.max ?? '—'} ${selectedTest.unit}`}
                    </dd>
                  </div>
                </dl>
              </div>

              {selectedTest.notes && (
                <div className="detail-section">
                  <h3>Doctor's Notes</h3>
                  <p className="notes-text">{selectedTest.notes}</p>
                </div>
              )}

              <div className="detail-section">
                <h3>Historical Trend</h3>
                <p className="notes-text">Trend data will appear once multiple results are recorded for this test.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary">Download Report</button>
              <button className="btn-primary">Schedule Follow-up</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
