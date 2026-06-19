import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StrokeViewer from './pages/StrokeViewer';
import PracticeSheet from './pages/PracticeSheet';
import BottomNav from './components/BottomNav';
import './App.css';

// Strip trailing slash so basename === "/tianzige" (not "/tianzige/"),
// which is what react-router expects.
const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <div className="app">
        <Routes>
          <Route path="/" element={<StrokeViewer />} />
          <Route path="/sheet" element={<PracticeSheet />} />
        </Routes>
        <BottomNav />
        <div className="nav-spacer" />
      </div>
    </BrowserRouter>
  );
}
