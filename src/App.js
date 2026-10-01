import React, { useState } from 'react';
import LandingPage from './LandingPage';
import MapView from './MapView';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  const handleGetStarted = () => {
    setCurrentPage('map');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  return (
    <div className="app">
      {currentPage === 'landing' ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <MapView onBackToLanding={handleBackToLanding} />
      )}
    </div>
  );
}

export default App;
