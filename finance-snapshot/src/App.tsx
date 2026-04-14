import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { ToastContainer } from './components/Toast';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </Layout>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
