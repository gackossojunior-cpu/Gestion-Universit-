import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EtudiantsPage from './pages/Etudiants';
import EnseignantsPage from './pages/Enseignants';
import PersonnelPage from "./pages/Personnel.jsx";
import TransactionsPage from "./pages/Transactions.jsx";
import { Layout } from './components/layout/Layout';
import { isAuthenticated } from './utils/authUtils';
import Transports, {TransportsPage} from "./pages/Transports.jsx";

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter basename="/finance">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/etudiants" element={<EtudiantsPage />} />
          <Route path="/enseignants" element={<EnseignantsPage />} />
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transports" element={<TransportsPage/>} />

        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}