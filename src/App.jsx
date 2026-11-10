import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import PushPrompt from './components/PushPrompt.jsx';
import Footer from './components/Footer.jsx';
import { useCart } from './context/CartContext.jsx';
import HomePage from './pages/HomePage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import TrackPage from './pages/TrackPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { notice } = useCart();
  return (
    <>
      <ScrollToTop />
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <CartDrawer />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:sku" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/thanks" element={<OrdersPage justPaid />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <div className={`toast${notice ? ' on' : ''}`} role="status">{notice}</div>
      <PushPrompt />
    </>
  );
}
