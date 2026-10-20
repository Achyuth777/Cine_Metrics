import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import OverviewPage from './pages/OverviewPage';
import MovieExplorerPage from './pages/MovieExplorerPage';
import GenreAnalyticsPage from './pages/GenreAnalyticsPage';
import RatingIntelligencePage from './pages/RatingIntelligencePage';
import HadoopMonitorPage from './pages/HadoopMonitorPage';
import ArchitecturePage from './pages/ArchitecturePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/movies" element={<MovieExplorerPage />} />
          <Route path="/genres" element={<GenreAnalyticsPage />} />
          <Route path="/ratings" element={<RatingIntelligencePage />} />
          <Route path="/hadoop" element={<HadoopMonitorPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
