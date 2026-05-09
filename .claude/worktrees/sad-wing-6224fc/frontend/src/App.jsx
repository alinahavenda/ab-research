import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useVariant } from './hooks/useVariant';

// Version A pages
import A01_Search        from './pages/version-a/A01_Search';
import A02_Results       from './pages/version-a/A02_Results';
import A03_Seat          from './pages/version-a/A03_Seat';
import A04_PassengerForm from './pages/version-a/A04_PassengerForm';
import A05_Confirmation  from './pages/version-a/A05_Confirmation';

// Version B pages
import B01_Search           from './pages/version-b/B01_Search';
import B02_ResultsWithSeat  from './pages/version-b/B02_ResultsWithSeat';
import B03_PassengerForm    from './pages/version-b/B03_PassengerForm';
import B04_Confirmation     from './pages/version-b/B04_Confirmation';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

function Root() {
  const { variant } = useVariant();
  return <Navigate to={variant === 'A' ? '/version-a/search' : '/version-b/search'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />

        {/* Version A */}
        <Route path="/version-a/search"         element={<A01_Search />} />
        <Route path="/version-a/results"        element={<A02_Results />} />
        <Route path="/version-a/seat"           element={<A03_Seat />} />
        <Route path="/version-a/passenger"      element={<A04_PassengerForm />} />
        <Route path="/version-a/confirmation"   element={<A05_Confirmation />} />

        {/* Version B */}
        <Route path="/version-b/search"         element={<B01_Search />} />
        <Route path="/version-b/results"        element={<B02_ResultsWithSeat />} />
        <Route path="/version-b/passenger"      element={<B03_PassengerForm />} />
        <Route path="/version-b/confirmation"   element={<B04_Confirmation />} />

        {/* Analytics dashboard — public, no auth required */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
