import { useLocation, useNavigate } from 'react-router-dom';
import { IconStrokeViewer, IconSheet } from './Icons';

const TABS = [
  { path: '/', label: '笔画学习', Icon: IconStrokeViewer },
  { path: '/sheet', label: '练习纸', Icon: IconSheet },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        const { Icon } = tab;
        return (
          <button
            key={tab.path}
            className={`bottom-nav-btn${active ? ' active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="bottom-nav-icon">
              <Icon size={22} />
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
