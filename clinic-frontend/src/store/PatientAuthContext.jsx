import { createContext, useContext, useState, useCallback } from 'react';
import { PATIENT_TOKEN_KEY } from '../api/patientPortal';

const PatientAuthContext = createContext(null);

export function PatientAuthProvider({ children }) {
  const [patientToken, setPatientToken]     = useState(() => localStorage.getItem(PATIENT_TOKEN_KEY));
  const [patientName,  setPatientName]      = useState(() => localStorage.getItem('patient_name') || '');

  const loginPatient = useCallback((token, firstName) => {
    localStorage.setItem(PATIENT_TOKEN_KEY, token);
    localStorage.setItem('patient_name', firstName || '');
    setPatientToken(token);
    setPatientName(firstName || '');
  }, []);

  const logoutPatient = useCallback(() => {
    localStorage.removeItem(PATIENT_TOKEN_KEY);
    localStorage.removeItem('patient_name');
    setPatientToken(null);
    setPatientName('');
  }, []);

  return (
    <PatientAuthContext.Provider value={{ patientToken, patientName, loginPatient, logoutPatient }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  return useContext(PatientAuthContext);
}
