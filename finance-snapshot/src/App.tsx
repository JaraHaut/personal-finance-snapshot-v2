import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-danger)' }}>
        The app encountered an unrecoverable error. Please refresh the page.
      </div>
    }>
      <AppProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              } />
              <Route path="/transactions" element={
                <ErrorBoundary>
                  <Transactions />
                </ErrorBoundary>
              } />
            </Routes>
          </Layout>
          <ToastContainer />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
