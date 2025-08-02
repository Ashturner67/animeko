import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../utils/api';
import '../styles/SubscriptionPage.css';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { currentUser, loading, token } = useContext(AuthContext);
  const { isDarkMode } = useTheme();
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!token) return;
      
      try {
        const response = await apiFetch('/api/subscriptions/current', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubscriptionDetails(data);
        }
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscriptionDetails();
  }, [token]);

  const handlePayment = async (plan) => {
    
    let amount;
    switch (plan.toLowerCase()) {
      case 'monthly':
        amount = 9.99;
        break;
      case 'yearly':
        amount = 99.99;
        break;
      case 'lifetime':
        amount = 299.99;
        break;
      default:
        amount = 0;
    }

    try {
      const response = await fetch('https://test-project-production-bf2e.up.railway.app/api/create-trx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '13acc245-b584-4767-b80a-5c9a1fe9d71e',
        },
        body: JSON.stringify({
          username: 'scariful',
          amount: parseFloat(amount),
        }),
      });
      console.log('Payment request sent:', { plan, amount });

      const data = await response.json();

      if (data.valid) {
        const transactionId = data.transactionid;

        // Create transaction in our backend before redirecting
        try {
          const requestBody = {
            subscriptionType: plan,
            amount: parseFloat(amount),
            transactionId: transactionId
          };
          
          console.log('Sending request to create transaction:', requestBody);
          console.log('Using token:', token ? 'Token present' : 'No token');
          
          const apiResponse = await apiFetch('/api/subscriptions/create-transaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Failed to create transaction record:', errorData.message);
            console.error('Response status:', apiResponse.status);
            console.error('Response details:', errorData);
            
            // Handle specific case where user already has subscription
            if (apiResponse.status === 400 && errorData.subscriptionDetails) {
              const validUntilText = errorData.subscriptionDetails.subscriptionType === 'Lifetime' 
                ? 'Lifetime Access' 
                : (errorData.subscriptionDetails.endDate ? new Date(errorData.subscriptionDetails.endDate).toLocaleDateString() : 'N/A');
              alert(`You already have an active subscription! 
Subscription Type: ${errorData.subscriptionDetails.subscriptionType}
Valid Until: ${validUntilText}`);
              // Refresh subscription details
              window.location.reload();
            } else {
              alert(`Failed to initialize payment: ${errorData.message}`);
            }
            return; // Stop the process if we can't record the transaction
          }
        } catch (error) {
          console.error('Error creating transaction record:', error);
          alert('An error occurred while initializing payment. Please try again.');
          return;
        }

        const redirectURL = encodeURIComponent(`${window.location.origin}/payment-confirmation?transactionId=${transactionId}`);
        const gatewayURL = `https://tpg-six.vercel.app/gateway?transactionid=${transactionId}&redirectURL=${redirectURL}`;
        window.location.href = gatewayURL; // Redirect to the payment gateway
      } else {
        console.error('Failed to create transaction:', data.message);
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('An error occurred while initiating payment. Please try again.');
    }
  };

  return (
    <div className={`subscription-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {loadingSubscription ? (
        <div className="loading-message">
          <h1>Loading...</h1>
          <p>Loading subscription details...</p>
        </div>
      ) : (
        <>
          {subscriptionDetails && subscriptionDetails.hasSubscription ? (
            <>
              <h1>Your Subscription</h1>
              <div className="subscription-message">
                <h2>Active Subscription</h2>
                <p>You already have an active subscription. Thank you for your continued support!</p>
                
                <div className="subscription-details">
                  <div className="detail-item">
                    <strong>Subscription Type:</strong>
                    <span>{subscriptionDetails.subscriptionType}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Transaction ID:</strong>
                    <span>{subscriptionDetails.transactionId}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Purchased On:</strong>
                    <span>{subscriptionDetails.purchasedOn ? new Date(subscriptionDetails.purchasedOn).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Valid Until:</strong>
                    <span>{subscriptionDetails.subscriptionType === 'Lifetime' ? 'Lifetime Access' : (subscriptionDetails.endDate ? new Date(subscriptionDetails.endDate).toLocaleDateString() : 'N/A')}</span>
                  </div>
                </div>                
              </div>
            </>
          ) : subscriptionDetails && subscriptionDetails.isExpired ? (
            <>
              <h1>Renew Your Subscription</h1>
              <div className="subscription-message expired">
                <h2>Subscription Expired</h2>
                <p>Your subscription has expired. Please renew to continue enjoying premium features.</p>
                
                <div className="subscription-details">
                  <div className="detail-item">
                    <strong>Previous Subscription:</strong>
                    <span>{subscriptionDetails.subscriptionType}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Expired On:</strong>
                    <span>{subscriptionDetails.endDate ? new Date(subscriptionDetails.endDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                
                <div className="subscription-options">
                  <div className="subscription-plan">
                    <h2>Monthly</h2>
                    <p className="price">$9.99/month</p>
                    <button onClick={() => handlePayment('monthly')}>Renew Monthly</button>
                  </div>
                  <div className="subscription-plan">
                    <h2>Yearly</h2>
                    <p className="price">$99.99/year</p>
                    <button onClick={() => handlePayment('yearly')}>Renew Yearly</button>
                  </div>
                  <div className="subscription-plan">
                    <h2>Lifetime</h2>
                    <p className="price">$299.99</p>
                    <button onClick={() => handlePayment('lifetime')}>Upgrade to Lifetime</button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1>Choose Your Subscription Plan</h1>
              <div className="subscription-options">
                <div className="subscription-plan">
                  <h2>Monthly</h2>
                  <p className="price">$9.99/month</p>
                  <button onClick={() => handlePayment('monthly')}>Continue to Payment</button>
                </div>
                <div className="subscription-plan">
                  <h2>Yearly</h2>
                  <p className="price">$99.99/year</p>
                  <button onClick={() => handlePayment('yearly')}>Continue to Payment</button>
                </div>
                <div className="subscription-plan">
                  <h2>Lifetime</h2>
                  <p className="price">$299.99</p>
                  <button onClick={() => handlePayment('lifetime')}>Continue to Payment</button>
                </div>
              </div>
            </>
          )}
          <div className="subscription-actions">
            <button onClick={() => navigate('/')} className="home-button">
              Go to Homepage
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionPage;