import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { apiFetch } from '../utils/api';

/**
 * A protected route component that ensures a user has an active subscription.
 * It verifies the subscription status with the backend in real-time.
 * If the subscription is not active, it redirects the user to the subscription page.
 *
 * @example
 * // In App.jsx
 * <Route
 *   path="/premium-feature"
 *   element={
 *     <SubscriptionProtectedRoute>
 *       <PremiumFeaturePage />
 *     </SubscriptionProtectedRoute>
 *   }
 * />
 */
const SubscriptionProtectedRoute = ({ children }) => {
  const { currentUser, token, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { setAlert } = useAlert();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Don't run verification until the initial auth status is resolved
    if (loading) {
      return;
    }

    // If there's no user or token, they should be logged in first.
    if (!token || !currentUser) {
      setAlert('You must be logged in to access this page.', 'error');
      navigate('/login');
      return;
    }

    const verifyAccess = async () => {
      try {
        // This is a lightweight endpoint that is protected by both `authenticate`
        // and `requireSubscription` middlewares. Its only purpose is to check access.
        const response = await apiFetch('/api/premium-content-check', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          // User has access
          setIsVerified(true);
        } else if (response.status === 403) {
          // User's subscription is invalid/expired
          setAlert('Your subscription has expired. Please renew to access this content.', 'warning');
          navigate('/subscription');
        } else {
          // Handle other errors (e.g., 401 Unauthorized, 500 Server Error)
          const errorData = await response.json();
          setAlert(errorData.message || 'An error occurred while verifying your access.', 'error');
          navigate('/');
        }
      } catch (error) {
        setAlert('Could not connect to the server to verify your subscription.', 'error');
        navigate('/');
      }
    };

    verifyAccess();

  }, [token, currentUser, loading, navigate, setAlert]);

  // While authentication is loading or subscription is being verified, show a loading message.
  if (loading || !isVerified) {
    return <div>Verifying your subscription...</div>;
  }

  // If verification is successful, render the child component (the premium page).
  return children;
};

export default SubscriptionProtectedRoute;
