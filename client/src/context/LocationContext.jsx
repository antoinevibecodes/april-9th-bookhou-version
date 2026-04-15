import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocationState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    api.get('/locations')
      .then((data) => {
        const locs = Array.isArray(data) ? data : (data.data || data.locations || []);
        setLocations(locs);

        const savedId = localStorage.getItem('bookhou_location');
        const saved = locs.find((l) => String(l.id) === savedId);
        if (saved) {
          setActiveLocationState(saved);
        } else if (locs.length > 0) {
          setActiveLocationState(locs[0]);
          localStorage.setItem('bookhou_location', String(locs[0].id));
        }
      })
      .catch(() => {
        setLocations([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const setActiveLocation = useCallback((location) => {
    setActiveLocationState(location);
    if (location) {
      localStorage.setItem('bookhou_location', String(location.id));
    } else {
      localStorage.removeItem('bookhou_location');
    }
  }, []);

  return (
    <LocationContext.Provider value={{ locations, activeLocation, setActiveLocation, loading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export default LocationContext;
