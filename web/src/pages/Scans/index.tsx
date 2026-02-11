/**
 * Medical Scans Page - Web
 * Grid view for medical scans with filters, zoom modal, and comparison features
 */

import { useState } from 'react';
import { mockScans } from '@core/data/mockData';
import { MedicalScan, ScanType, ScanStatus } from '@core/types/medical';
import './styles.css';

const ScansPage = () => {
  const [selectedScan, setSelectedScan] = useState<MedicalScan | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [filterType, setFilterType] = useState<ScanType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScanStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'type'>('date');

  // Filter and sort scans
  const filteredScans = mockScans
    .filter(scan => filterType === 'all' || scan.type === filterType)
    .filter(scan => filterStatus === 'all' || scan.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime();
      if (sortBy === 'priority') {
        const priorityOrder = { emergency: 3, urgent: 2, routine: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.type.localeCompare(b.type);
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'var(--color-warning-500)';
      case 'emergency': return 'var(--color-error-500)';
      default: return 'var(--color-success-500)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--color-success-500)';
      case 'pending': return 'var(--color-warning-500)';
      case 'in_progress': return 'var(--color-primary-500)';
      default: return 'var(--color-neutral-400)';
    }
  };

  const handleScanClick = (scan: MedicalScan) => {
    setSelectedScan(scan);
    setSelectedImageIndex(0);
  };

  const closeModal = () => {
    setSelectedScan(null);
  };

  return (
    <div className="scans-page">
      {/* Header */}
      <div className="scans-header">
        <div>
          <h1 className="scans-title">Medical Scans</h1>
          <p className="scans-subtitle">View and manage your medical imaging results</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="scans-content">
        {/* Filters Sidebar */}
        <aside className="scans-sidebar">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{mockScans.length}</div>
              <div className="stat-label">Total Scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{mockScans.filter(s => s.status === 'completed').length}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{mockScans.filter(s => s.priority === 'urgent' || s.priority === 'emergency').length}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-section">
            <h3 className="filter-title">Filters</h3>

            {/* Sort By */}
            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="date">Most Recent</option>
                <option value="priority">Priority</option>
                <option value="type">Type</option>
              </select>
            </div>

            {/* Scan Type */}
            <div className="filter-group">
              <label className="filter-label">Scan Type</label>
              <div className="filter-buttons">
                <button
                  className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All Types
                </button>
                <button
                  className={`filter-button ${filterType === 'X-Ray' ? 'active' : ''}`}
                  onClick={() => setFilterType('X-Ray')}
                >
                  X-Ray
                </button>
                <button
                  className={`filter-button ${filterType === 'CT' ? 'active' : ''}`}
                  onClick={() => setFilterType('CT')}
                >
                  CT Scan
                </button>
                <button
                  className={`filter-button ${filterType === 'MRI' ? 'active' : ''}`}
                  onClick={() => setFilterType('MRI')}
                >
                  MRI
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <div className="filter-buttons">
                <button
                  className={`filter-button ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All Status
                </button>
                <button
                  className={`filter-button ${filterStatus === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed
                </button>
                <button
                  className={`filter-button ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Scans Grid */}
        <main className="scans-main">
          <div className="scans-grid">
            {filteredScans.map((scan) => (
              <div
                key={scan.id}
                className="scan-card"
                onClick={() => handleScanClick(scan)}
              >
                {/* Image Grid */}
                <div className="scan-images">
                  {scan.images.slice(0, 4).map((image, index) => (
                    <div key={image.id} className="scan-image-wrapper">
                      <img
                        src={image.url}
                        alt={`${scan.type} - ${image.viewType}`}
                        className="scan-image"
                      />
                      {index === 3 && scan.images.length > 4 && (
                        <div className="scan-image-overlay">
                          +{scan.images.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Content */}
                <div className="scan-card-content">
                  <div className="scan-card-header">
                    <h3 className="scan-card-title">{scan.type}</h3>
                    <div className="scan-badges">
                      <span
                        className="scan-badge"
                        style={{
                          backgroundColor: getPriorityColor(scan.priority) + '20',
                          color: getPriorityColor(scan.priority),
                          borderColor: getPriorityColor(scan.priority)
                        }}
                      >
                        {scan.priority}
                      </span>
                    </div>
                  </div>

                  <p className="scan-card-body-part">{scan.bodyPart}</p>

                  <div className="scan-card-footer">
                    <div className="scan-card-date">
                      📅 {new Date(scan.scanDate).toLocaleDateString()}
                    </div>
                    <div className="scan-card-meta">
                      <span className="scan-card-count">📸 {scan.images.length}</span>
                      <span
                        className="scan-card-status"
                        style={{ color: getStatusColor(scan.status) }}
                      >
                        • {scan.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredScans.length === 0 && (
            <div className="no-results">
              <p>No scans found matching your filters</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {selectedScan && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content scan-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>

            <div className="scan-modal-layout">
              {/* Left: Image Viewer */}
              <div className="scan-modal-viewer">
                <div className="scan-modal-image-container">
                  <img
                    src={selectedScan.images[selectedImageIndex].url}
                    alt={`${selectedScan.type} - ${selectedScan.images[selectedImageIndex].viewType}`}
                    className="scan-modal-image"
                  />
                  <div className="scan-modal-image-info">
                    <span>{selectedScan.images[selectedImageIndex].viewType} • {selectedScan.images[selectedImageIndex].position}</span>
                    <span>{selectedImageIndex + 1} / {selectedScan.images.length}</span>
                  </div>
                </div>

                {/* Thumbnails */}
                {selectedScan.images.length > 1 && (
                  <div className="scan-modal-thumbnails">
                    {selectedScan.images.map((image, index) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt={image.viewType}
                        className={`scan-modal-thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                        onClick={() => setSelectedImageIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="scan-modal-details">
                <h2 className="scan-modal-title">{selectedScan.type}</h2>
                <p className="scan-modal-subtitle">{selectedScan.bodyPart}</p>

                <div className="scan-modal-badges">
                  <span
                    className="scan-badge"
                    style={{
                      backgroundColor: getPriorityColor(selectedScan.priority) + '20',
                      color: getPriorityColor(selectedScan.priority),
                      borderColor: getPriorityColor(selectedScan.priority)
                    }}
                  >
                    {selectedScan.priority.toUpperCase()}
                  </span>
                  <span
                    className="scan-badge"
                    style={{
                      backgroundColor: getStatusColor(selectedScan.status) + '20',
                      color: getStatusColor(selectedScan.status),
                      borderColor: getStatusColor(selectedScan.status)
                    }}
                  >
                    {selectedScan.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="scan-modal-info">
                  <div className="info-row">
                    <span className="info-label">Date:</span>
                    <span className="info-value">{new Date(selectedScan.scanDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Ordered By:</span>
                    <span className="info-value">Dr. {selectedScan.orderingPhysician}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Facility:</span>
                    <span className="info-value">{selectedScan.facility}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Modality:</span>
                    <span className="info-value">{selectedScan.modality}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Protocol:</span>
                    <span className="info-value">{selectedScan.protocol}</span>
                  </div>
                </div>

                {selectedScan.findings && (
                  <div className="scan-modal-section findings">
                    <h3>Findings</h3>
                    <p>{selectedScan.findings}</p>
                  </div>
                )}

                {selectedScan.impressions && (
                  <div className="scan-modal-section impressions">
                    <h3>Impressions</h3>
                    <p>{selectedScan.impressions}</p>
                  </div>
                )}

                {selectedScan.images[selectedImageIndex].annotations && selectedScan.images[selectedImageIndex].annotations!.length > 0 && (
                  <div className="scan-modal-section annotations">
                    <h3>Annotations</h3>
                    {selectedScan.images[selectedImageIndex].annotations!.map((annotation, index) => (
                      <div key={index} className="annotation-item">
                        <span className="annotation-dot" style={{ backgroundColor: annotation.color }}></span>
                        <span>{annotation.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="scan-modal-actions">
                  <button className="btn-primary">📥 Download Report</button>
                  <button className="btn-secondary">📤 Share</button>
                  <button className="btn-secondary">🖨️ Print</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScansPage;
