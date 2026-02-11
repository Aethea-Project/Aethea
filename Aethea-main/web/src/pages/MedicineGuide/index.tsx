import React, { useState } from 'react';
import './styles.css';

/**
 * Aethea - Medicine Guidance System
 * Search medicines, check safety, view contraindications
 */

interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  description: string;
  sideEffects: string[];
  contraindications: string[];
  warnings: {
    diabetes?: boolean;
    hypertension?: boolean;
    pregnancy?: boolean;
    kidneyDisease?: boolean;
    liverDisease?: boolean;
  };
  dosage: string;
  activeIngredients: string[];
}

// Mock patient conditions (in real app, from user profile)
const patientConditions = {
  diabetes: true,
  hypertension: false,
  pregnancy: false,
  kidneyDisease: false,
  liverDisease: false,
};

// Mock medicine database
const mockMedicines: Medicine[] = [
  {
    id: 'med-001',
    name: 'Panadol Extra',
    genericName: 'Paracetamol + Caffeine',
    category: 'Pain Relief',
    description: 'Fast-acting pain reliever for headaches, fever, and body aches',
    sideEffects: ['Nausea', 'Stomach upset', 'Allergic reactions (rare)'],
    contraindications: ['Severe liver disease', 'Alcohol dependency'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: false,
      kidneyDisease: false,
      liverDisease: true,
    },
    dosage: '1-2 tablets every 4-6 hours. Max 8 tablets in 24 hours',
    activeIngredients: ['Paracetamol 500mg', 'Caffeine 65mg'],
  },
  {
    id: 'med-002',
    name: 'Congestal',
    genericName: 'Pseudoephedrine + Paracetamol',
    category: 'Cold & Flu',
    description: 'Relieves nasal congestion, fever, and cold symptoms',
    sideEffects: ['Drowsiness', 'Dry mouth', 'Increased heart rate', 'Elevated blood pressure'],
    contraindications: ['Severe hypertension', 'Heart disease', 'MAO inhibitors'],
    warnings: {
      diabetes: true,
      hypertension: true,
      pregnancy: true,
      kidneyDisease: false,
      liverDisease: false,
    },
    dosage: '1 tablet every 12 hours. Do not exceed 2 tablets in 24 hours',
    activeIngredients: ['Pseudoephedrine 60mg', 'Paracetamol 500mg'],
  },
  {
    id: 'med-003',
    name: 'Glucophage',
    genericName: 'Metformin',
    category: 'Diabetes Management',
    description: 'Controls blood sugar levels in type 2 diabetes',
    sideEffects: ['Diarrhea', 'Nausea', 'Stomach upset', 'Metallic taste'],
    contraindications: ['Kidney disease', 'Liver disease', 'Heart failure'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: true,
      kidneyDisease: true,
      liverDisease: true,
    },
    dosage: 'As prescribed by doctor. Usually 500mg-1000mg twice daily with meals',
    activeIngredients: ['Metformin Hydrochloride 500mg'],
  },
  {
    id: 'med-004',
    name: 'Brufen',
    genericName: 'Ibuprofen',
    category: 'Pain Relief / Anti-inflammatory',
    description: 'Reduces pain, inflammation, and fever',
    sideEffects: ['Stomach pain', 'Heartburn', 'Nausea', 'Dizziness'],
    contraindications: ['Active stomach ulcers', 'Severe kidney disease', 'Aspirin allergy'],
    warnings: {
      diabetes: false,
      hypertension: true,
      pregnancy: true,
      kidneyDisease: true,
      liverDisease: false,
    },
    dosage: '200-400mg every 4-6 hours. Max 1200mg in 24 hours without prescription',
    activeIngredients: ['Ibuprofen 400mg'],
  },
  {
    id: 'med-005',
    name: 'Amoxil',
    genericName: 'Amoxicillin',
    category: 'Antibiotic',
    description: 'Treats bacterial infections',
    sideEffects: ['Diarrhea', 'Nausea', 'Rash', 'Yeast infections'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: false,
      kidneyDisease: true,
      liverDisease: false,
    },
    dosage: 'As prescribed. Typically 250-500mg every 8 hours for 7-10 days',
    activeIngredients: ['Amoxicillin Trihydrate 500mg'],
  },
];

