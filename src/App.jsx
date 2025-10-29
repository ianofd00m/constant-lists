import React, { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
// REMOVED: Strong animation fix for testing
// import './strong-animation-fix.css'
// REMOVED: Direct JS animation fix for testing
// import './direct-animation-fix.js'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom';
import CardSearch from './components/CardSearch';
import AuthForm from './components/AuthForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeckBuilder from './components/DeckBuilder';
import PrintingCache from './utils/PrintingCache';
import RequireAuth from './components/RequireAuth';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
// Lazy load DeckViewEdit to handle large component size
const DeckViewEdit = React.lazy(() => import('./components/DeckViewEdit'));
import Navbar from './components/Navbar';
import ResearchPage from './components/ResearchPage';
import { BuildPageWithAuth } from './components/BuildPage';
import CollectPage from './components/CollectPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import EmailVerification from './components/EmailVerification';
import ResetPassword from './components/ResetPassword';
import TradePage from './components/TradePage';
import TradeManagementPage from './components/TradeManagementPage';
import ShoppingCart from './components/ShoppingCart';
import WishlistPage from './components/WishlistPage';

function HomePage() {
  return (
    <div className="container">
      <h1>Constant Lists</h1>
      <p>Welcome to Constant Lists! This is your Magic: The Gathering deck-building and collection hub.</p>
      <ul>
        <li>Research cards</li>
        <li>Build and manage decks</li>
        <li>Track your collection</li>
        <li>Advanced security and privacy features</li>
      </ul>
    </div>
  );
}

function OAuthSuccess() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    setToken(t);
    if (t) {
      localStorage.setItem('token', t);
      setTimeout(() => navigate('/profile'), 2000); // Delay redirect for debug
    }
  }, []); // Remove navigate dependency to prevent infinite loops
  return (
    <div className="container">
      <h2>OAuth Success Debug</h2>
      <div>Token: {token ? token : 'No token found in URL params'}</div>
      <div>{token ? 'Redirecting to profile in 2 seconds...' : 'Waiting for token...'}</div>
    </div>
  );
}

function App() {
  console.log('🔍 RENDER: App component rendering');
  
  // INSTANT LOADING: Start preloading common cards as soon as app loads
  useEffect(() => {
    // Small delay to let the app finish initial rendering
    const timer = setTimeout(() => {
      PrintingCache.preloadCommonCards().catch(error => {
        console.warn('[App] Background preload of common cards failed (non-critical):', error);
      });
    }, 1000); // 1 second delay
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const preventSpaceScroll = (e) => {
      if ((e.key === ' ' || e.key === 'Spacebar')) {
        const el = document.activeElement;
        const isTextInput = el && (
          el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable
        );
        if (!isTextInput) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', preventSpaceScroll, { capture: true });
    return () => window.removeEventListener('keydown', preventSpaceScroll, { capture: true });
  }, []);

  const [count, setCount] = useState(0)

  return (
    <Router>
      <Navbar />
      <div className="content-container">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/build" element={<BuildPageWithAuth />} />
          <Route path="/collect" element={<CollectPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/trade/new" element={<TradeManagementPage isNew={true} />} />
          <Route path="/trades/:tradeId" element={<TradeManagementPage />} />
          <Route path="/shopping-cart" element={<ShoppingCart />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/search" element={<CardSearch />} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/deck-builder" element={
          <RequireAuth>
            <div className="container"><h2>Deck Builder Page</h2><DeckBuilder /></div>
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <div className="container"><h2>Profile Page</h2><Profile /></div>
          </RequireAuth>
        } />
        <Route path="/admin" element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        } />
        <Route path="/decks/:id" element={
          <React.Suspense fallback={
            <div style={{padding: '2rem', textAlign: 'center'}}>
              <h2>Loading Deck Editor...</h2>
              <p>Loading the deck editor (this may take a moment due to its size)</p>
            </div>
          }>
            <DeckViewEdit />
          </React.Suspense>
        } />
        <Route path="/public/decks/:id" element={
          <React.Suspense fallback={
            <div style={{padding: '2rem', textAlign: 'center'}}>
              <h2>Loading Public Deck...</h2>
              <p>Loading the public deck view (read-only)</p>
            </div>
          }>
            <DeckViewEdit isPublic={true} />
          </React.Suspense>
        } />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="*" element={<h2 style={{textAlign:'center',marginTop:40}}>404 – Page Not Found</h2>} />
      </Routes>
      <ToastContainer position="top-center" autoClose={2000} />
      </div>
    </Router>
  )
}

export default App
