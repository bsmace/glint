import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { App } from './App';
import '@/styles/tailwind.css';

createRoot(document.getElementById('app')!).render(<ErrorBoundary><App /></ErrorBoundary>);
