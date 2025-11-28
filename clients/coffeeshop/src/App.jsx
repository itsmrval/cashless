import React, { useState, useEffect } from 'react';
import products from './element.json';
import io from 'socket.io-client';
import logo from './logo.png';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:8001';

function App() {
  const [socket, setSocket] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(3);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sugarLevel, setSugarLevel] = useState(2);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isPreparingDrink, setIsPreparingDrink] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationStep, setPreparationStep] = useState(0);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [newBalanceAmount, setNewBalanceAmount] = useState(0);
  const [showDrinkReadyAnimation, setShowDrinkReadyAnimation] = useState(false);
  const [showPaymentRejectedAnimation, setShowPaymentRejectedAnimation] = useState(false);
  const [rejectedAmount, setRejectedAmount] = useState(0);
  const [rejectedBalance, setRejectedBalance] = useState(0);
  const [showCardErrorAnimation, setShowCardErrorAnimation] = useState(false);
  const [cardErrorMessage, setCardErrorMessage] = useState('');
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showProcessingPayment, setShowProcessingPayment] = useState(false);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      timeout: 3000,
      forceNew: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setApiConnected(true);
      setApiError(null);
      setIsInitializing(false);
    });

    newSocket.on('card_inserted', (data) => {
      if (data.card_id && data.card_id !== null) {
        setUser({ name: `Carte ${data.card_id.substring(0, 8)}`, cardId: data.card_id });
        setBalance(0);
        setPinAttempts(3);
        setIsCardBlocked(false);

        if (data.activated === false) {
          setCardErrorMessage("PIN non défini.\nActivez votre carte à la borne ATM.");
          setShowCardErrorAnimation(true);
          setShowPinModal(false);
        } else {
          setShowPinModal(true);
        }
      }
    });

    newSocket.on('pin_verification_result', (result) => {
      setIsVerifyingPin(false);

      if (result.success) {
        setIsPinVerified(true);
        setShowPinModal(false);
        setPin('');
        setPinAttempts(3);

        if (result.user) {
          setUser({
            name: result.user.name,
            cardId: result.user.card_id
          });
          setBalance(result.user.balance);

          const requestBalance = () => {
            if (newSocket && newSocket.connected) {
              newSocket.emit('get_balance');
            }
          };

          requestBalance();
          newSocket.balanceAutoUpdate = true;
        }
      } else if (result.blocked) {
        setIsCardBlocked(true);
        setPinAttempts(0);
        setMessageType('error');
        setMessage('Carte bloquée ! 0 tentative restante. Contactez un administrateur.');
      } else if (result.attempts_remaining !== undefined && result.attempts_remaining !== null) {
        setPinAttempts(result.attempts_remaining);
        setPin('');
        setMessageType('error');
        setMessage(`Code PIN incorrect ! ${result.attempts_remaining} tentative(s) restante(s).`);
        setTimeout(() => setMessage(''), 3000);
      } else if (result.error) {
        if (result.error.includes('inactive') || result.error.includes('bloquée') || result.error.includes('bloquee')) {
          setCardErrorMessage(result.error);
          setShowCardErrorAnimation(true);
          setShowPinModal(false);

          setTimeout(() => {
            setShowCardErrorAnimation(false);
            setShowPinModal(true);
            setPin('');
          }, 4000);
        } else {
          setMessageType('error');
          setMessage(`Erreur: ${result.error}`);
          setTimeout(() => setMessage(''), 3000);
        }
      }
    });

    newSocket.on('card_removed', (data) => {
      if (newSocket.balanceAutoUpdate) {
        newSocket.balanceAutoUpdate = false;
      }

      setUser(null);
      setBalance(0);
      setIsPinVerified(false);
      setPinAttempts(3);
      setIsCardBlocked(false);
      setIsVerifyingPin(false);
      setSelectedProduct(null);
      setShowPinModal(false);
      setShowCardErrorAnimation(false);
      setShowConfirmation(false);
      setSugarLevel(2);
      setPin('');
      setMessage('');
      setMessageType('info');
      setPendingProduct(null);
      setShowPaymentAnimation(false);
      setShowPaymentRejectedAnimation(false);
      setIsPreparingDrink(false);
      setShowDrinkReadyAnimation(false);
    });

    newSocket.on('balance_result', (result) => {
      if (result.success) {
        setBalance(result.balance);
      }

      if (newSocket.balanceAutoUpdate) {
        setTimeout(() => {
          if (newSocket && newSocket.connected && newSocket.balanceAutoUpdate) {
            newSocket.emit('get_balance');
          }
        }, 1000);
      }
    });

    newSocket.on('disconnect', (reason) => {
      setApiConnected(false);
      if (reason === 'io server disconnect') {
        setApiError('Le serveur a fermé la connexion');
      } else {
        setApiError('Connexion perdue avec le serveur');
      }
    });

    newSocket.on('connect_error', (error) => {
      setApiConnected(false);
      setApiError('Impossible de se connecter au serveur');
      setIsInitializing(false);
    });

    return () => {
      if (newSocket) {
        newSocket.close();
      }
      setSocket(null);
    };
  }, []);

  const handleProductClick = (product) => {
    if (!user) {
      setMessageType('info');
      setMessage('Veuillez insérer votre carte');
      return;
    }
    if (!isPinVerified) {
      setMessageType('info');
      setMessage('Veuillez d\'abord saisir votre code PIN');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (balance < product.price) {
      setRejectedAmount(product.price);
      setRejectedBalance(balance);
      setShowPaymentRejectedAnimation(true);

      setTimeout(() => {
        setShowPaymentRejectedAnimation(false);
      }, 3000);
    } else {
      setSelectedProduct(product);
      setSugarLevel(2);
      setShowConfirmation(true);
    }
  };

  const handlePayment = () => {
    if (pin.length !== 4) {
      setMessageType('error');
      setMessage('Code PIN invalide (4 chiffres requis)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    if (isCardBlocked) {
      setMessageType('error');
      setMessage('Carte bloquée ! Contactez un administrateur.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    if (!isPinVerified && !selectedProduct) {
      setIsVerifyingPin(true);

      if (socket && socket.connected) {
        socket.emit('verify_pin', { pin });
      } else {
        setIsVerifyingPin(false);
        setMessageType('error');
        setMessage('Erreur: Socket non connecté');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const handleConfirmOrder = () => {
    setShowConfirmation(false);
    processPaymentForProduct(selectedProduct);
  };

  const processPaymentForProduct = (product) => {
    setShowProcessingPayment(true);

    if (socket && socket.connected) {
      setPaymentAmount(product.price);

      socket.once('transaction_result', (result) => {
        if (result.success) {
          setBalance(result.new_balance);
          setNewBalanceAmount(result.new_balance);

          setTimeout(() => {
            setShowProcessingPayment(false);
            setShowPaymentAnimation(true);

            setTimeout(() => {
              setShowPaymentAnimation(false);
              setIsPreparingDrink(true);
              setPreparationProgress(0);
              setPreparationStep(0);

              const totalDuration = 6000;
              const stepDuration = 2000;
              const steps = ['Chauffage de l\'eau...', 'Préparation de votre boisson...', 'Distribution en cours...'];

              const interval = 50;
              const totalSteps = totalDuration / interval;
              let currentStep = 0;

              const progressInterval = setInterval(() => {
                currentStep++;
                const progress = (currentStep / totalSteps) * 100;
                setPreparationProgress(progress);

                const currentStepIndex = Math.floor((currentStep * interval) / stepDuration);
                if (currentStepIndex < steps.length) {
                  setPreparationStep(currentStepIndex);
                }

                if (currentStep >= totalSteps) {
                  clearInterval(progressInterval);
                  setIsPreparingDrink(false);
                  setSelectedProduct(null);
                  setPreparationStep(0);

                  setShowDrinkReadyAnimation(true);
                  setTimeout(() => {
                    setShowDrinkReadyAnimation(false);
                  }, 3000);
                }
              }, interval);
            }, 2500);
          }, 1500);

        } else {
          setShowProcessingPayment(false);
          setIsPreparingDrink(false);
          setSelectedProduct(null);

          setRejectedAmount(product.price);
          setRejectedBalance(result.new_balance || balance);

          setShowPaymentRejectedAnimation(true);

          setTimeout(() => {
            setShowPaymentRejectedAnimation(false);
          }, 3000);
        }
      });

      socket.emit('create_transaction', {
        amount: product.price,
        merchant: 'CoffeeShop'
      });

    } else {
      setShowProcessingPayment(false);
      setMessageType('error');
      setMessage('Erreur: connexion perdue');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {!apiConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slideDown pointer-events-none">
            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-scaleIn">
                  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lecteur indisponible</h2>

              <div className="mb-4">
                <p className="text-lg text-gray-700 mb-1">{apiError || 'Connexion au serveur impossible'}</p>
                <p className="text-sm text-gray-500">Reconnexion au lecteur en cours...</p>
              </div>

              <div className="w-full h-px bg-gray-200 my-4"></div>

              <div>
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {user && user.name && isPinVerified && (
        <div className="fixed top-6 right-6 z-[60] bg-white border-3 border-black rounded-xl shadow-lg px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">{user.name}</p>
              <p className="text-xl font-bold text-gray-900">{balance.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      )}

      {!user ? (
        <div className="min-h-screen flex items-center">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
              <div className="space-y-8">
                <div>
                  <h2 className="text-5xl font-bold text-gray-800 mb-4">En attente de carte</h2>
                  <p className="text-2xl text-gray-600 mb-6">Veuillez insérer votre carte dans le lecteur</p>
                  <div className="flex items-center space-x-2 text-gray-700 mb-8">
                    <div className="w-3 h-3 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-gray-900 font-bold mr-3">1.</span>
                      <span className="font-medium">Insérez votre carte bancaire dans la fente du TPE</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-900 font-bold mr-3">2.</span>
                      <span className="font-medium">Assurez-vous que la puce est orientée vers le haut</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-900 font-bold mr-3">3.</span>
                      <span className="font-medium">Poussez complètement la carte jusqu'au fond</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <svg width="350" height="500" viewBox="0 0 350 500" className="drop-shadow-2xl">
                    <defs>
                      <linearGradient id="readerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#374151', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#1f2937', stopOpacity: 1 }} />
                      </linearGradient>
                      <linearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#f8fafc', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#e2e8f0', stopOpacity: 1 }} />
                      </linearGradient>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
                      </filter>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    <rect x="25" y="50" width="300" height="400" rx="15" fill="url(#readerGradient)" filter="url(#shadow)"/>
                    <rect x="25" y="50" width="300" height="400" rx="15" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="50" y="80" width="250" height="180" rx="8" fill="url(#screenGradient)" stroke="#cbd5e1" strokeWidth="2"/>
                    <rect x="50" y="80" width="250" height="60" rx="8" fill="white" opacity="0.3"/>
                    <g transform="translate(175, 110)">
                      <rect x="-30" y="-20" width="60" height="40" rx="5" fill="#94a3b8" opacity="0.4"/>
                      <rect x="-20" y="-10" width="20" height="15" rx="2" fill="#64748b"/>
                    </g>
                    <text x="175" y="185" textAnchor="middle" fill="#1e293b" fontSize="22" fontWeight="bold">
                      INSÉREZ
                    </text>
                    <text x="175" y="215" textAnchor="middle" fill="#334155" fontSize="22" fontWeight="bold">
                      VOTRE CARTE
                    </text>
                    <text x="175" y="245" textAnchor="middle" fill="#64748b" fontSize="14" opacity="0.8">
                      ▼ Puce vers le haut ▼
                    </text>
                    <g>
                      <rect x="70" y="298" width="210" height="14" rx="7" fill="#000000" opacity="0.5"/>
                      <rect x="70" y="295" width="210" height="14" rx="7" fill="#0f172a" stroke="#1e293b" strokeWidth="2"/>
                      <rect x="70" y="295" width="210" height="4" rx="2" fill="#475569" opacity="0.5"/>
                    </g>
                    
                    <circle cx="175" cy="340" r="8" fill="#22c55e" opacity="0.8" filter="url(#glow)">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <text x="175" y="365" textAnchor="middle" fill="#6b7280" fontSize="12">PRÊT</text>
                    
                    <text x="175" y="395" textAnchor="middle" fill="#9ca3af" fontSize="16" fontWeight="bold" opacity="0.5">
                      Cashless Café
                    </text>
                    
                    <clipPath id="cardSlotClip">
                      <rect x="70" y="0" width="210" height="302"/>
                    </clipPath>
                  </svg>

                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {message && (messageType === 'success' || messageType === 'error') && (
            <div className="fixed top-28 right-6 z-[100] max-w-md animate-slideRight">
              <div className={`p-4 rounded-xl font-semibold shadow-2xl border-2 ${
                messageType === 'success' ? 'bg-green-50 text-green-700 border-green-300' : 
                messageType === 'error' ? 'bg-red-50 text-red-700 border-red-300' :
                'bg-gray-50 text-gray-700 border-gray-300'
              }`}>
                {message}
              </div>
            </div>
          )}

          {message && messageType === 'info' && !showPinModal && (
            <div className="container mx-auto px-6 mt-28">
              <div className="p-4 rounded-xl text-center font-semibold shadow-lg border-2 bg-blue-50 text-blue-700 border-blue-300">
                {message}
              </div>
            </div>
          )}

          <div className="fixed top-6 left-6 z-50">
            <img src={logo} alt="Logo" className="h-20 md:h-24 object-contain" />
          </div>

          <main className="container mx-auto px-6 pt-24 flex items-center justify-center min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl w-full">
              {products.map((product, index) => (
                <div 
                  key={index}
                  onClick={() => handleProductClick(product)}
                  className="bg-white border-3 border-black rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden h-40"
                >
                  <div className="flex items-stretch h-full">
                    <div className="w-2/5 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.lang.fr}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="w-3/5 p-4 flex flex-col justify-between bg-white">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {product.lang.fr}
                        </h3>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {product.composition && product.composition.map((ingredient, idx) => (
                            <p key={idx} className="ml-2">• {ingredient}</p>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-2xl font-bold text-gray-900">
                          {product.price.toFixed(1)}€
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>

          {showProcessingPayment && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slideDown">
                <div className="text-center">
                  <div className="relative mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="animate-spin">
                        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement en cours</h2>
                  <p className="text-lg text-gray-700 mb-4">Validation du paiement...</p>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Montant</p>
                    <p className="text-3xl font-bold text-gray-900">{paymentAmount.toFixed(2)}€</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showPaymentAnimation && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-slideDown">
                <div className="text-center">
                  <div className="relative mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center animate-scaleIn">
                      <svg className="w-16 h-16 text-gray-900 animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi</h2>

                  <div className="mb-4">
                    <p className="text-3xl font-bold text-red-600 mb-1">-{paymentAmount.toFixed(2)}€</p>
                    <p className="text-sm text-gray-500">Montant débité</p>
                  </div>

                  <div className="w-full h-px bg-gray-200 my-4"></div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Nouveau solde</p>
                    <p className="text-2xl font-bold text-gray-900">{newBalanceAmount.toFixed(2)}€</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showPaymentRejectedAnimation && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-slideDown">
                <div className="text-center">
                  <div className="relative mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-scaleIn">
                      <svg className="w-16 h-16 text-red-600 animate-shake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Solde insuffisant</h2>

                  <div className="mb-4">
                    <p className="text-3xl font-bold text-red-600 mb-1">{rejectedAmount.toFixed(2)}€</p>
                    <p className="text-sm text-gray-500">Montant requis</p>
                  </div>

                  <div className="w-full h-px bg-gray-200 my-4"></div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Solde disponible</p>
                    <p className="text-2xl font-bold text-gray-900">{rejectedBalance.toFixed(2)}€</p>
                  </div>

                  <div className="mt-6 bg-red-50 border-3 border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 font-medium">
                      Veuillez recharger votre compte
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCardErrorAnimation && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slideDown">
                <div className="text-center">
                  <div className="relative mb-6 flex justify-center">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8 rounded-2xl inline-block">
                      <svg className="w-16 h-16 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Carte inactive</h2>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-6 mb-6">
                    <p className="text-gray-900 font-semibold text-lg mb-2">
                      Authentification refusée
                    </p>
                    <p className="text-gray-700 whitespace-pre-line">
                      {cardErrorMessage || "Cette carte n'est pas autorisée à s'authentifier"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDrinkReadyAnimation && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-slideDown">
                <div className="text-center">
                  <div className="relative mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center animate-scaleIn">
                      <svg className="w-16 h-16 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre boisson est prête !</h2>
                  <p className="text-lg text-gray-600 mb-4">Bon appétit !</p>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-4">
                    <p className="text-sm text-gray-900 font-medium">
                      Récupérez votre boisson au distributeur
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPreparingDrink && selectedProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slideDown">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Préparation en cours</h2>
                  <p className="text-lg text-gray-700 font-semibold mb-6">Votre café est en cours de préparation...</p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-6">
                    <div 
                      className="bg-gray-900 h-full rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${preparationProgress}%` }}
                    >
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 space-y-3">
                    {['Chauffage de l\'eau...', 'Préparation de votre boisson...', 'Distribution en cours...'].map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          index < preparationStep ? 'bg-gray-900' : 
                          index === preparationStep ? 'bg-gray-900 animate-pulse' : 
                          'bg-gray-300'
                        }`}>
                          {index < preparationStep && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-left font-medium ${
                          index <= preparationStep ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showConfirmation && selectedProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-6 max-w-md w-full animate-slideDown">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.lang.fr}</h2>
                  <p className="text-3xl font-bold text-gray-900">{selectedProduct.price.toFixed(1)}€</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">Niveau de sucre</label>
                    <span className="text-2xl font-bold text-gray-900">{sugarLevel}</span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={sugarLevel}
                      onChange={(e) => setSugarLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #111827 0%, #111827 ${(sugarLevel / 4) * 100}%, #e5e7eb ${(sugarLevel / 4) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-3">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <button
                          key={level}
                          onClick={() => setSugarLevel(level)}
                          className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                            sugarLevel === level 
                              ? 'bg-gray-900 text-white scale-110' 
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Sans</span>
                      <span>Max</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmation(false);
                      setSelectedProduct(null);
                      setSugarLevel(2);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmOrder();
                    }}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPinModal && !selectedProduct && user && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className={`bg-gradient-to-br rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slideDown ${
                isCardBlocked 
                  ? 'from-white to-red-50 border-3 border-red-400' 
                  : 'from-white to-gray-50 border-3 border-black'
              }`}>
                <div className="text-center mb-6">
                  <div className={`bg-gradient-to-br p-6 rounded-full inline-block mb-4 ${
                    isCardBlocked
                      ? 'from-red-100 to-red-200'
                      : 'from-gray-100 to-gray-200'
                  }`}>
                    {isCardBlocked ? (
                      <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : isVerifyingPin ? (
                      <div className="animate-spin">
                        <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    ) : (
                      <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isCardBlocked ? 'Carte bloquée' : 'Vérification du code PIN'}
                  </h2>
                  <p className={`text-gray-600 ${
                    isCardBlocked ? 'font-semibold text-red-600' : ''
                  }`}>
                    {isCardBlocked 
                      ? 'reférez-vous à un ATM pour débloquer votre carte' 
                      : 'Entrez votre code PIN à 4 chiffres'}
                  </p>
                  {!isCardBlocked && (
                    <div className="mt-3">
                      <p className={`text-sm font-bold ${
                        pinAttempts === 1 ? 'text-red-600' : 
                        pinAttempts === 2 ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {pinAttempts} tentative(s) restante(s)
                      </p>
                    </div>
                  )}
                </div>
                {!isCardBlocked && (
                  <>
                    <input
                      type="password"
                      maxLength="4"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      disabled={isVerifyingPin}
                      className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-xl py-4 mb-6 focus:border-gray-900 focus:ring-4 focus:ring-gray-200 focus:outline-none transition-all tracking-widest disabled:bg-gray-100 disabled:cursor-not-allowed"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && pin.length === 4 && !isVerifyingPin) {
                          handlePayment();
                        }
                      }}
                    />

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayment();
                        }}
                        disabled={pin.length !== 4 || isVerifyingPin}
                        className={`w-full font-bold py-4 rounded-xl transition-all text-lg shadow-lg ${
                          pin.length !== 4 || isVerifyingPin
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-xl transform hover:scale-105'
                        }`}
                      >
                        {isVerifyingPin ? 'Vérification...' : 'Valider le code PIN'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPinModal(false);
                          setPin('');
                          setUser(null);
                          setBalance(0);
                        }}
                        disabled={isVerifyingPin}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                )}
                {isCardBlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPinModal(false);
                      setPin('');
                      setUser(null);
                      setBalance(0);
                      setIsCardBlocked(false);
                    }}
                    className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 rounded-xl transition-all border-2 border-red-200 hover:border-red-300"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          )}
          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 shadow-lg z-10">
            <div className="container mx-auto px-6 text-center">
              <p className="text-gray-500 text-sm font-medium">Distributeur automatique • Cashless Café</p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
