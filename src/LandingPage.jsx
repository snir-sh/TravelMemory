import React from 'react';
import { MapPin, Compass, Share2, TrendingUp } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <MapPin size={32} />
            <span>TrailMap</span>
          </div>
          <button className="get-started-btn" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Map Your Adventures</h1>
          <p>Track every trail you've hiked and every place you've traveled</p>
          <button className="cta-button" onClick={onGetStarted}>
            Start Mapping
            <Compass size={20} />
          </button>
        </div>
        <div className="hero-illustration">
          <div className="map-preview">
            <div className="map-marker"></div>
            <div className="map-path"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MapPin />
            </div>
            <h3>Mark Locations</h3>
            <p>Add text-based locations and watch them appear on your map instantly</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <TrendingUp />
            </div>
            <h3>Visualize Journeys</h3>
            <p>See your hiking routes and travel paths as polygons and markers</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Compass />
            </div>
            <h3>Explore</h3>
            <p>Navigate and explore all your adventures in one interactive map</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Share2 />
            </div>
            <h3>Share Your Stories</h3>
            <p>Share your adventure map with friends and fellow travelers</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 TrailMap. Track your travels, one adventure at a time.</p>
      </footer>
    </div>
  );
}
