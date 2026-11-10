import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { OrderAlertsProvider } from './context/OrderAlertsContext.jsx';
import './styles/storefront.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsProvider>
          <CartProvider>
            <AuthProvider>
              <OrderAlertsProvider>
                <App />
              </OrderAlertsProvider>
            </AuthProvider>
          </CartProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
