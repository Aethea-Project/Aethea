import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  LabIcon, 
  ProfileIcon, 
  CalendarIcon 
} from '../../components/Icons';
import { medicalApi, Reservation, PatientHealthData } from '../../services/medicalApi';
import { FeatureHeader } from '../../components/FeatureHeader';
import { HealthDossierViewer } from '../../components/HealthDossierViewer';

export default function DoctorSharedRecords() {
  const [sharedReservations, setSharedReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected dossier decryption state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [healthData, setHealthData] = useState<PatientHealthData | null>(null);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  const [healthDataError, setHealthDataError] = useState<string | null>(null);


  useEffect(() => {
    async function loadSharedRecords() {
      try {
        setLoading(true);
        const result = await medicalApi.fetchDoctorSharedRecords(page, 10);
        setSharedReservations(result.reservations);
        setTotal(result.total);
        setError(null);
      } catch (err) {
        console.error('Failed to load shared reservations:', err);
        setError('Error loading shared clinical folders list.');
      } finally {
        setLoading(false);
      }
    }

    void loadSharedRecords();
  }, [page]);

  const handleAccessDossier = async (res: Reservation) => {
    setSelectedReservation(res);
    setHealthData(null);
    setHealthDataError(null);
    setLoadingHealthData(true);

    try {
      const data = await medicalApi.fetchPatientDataForReservation(res.id);
      setHealthData(data);
    } catch (err) {
      console.error('HIPAA timeframe constraint failed:', err);
      setHealthDataError(
        err instanceof Error 
          ? err.message 
          : 'Access Forbidden: Under HIPAA attribute-based control rules, patient health histories are encrypted and only decryptable on the exact day of the consult.'
      );
    } finally {
      setLoadingHealthData(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      
      {/* ── Header ── */}
      <FeatureHeader title="Shared Health Folder Portal" />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && sharedReservations.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
        </div>
      ) : sharedReservations.length === 0 ? (
        <Card className="border-transparent">
          <CardContent className="p-16 text-center">
            <LabIcon className="mx-auto h-12 w-12 text-sand-400 mb-4" />
            <h3 className="text-lg font-serif font-medium text-sand-900 mb-2">No Health Folders Shared With You</h3>
            <p className="text-sm text-sand-500 max-w-sm mx-auto">
              Any patient bookings scheduled with you that authorize record sharing will automatically catalog here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Pane: Patient Authorization Catalog ── */}
          <div className="lg:col-span-5 space-y-4 max-h-[700px] overflow-y-auto pr-2">
            <span className="text-xs font-bold text-sand-500 uppercase tracking-widest block mb-2 px-1">
              Authorized Clinician Portals ({total})
            </span>

            {sharedReservations.map((res) => {
              const resDate = new Date(res.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              const startStr = new Date(res.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isSelected = selectedReservation?.id === res.id;
              
              // Progressive disclosure name logic
              const patientName = res.userId ? `Patient (${res.id.slice(0, 5)})` : 'Authorized Patient';

              return (
                <Card 
                  key={res.id} 
                  interactive
                  selected={isSelected}
                  className={isSelected ? "" : "border-transparent"}
                  onClick={() => handleAccessDossier(res)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-sand-400">Secure Token Dossier</span>
                        <h4 className="text-base font-semibold text-sand-900 mt-0.5">
                          {res.doctorSchedule?.clinicInfo?.clinicName ?? patientName}
                        </h4>
                      </div>
                      <span className="inline-flex px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-sand-50 text-sand-900 border border-sand-200 uppercase tracking-wider">
                        Authorized
                      </span>
                    </div>

                    <div className="text-xs text-sand-500 flex items-center gap-1.5 font-medium">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-sand-400" />
                      <span>{resDate} &bull; {startStr}</span>
                    </div>

                    <p className="text-xs text-sand-600 line-clamp-1 italic bg-sand-50/50 p-2 rounded">
                      "{res.reason ?? 'General consult.'}"
                    </p>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination Controls */}
            {total > 10 && (
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev Page
                </Button>
                <span className="text-xs text-sand-500 font-medium">Page {page} of {Math.ceil(total / 10)}</span>
                <Button
                  variant="outline"
                  disabled={page * 10 >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next Page
                </Button>
              </div>
            )}
          </div>

          {/* ── Right Pane: Decrypted History dossier Viewer ── */}
          <div className="lg:col-span-7">
            {selectedReservation ? (
              <div className="space-y-6">
                
                {/* Dossier Header Info */}
                <Card className="border-transparent">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-sand-900 uppercase tracking-wider">
                        Secure Record Decryption Window
                      </span>
                      <CardTitle className="mt-1">
                        Folder: Patient #{selectedReservation.id.slice(0, 5).toUpperCase()}
                      </CardTitle>
                      <p className="text-xs text-sand-500 mt-1">
                        Associated Appointment Date: {new Date(selectedReservation.startAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                  </CardContent>
                </Card>

                {/* Secure Dossier Data Cards */}
                <HealthDossierViewer
                  healthData={healthData}
                  loadingHealthData={loadingHealthData}
                  healthDataError={healthDataError}
                  healthFolderUnlocked={true}
                  onAccessData={() => {}}
                  sharedByPatient={true}
                />
              </div>
            ) : (
              <Card className="border-transparent">
                <CardContent className="p-16 text-center">
                  <ProfileIcon className="mx-auto h-12 w-12 text-sand-400 mb-4" />
                  <h3 className="text-lg font-serif font-medium text-sand-900 mb-1">Decryption Dossier Hub</h3>
                  <p className="text-sm text-sand-500 max-w-sm mx-auto">
                    Select an authorized patient token from the catalog list to decrypt their health summaries securely.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
