import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme
import { apiFetch } from '../utils/api';
import '../styles/PaymentConfirmationPage.css';

const PaymentConfirmationPage = () => {
  const [status, setStatus] = useState('pending');
  const [transactionDetails, setTransactionDetails] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const transactionId = new URLSearchParams(location.search).get('transactionId');
  const { isDarkMode } = useTheme(); // Get dark mode state""

  useEffect(() => {
    const pollStatus = async () => {
      if (!transactionId) {
        setStatus('failed');
        return;
      }

      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 3000; // Poll every 3 seconds

      const intervalId = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(intervalId);
          setStatus('failed');
          console.error('Max polling attempts reached. Transaction status unknown.');
          return;
        }

        try {
          const response = await fetch(`https://test-project-production-bf2e.up.railway.app/api/get-trx-details/${transactionId}`, {
            headers: {
              'apikey': '13acc245-b584-4767-b80a-5c9a1fe9d71e',
            },
          });

          const data = await response.json();

          if (data.valid) {
            setTransactionDetails(data.transactionDetails);
            if (data.transactionDetails.status && data.transactionDetails.status.toLowerCase().trim() === 'completed') {
              setStatus('success');
              clearInterval(intervalId);

              // Confirm payment with our backend
              try {
                const confirmResponse = await apiFetch('/api/subscriptions/confirm-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transactionId: transactionId,
                    isPaid: true,
                    completedOn: data.transactionDetails.completed_on,
                  }),
                });

                if (!confirmResponse.ok) {
                  const errorData = await confirmResponse.json();
                  console.error('Failed to confirm payment with backend:', errorData.message);
                  // Optionally, handle this error in the UI
                }
              } catch (error) {
                console.error('Error confirming payment with backend:', error);
              }

            } else if (data.transactionDetails.status && data.transactionDetails.status.toLowerCase().trim() === 'failed') {
              setStatus('failed');
              clearInterval(intervalId);
            }
          } else {
            console.error('Failed to get transaction details:', data.message);
            // Keep polling or set to failed if a specific error indicates it
          }
        } catch (error) {
          console.error('Error polling transaction status:', error);
          // Keep polling or set to failed if a specific error indicates it
        }
      }, pollInterval);

      return () => clearInterval(intervalId);
    };

    pollStatus();
  }, [transactionId]);

  return (
    <div className={`payment-confirmation-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {status === 'pending' && (
        <div className="pending-container">
          <h2>Processing your payment...</h2>
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
          {transactionDetails && (
            <p>Status: {transactionDetails.status}</p>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="success-container">
          <h2>Payment Successful!</h2>
          <p>Thank you for your purchase. Your subscription is now active.</p>
          {transactionDetails && (
            <>
              <p>Recipient: {transactionDetails.recipient}</p>
              <p>Amount: ${transactionDetails.subamount}</p>
              <p>Fees: ${transactionDetails.feesamount}</p>
              <p>Completed On: {new Date(transactionDetails.completed_on).toLocaleString()}</p>
            </>
          )}
          <div className="action-buttons">
            <button 
              onClick={() => navigate('/')} 
              className="home-button"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="failed-container">
          <h2>Payment Failed</h2>
          <p>Unfortunately, we were unable to process your payment. Please try again.</p>
          {transactionDetails && (
            <p>Status: {transactionDetails.status}</p>
          )}
          <div className="action-buttons">
            <button 
              onClick={() => navigate('/subscription')} 
              className="retry-button"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="home-button"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentConfirmationPage;