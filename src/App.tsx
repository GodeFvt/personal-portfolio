import { BrowserRouter } from 'react-router-dom';
import AppShell from './components/AppShell';
import './style.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
