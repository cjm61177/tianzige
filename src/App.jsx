import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StrokeViewer from './pages/StrokeViewer';
import PracticeSheet from './pages/PracticeSheet';
import BottomNav from './components/BottomNav';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
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