export default function MedicineGuidePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const categories = ['all', ...Array.from(new Set(mockMedicines.map(m => m.category)))];

  const filteredMedicines = mockMedicines.filter(med => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const checkMedicineSafety = (medicine: Medicine) => {
    const warnings: string[] = [];
    if (patientConditions.diabetes && medicine.warnings.diabetes) {
      warnings.push('⚠️ Not recommended for diabetic patients');
    }
    if (patientConditions.hypertension && medicine.warnings.hypertension) {
      warnings.push('⚠️ May affect blood pressure');
    }
    if (patientConditions.pregnancy && medicine.warnings.pregnancy) {
      warnings.push('⚠️ Not safe during pregnancy');
    }
    if (patientConditions.kidneyDisease && medicine.warnings.kidneyDisease) {
      warnings.push('⚠️ Contraindicated with kidney disease');
    }
    if (patientConditions.liverDisease && medicine.warnings.liverDisease) {
      warnings.push('⚠️ Contraindicated with liver disease');
    }
    return warnings;
  };

  return (
    <div className="medicine-guide-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>💊 Medicine Guidance</h1>
          <p>Search for medicines and check their safety based on your health profile</p>
        </div>
      </div>

      {/* Patient Conditions Banner */}
      <div className="conditions-banner">
        <div className="banner-content">
          <span className="banner-title">Your Health Profile:</span>
          <div className="conditions-tags">
            {patientConditions.diabetes && <span className="condition-tag diabetes">Diabetes</span>}
            {patientConditions.hypertension && <span className="condition-tag hypertension">Hypertension</span>}
            {patientConditions.pregnancy && <span className="condition-tag pregnancy">Pregnancy</span>}
            {patientConditions.kidneyDisease && <span className="condition-tag kidney">Kidney Disease</span>}
            {patientConditions.liverDisease && <span className="condition-tag liver">Liver Disease</span>}
            {!Object.values(patientConditions).some(Boolean) && (
              <span className="condition-tag none">No conditions recorded</span>
            )}
          </div>
        </div>
      </div>

      <div className="content-container">
        <div className="search-section">
          {/* Search Bar */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search medicines by name, generic name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Medicine List */}
          <div className="medicine-list">
            {filteredMedicines.length === 0 ? (
              <div className="no-results">
                <span className="no-results-icon">🔍</span>
                <p>No medicines found matching your search</p>
              </div>
            ) : (
              filteredMedicines.map((medicine) => {
                const warnings = checkMedicineSafety(medicine);
                const isSafe = warnings.length === 0;

                return (
                  <div
                    key={medicine.id}
                    className={`medicine-card ${!isSafe ? 'has-warning' : ''} ${
                      selectedMedicine?.id === medicine.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedMedicine(medicine)}
                  >
                    <div className="medicine-card-header">
                      <div>
                        <h3>{medicine.name}</h3>
                        <p className="generic-name">{medicine.genericName}</p>
                      </div>
                      <span className="category-badge">{medicine.category}</span>
                    </div>

                    <p className="medicine-description">{medicine.description}</p>

                    {warnings.length > 0 && (
                      <div className="safety-warnings">
                        {warnings.map((warning, idx) => (
                          <div key={idx} className="warning-tag">
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}

                    {isSafe && (
                      <div className="safety-badge">
                        <span className="check-icon">✓</span> Safe for your profile
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Medicine Details Panel */}
        {selectedMedicine && (
          <div className="details-panel">
            <div className="panel-header">
              <h2>{selectedMedicine.name}</h2>
              <button className="close-btn" onClick={() => setSelectedMedicine(null)}>
                ×
              </button>
            </div>

            <div className="panel-content">
              {/* Safety Alert */}
              {checkMedicineSafety(selectedMedicine).length > 0 && (
                <div className="safety-alert danger">
                  <h3>⚠️ Safety Warning</h3>
                  {checkMedicineSafety(selectedMedicine).map((warning, idx) => (
                    <p key={idx}>{warning}</p>
                  ))}
                  <p className="alert-footer">
                    <strong>Consult your doctor before taking this medicine.</strong>
                  </p>
                </div>
              )}

              {checkMedicineSafety(selectedMedicine).length === 0 && (
                <div className="safety-alert safe">
                  <h3>✓ Safe for Your Profile</h3>
                  <p>No contraindications found with your health conditions.</p>
                </div>
              )}

              {/* Active Ingredients */}
              <div className="detail-section">
                <h3>Active Ingredients</h3>
                <ul>
                  {selectedMedicine.activeIngredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              {/* Dosage */}
              <div className="detail-section">
                <h3>Recommended Dosage</h3>
                <p>{selectedMedicine.dosage}</p>
              </div>

              {/* Side Effects */}
              <div className="detail-section">
                <h3>Possible Side Effects</h3>
                <ul>
                  {selectedMedicine.sideEffects.map((effect, idx) => (
                    <li key={idx}>{effect}</li>
                  ))}
                </ul>
              </div>

              {/* Contraindications */}
              <div className="detail-section">
                <h3>Contraindications</h3>
                <ul>
                  {selectedMedicine.contraindications.map((contra, idx) => (
                    <li key={idx}>{contra}</li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="disclaimer">
                <p>
                  ⓘ This information is for educational purposes only. Always consult with a healthcare
                  professional before starting any medication.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
