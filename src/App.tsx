import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { CaseLibraryPage } from './pages/CaseLibraryPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { ResearchReportsPage } from './pages/ResearchReportsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new-analysis" element={<NewAnalysisPage />} />
          <Route path="/analysis-results" element={<AnalysisResultsPage />} />
          <Route path="/case-library" element={<CaseLibraryPage />} />
          <Route path="/research-reports" element={<ResearchReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;

