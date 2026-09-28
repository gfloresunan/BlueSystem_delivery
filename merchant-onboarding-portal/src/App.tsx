import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { OnboardingPage } from './pages/OnboardingPage';
import { StatusCheckPage } from './pages/StatusCheckPage';
import { CourierOnboardingPage } from './pages/CourierOnboardingPage';
import { CourierStatusPage } from './pages/CourierStatusPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#0B0F19]">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<OnboardingPage />} />
            <Route path="/status" element={<StatusCheckPage />} />
            <Route path="/courier" element={<CourierOnboardingPage />} />
            <Route path="/courier/status" element={<CourierStatusPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
