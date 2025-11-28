import React, { useState, useEffect, useCallback } from 'react';
import fuels from './fuels.json';
import io from 'socket.io-client';
import logo from './logo.png';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://localhost:8001';

const PRESET_AMOUNTS = [10, 20, 30, 50, 80, 100];

function App() {
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(3);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  
  const [showCardErrorAnimation, setShowCardErrorAnimation] = useState(false);
  const [cardErrorMessage, setCardErrorMessage] = useState('');
  const [showProcessingPayment, setShowProcessingPayment] = useState(false);

  const [selectedFuel, setSelectedFuel] = useState(null);
  const [liters, setLiters] = useState('');
  const [isFueling, setIsFueling] = useState(false);
  const [fuelingProgress, setFuelingProgress] = useState(0);
  const [currentLiters, setCurrentLiters] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [fuelingIntervalRef, setFuelingIntervalRef] = useState(null);

  const [paymentMode, setPaymentMode] = useState('full');
  const [selectedPresetAmount, setSelectedPresetAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [preAuthAmount, setPreAuthAmount] = useState(0);
  const [isPreAuthActive, setIsPreAuthActive] = useState(false);
  const [showAmountSelector, setShowAmountSelector] = useState(false);

  const [tpeInput, setTpeInput] = useState('');
  const [tpeMode, setTpeMode] = useState('idle');
  const [tpeMessage, setTpeMessage] = useState('');

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [newBalanceAmount, setNewBalanceAmount] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      timeout: 3000,
      forceNew: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      setApiError(null);
      setIsInitializing(false);
    });

    newSocket.on('connect_error', (error) => {
      setIsSocketConnected(false);
      setApiError('Impossible de se connecter au serveur');
      setIsInitializing(false);
    });

    newSocket.on('card_inserted', (data) => {
      if (data.card_id && data.card_id !== null) {
        setUser({ name: 'Carte détectée', cardId: data.card_id });
        setBalance(0);
        setPinAttempts(3);
        setIsCardBlocked(false);
        setTpeMode('pin');
        setTpeMessage('Saisir code PIN');
        setTpeInput('');
      }
    });

    newSocket.on('pin_verification_result', (result) => {
      setIsVerifyingPin(false);

      if (result.success) {
        setIsPinVerified(true);
        setTpeMode('idle');
        setTpeMessage('Code accepté');
        setTpeInput('');
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

        setTimeout(() => setTpeMessage(''), 2000);
      } else if (result.blocked) {
        setIsCardBlocked(true);
        setPinAttempts(0);
        setTpeMode('error');
        setTpeMessage('CARTE BLOQUÉE');
      } else if (result.attempts_remaining !== undefined && result.attempts_remaining !== null) {
        setPinAttempts(result.attempts_remaining);
        setTpeInput('');
        setTpeMode('pin');
        setTpeMessage(`Erreur - ${result.attempts_remaining} essai(s)`);
        setTimeout(() => setTpeMessage('Saisir code PIN'), 2000);
      } else if (result.error) {
        if (result.error.includes('inactive') || result.error.includes('bloquée') || result.error.includes('bloquee')) {
          setCardErrorMessage(result.error);
          setShowCardErrorAnimation(true);
          setTpeMode('error');
          setTpeMessage('Carte inactive');

          setTimeout(() => {
            setShowCardErrorAnimation(false);
            setTpeMode('pin');
            setTpeMessage('Saisir code PIN');
            setTpeInput('');
          }, 4000);
        } else {
          setTpeMode('error');
          setTpeMessage('Erreur');
          setTimeout(() => {
            setTpeMode('pin');
            setTpeMessage('Saisir code PIN');
          }, 2000);
        }
      }
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

    newSocket.on('card_removed', (data) => {
      if (newSocket.balanceAutoUpdate) {
        newSocket.balanceAutoUpdate = false;
      }

      resetState();
    });

    newSocket.on('disconnect', (reason) => {
      setIsSocketConnected(false);
      if (reason === 'io server disconnect') {
        setApiError('Le serveur a ferme la connexion');
      } else {
        setApiError('Connexion perdue avec le serveur');
      }
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const resetState = useCallback(() => {
    if (fuelingIntervalRef) {
      clearInterval(fuelingIntervalRef);
      setFuelingIntervalRef(null);
    }

    setUser(null);
    setBalance(0);
    setIsPinVerified(false);
    setPinAttempts(3);
    setIsCardBlocked(false);
    setIsVerifyingPin(false);
    setShowCardErrorAnimation(false);
    setCardErrorMessage('');
    setSelectedFuel(null);
    setLiters('');
    setIsFueling(false);
    setFuelingProgress(0);
    setCurrentLiters(0);
    setCurrentAmount(0);
    setTpeInput('');
    setTpeMode('idle');
    setTpeMessage('');
    setMessage('');
    setPaymentMode('full');
    setSelectedPresetAmount(50);
    setCustomAmount('');
    setPreAuthAmount(0);
    setIsPreAuthActive(false);
    setShowAmountSelector(false);
    setRefundAmount(0);
    setShowPaymentSuccess(false);
  }, [fuelingIntervalRef]);

  const handleTpeButton = (value) => {
    if (isCardBlocked) return;
    
    if (value === 'C') {
      setTpeInput('');
      return;
    }

    if (value === 'CE') {
      setTpeInput(prev => prev.slice(0, -1));
      return;
    }

    if (value === 'OK') {
      handleTpeValidate();
      return;
    }

    if (value === 'X') {
      if (tpeMode === 'amount') {
        setTpeMode('idle');
        setTpeInput('');
        setSelectedFuel(null);
        setLiters('');
      }
      if (user) {
        setTpeMode('idle');
        setTpeInput('');
        setTpeMessage('Retirez votre carte');
        setSelectedFuel(null);
        setLiters('');
      }
      return;
    }

    if (tpeMode === 'pin' && tpeInput.length < 4) {
      setTpeInput(prev => prev + value);
    } else if (tpeMode === 'amount' && tpeInput.length < 5) {
      setTpeInput(prev => prev + value);
    }
  };

  const handleTpeValidate = () => {
    if (tpeMode === 'pin') {
      if (tpeInput.length !== 4) {
        setTpeMessage('4 chiffres requis');
        setTimeout(() => setTpeMessage('Saisir code PIN'), 2000);
        return;
      }
      
      setIsVerifyingPin(true);
      setTpeMode('processing');
      setTpeMessage('Vérification...');

      if (socket && socket.connected) {
        socket.emit('verify_pin', { pin: tpeInput });
      }
    }
  };

  // Sélection d'un carburant - ouvre le sélecteur de montant
  const handleFuelSelect = (fuel) => {
    if (!user) {
      setMessage('Veuillez insérer votre carte');
      setMessageType('info');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    if (!isPinVerified) {
      setMessage('Veuillez saisir votre code PIN sur le TPE');
      setMessageType('info');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (isFueling) return;

    // Vérifier que le solde n'est pas à 0
    if (balance <= 0) {
      setShowInsufficientBalance(true);
      return;
    }

    // Sélectionner le carburant et ouvrir le sélecteur de montant
    setSelectedFuel(fuel);
    setShowAmountSelector(true);
  };

  // Confirmer le montant et lancer la pré-autorisation
  const handleConfirmAmount = () => {
    // Mode plein : pré-autorisation du solde entier
    const amount = balance;

    if (amount <= 0) {
      setShowAmountSelector(false);
      setShowInsufficientBalance(true);
      return;
    }

    // Effectuer la pré-autorisation
    setShowAmountSelector(false);
    processPreAuthorization(amount);
  };

  // Traiter la pré-autorisation
  const processPreAuthorization = (amount) => {
    setTpeMode('preauth');
    setTpeMessage('Pré-autorisation...');
    setShowProcessingPayment(true);

    if (socket && socket.connected) {
      setPreAuthAmount(amount);

      socket.emit('create_transaction', {
        amount: amount,
        merchant: 'PumpShop'
      });

      socket.once('transaction_result', (result) => {
        if (result.success) {
          setBalance(result.new_balance);
          setIsPreAuthActive(true);
          setTpeMode('success');
          setTpeMessage(`${amount.toFixed(2)}€ prélevés`);

          setTimeout(() => {
            setShowProcessingPayment(false);
            startFueling(selectedFuel, amount);
          }, 1500);
        } else {
          setShowProcessingPayment(false);
          setIsPreAuthActive(false);
          setPreAuthAmount(0);
          setTpeMode('error');

          if (result.error && result.error.includes('Insufficient')) {
            setTpeMessage('Solde insuffisant');
            setShowInsufficientBalance(true);
          } else {
            setTpeMessage('Erreur');
          }

          setTimeout(() => {
            setTpeMode('idle');
            setTpeMessage('');
            setSelectedFuel(null);
          }, 3000);
        }
      });

    } else {
      setShowProcessingPayment(false);
      setTpeMode('error');
      setTpeMessage('Connexion perdue');
      setTimeout(() => {
        setTpeMode('idle');
        setTpeMessage('');
      }, 2000);
    }
  };

  // Arrêter le ravitaillement manuellement
  const stopFueling = () => {
    if (fuelingIntervalRef) {
      clearInterval(fuelingIntervalRef);
      setFuelingIntervalRef(null);
    }
    
    if (selectedFuel && isPreAuthActive) {
      finalizeFueling();
    }
  };

  const finalizeFueling = () => {
    const actualAmount = currentLiters * selectedFuel.price;
    const refundToSend = preAuthAmount - actualAmount;

    setPaymentAmount(actualAmount);
    setRefundAmount(refundToSend);
    setLiters(currentLiters);
    setIsPreAuthActive(false);
    setIsFueling(false);

    const showSuccessAndReset = (finalBalance) => {
      setNewBalanceAmount(finalBalance);
      setShowPaymentSuccess(true);

      setTimeout(() => {
        setShowPaymentSuccess(false);
        setTpeMode('idle');
        setTpeMessage('Retirez votre carte');
        setSelectedFuel(null);
        setFuelingProgress(0);
        setCurrentLiters(0);
        setCurrentAmount(0);
        setPreAuthAmount(0);
        setRefundAmount(0);
        setCustomAmount('');
      }, 5000);
    };

    if (refundToSend > 0 && socket && socket.connected) {
      setTpeMode('processing');
      setTpeMessage('Remboursement en cours...');

      socket.emit('create_transaction', {
        amount: refundToSend,
        merchant: 'PumpShop',
        refund: true
      });

      socket.once('transaction_result', (result) => {
        if (result.success && result.refund) {
          setBalance(result.new_balance);
          showSuccessAndReset(result.new_balance);
        } else if (!result.success) {
          setTpeMode('error');
          setTpeMessage('Erreur remboursement');
          setMessage(`Erreur de remboursement: ${result.error}`);
          setMessageType('error');
          setTimeout(() => {
            setMessage('');
            setTpeMode('idle');
            setTpeMessage('');
          }, 5000);
        }
      });

    } else if (refundToSend <= 0) {
      showSuccessAndReset(balance);
    } else {
      setTpeMode('error');
      setTpeMessage('Connexion perdue');
      setMessage('Attention: remboursement non envoyé');
      setMessageType('error');
      setTimeout(() => {
        setMessage('');
        setTpeMode('idle');
        setTpeMessage('');
      }, 5000);
    }
  };

  const startFueling = (fuel, maxAmount) => {
    const maxLiters = maxAmount / fuel.price;

    setIsFueling(true);
    setFuelingProgress(0);
    setCurrentLiters(0);
    setCurrentAmount(0);
    setTpeMode('idle');
    setTpeMessage('Remplissage...');

    const litersPerTick = 0.05;
    const interval = 50;

    const fuelingInterval = setInterval(() => {
      setCurrentLiters(prev => {
        const next = prev + litersPerTick;
        const nextAmount = next * fuel.price;

        if (next >= maxLiters || nextAmount >= maxAmount) {
          clearInterval(fuelingInterval);
          setFuelingIntervalRef(null);

          const finalLiters = Math.min(next, maxLiters);
          setCurrentAmount(finalLiters * fuel.price);
          setFuelingProgress(100);

          setTimeout(() => {
            finalizeFueling();
          }, 500);

          return finalLiters;
        }

        setCurrentAmount(nextAmount);
        setFuelingProgress((nextAmount / maxAmount) * 100);
        return next;
      });
    }, interval);

    setFuelingIntervalRef(fuelingInterval);
  };

  const renderTPE = () => {
    const displayText = (tpeMode === 'pin' || tpeMode === 'processing')
      ? '•'.repeat(tpeInput.length)
      : tpeInput;

    return (
      <div className="bg-gradient-to-b from-gray-700 to-gray-900 rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 shadow-2xl border-2 lg:border-3 border-black w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[300px] transform scale-[0.85] sm:scale-90 lg:scale-100 origin-top">
        {/* Écran du TPE */}
        <div className="bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg lg:rounded-xl p-2 lg:p-3 mb-2 lg:mb-3 border border-slate-300 shadow-inner">
          <div className="bg-white rounded-md lg:rounded-lg p-2 min-h-[60px] sm:min-h-[70px] lg:min-h-[80px] border border-slate-200">
            {/* Status de la carte */}
            <div className="flex items-center justify-between mb-1 lg:mb-2 pb-1 border-b border-slate-200">
              <span className="text-slate-600 text-[10px] sm:text-xs font-medium truncate">
                {user && isPinVerified ? user.name : user ? 'Carte détectée' : 'Insérer carte'}
              </span>
              {user && isPinVerified && (
                <span className="text-slate-900 text-[10px] sm:text-xs font-bold">
                  {balance.toFixed(2)}€
                </span>
              )}
            </div>
            
            {/* Message principal */}
            <div className="text-slate-800 text-xs sm:text-sm lg:text-base font-bold text-center mb-1">
              {tpeMessage || (selectedFuel ? `${selectedFuel.shortName} - ${selectedFuel.price.toFixed(3)}€/L` : 'PRÊT')}
            </div>
            
            {/* Zone de saisie */}
            <div className="bg-slate-100 rounded-md lg:rounded-lg p-1.5 sm:p-2 text-center border border-slate-200">
              <span className="text-slate-900 text-lg sm:text-xl lg:text-2xl font-mono tracking-widest font-bold">
                {displayText || '----'}
              </span>
              {tpeMode === 'amount' && tpeInput && (
                <span className="text-slate-600 text-xs lg:text-sm ml-1">L</span>
              )}
            </div>
          </div>
        </div>

        {/* Clavier du TPE */}
        <div className="grid grid-cols-3 gap-1 mb-2 lg:mb-3">
          {/* Rangées de chiffres */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleTpeButton(num.toString())}
              disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
              className="bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm sm:text-base lg:text-lg py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-slate-300 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          
          {/* Rangée du bas */}
          <button
            onClick={() => handleTpeButton('C')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-white font-bold text-xs sm:text-sm lg:text-base py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-yellow-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            C
          </button>
          <button
            onClick={() => handleTpeButton('0')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm sm:text-base lg:text-lg py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-slate-300 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <button
            onClick={() => handleTpeButton('CE')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-xs sm:text-sm lg:text-base py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-orange-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⌫
          </button>
        </div>

        {/* Boutons Annuler / Valider */}
        <div className="grid grid-cols-2 gap-1 mb-2 lg:mb-3">
          <button
            onClick={() => handleTpeButton('X')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold text-[10px] sm:text-xs lg:text-sm py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-red-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <span>✕</span> <span>Annuler</span>
          </button>
          <button
            onClick={() => handleTpeButton('OK')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked || tpeMode === 'idle'}
            className="bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold text-[10px] sm:text-xs lg:text-sm py-2 sm:py-2.5 lg:py-3 rounded-md lg:rounded-lg border border-green-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <span>✓</span> <span>Valider</span>
          </button>
        </div>

        {/* Indicateurs LED */}
        <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4 py-1.5 lg:py-2 border-t border-gray-600">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${user ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-600'}`}
                 style={user ? { animation: 'pulse 2s infinite' } : {}}></div>
            <span className="text-gray-400 text-[8px] lg:text-[10px]">Carte</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${tpeMode === 'processing' || tpeMode === 'preauth' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-gray-600'}`}
                 style={tpeMode === 'processing' || tpeMode === 'preauth' ? { animation: 'pulse 1s infinite' } : {}}></div>
            <span className="text-gray-400 text-[8px] lg:text-[10px]">Trait.</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${tpeMode === 'error' || isCardBlocked ? 'bg-red-400 shadow-lg shadow-red-400/50' : 'bg-gray-600'}`}
                 style={tpeMode === 'error' || isCardBlocked ? { animation: 'pulse 0.5s infinite' } : {}}></div>
            <span className="text-gray-400 text-[8px] lg:text-[10px]">Erreur</span>
          </div>
        </div>

        {/* Fente carte stylisée */}
        <div className="mt-1 flex flex-col items-center">
          <div className="w-20 sm:w-24 lg:w-28 h-1.5 lg:h-2 bg-black rounded-full border border-gray-600 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-transparent opacity-50"></div>
          </div>
          <p className="text-gray-400 text-[8px] lg:text-[10px] mt-0.5 font-medium">↑ Insérer carte</p>
        </div>
      </div>
    );
  };

  // Rendu des pompes à carburant
  const renderFuelPumps = () => {
    return (
      <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
        {fuels.map((fuel) => {
          const isSelected = selectedFuel?.id === fuel.id;
          const isPumping = isFueling && isSelected;
          const isDisabled = !isPinVerified || isFueling;
          
          return (
            <div key={fuel.id} className="flex flex-col items-center scale-75 lg:scale-90">
              {/* Corps de la pompe */}
              <div
                onClick={() => !isDisabled && handleFuelSelect(fuel)}
                className={`relative cursor-pointer transition-all duration-300 ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:z-50'
                } ${isSelected ? 'scale-105 z-40' : 'z-10'}`}
                style={{ filter: isSelected ? 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' : '' }}
              >
                {/* Structure principale de la pompe */}
                <div className="relative w-36 h-56 bg-gradient-to-b from-gray-100 to-gray-300 rounded-t-3xl shadow-2xl border-4 border-gray-400">
                  {/* Bandeau supérieur coloré */}
                  <div
                    className="absolute top-0 left-0 right-0 h-10 rounded-t-2xl"
                    style={{ background: `linear-gradient(135deg, ${fuel.color}, ${fuel.darkColor})` }}
                  >
                    <div className="flex items-center justify-center h-full">
                      <div className="text-white text-2xl font-bold">{fuel.octane}</div>
                    </div>
                  </div>

                  {/* Écran digital */}
                  <div className="absolute top-14 left-2 right-2 bg-black rounded-lg p-2 border-2 border-gray-600">
                    <div className="text-green-400 text-xs mb-1">{fuel.name}</div>
                    <div className="text-green-400 text-lg font-mono tabular-nums">
                      {fuel.price.toFixed(3)}
                    </div>
                    <div className="text-green-400 text-xs">€/Litre</div>
                  </div>

                  {/* Logo/Icône centrale */}
                  <div className="absolute top-36 left-1/2 transform -translate-x-1/2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-400 shadow-lg"
                      style={{ backgroundColor: fuel.color }}
                    >
                      <span className="text-white font-bold text-[8px] leading-none text-center">{fuel.shortName}</span>
                    </div>
                  </div>

                  {/* Grille de ventilation */}
                  <div className="absolute top-48 left-4 right-4 h-4 grid grid-cols-6 gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="bg-gray-400 rounded-sm h-1"></div>
                    ))}
                  </div>

                  {/* Indicateur de sélection/pompage */}
                  {isSelected && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div
                        className={`text-center text-white py-1 rounded-lg text-xs font-medium ${
                          isPumping ? 'animate-pulse' : ''
                        }`}
                        style={{ backgroundColor: fuel.darkColor }}
                      >
                        {isPumping ? 'EN COURS...' : 'SÉLECTIONNÉ'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Base de la pompe */}
                <div className="w-36 h-5 bg-gradient-to-b from-gray-400 to-gray-500 border-4 border-gray-400 border-t-0"></div>
                <div className="w-40 h-2 bg-gray-600 -mt-0.5 mx-auto"></div>

                {/* Tuyau et pistolet */}
                <div className="absolute top-20 -right-5 flex flex-col items-start">
                  {/* Support du pistolet */}
                  <div className="w-8 h-14 bg-gray-700 rounded-r-lg border-2 border-gray-600 flex items-center justify-center">
                    <div className="w-1 h-10 bg-gray-800 rounded-full"></div>
                  </div>

                  {/* Pistolet */}
                  <div className="relative mt-1 ml-1">
                    {/* Tuyau courbé */}
                    <svg width="24" height="36" className="absolute -top-4 -left-1">
                      <path
                        d="M 6 0 Q 6 14, 12 20 L 12 36"
                        stroke={fuel.color}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    {/* Corps du pistolet */}
                    <div
                      className="relative w-10 rounded-lg shadow-lg border-2 border-gray-700 z-10"
                      style={{ backgroundColor: fuel.color, height: '60px' }}
                    >
                      {/* Poignée */}
                      <div className="absolute top-3 left-1 right-1 h-7 bg-black bg-opacity-30 rounded-md"></div>
                      
                      {/* Gâchette */}
                      <div className="absolute top-5 left-2 w-5 h-5 bg-gray-900 rounded-md border-2 border-gray-700"></div>
                      
                      {/* Bec verseur */}
                      <div
                        className="absolute -bottom-1 left-3 w-3 h-5 rounded-b-lg"
                        style={{ backgroundColor: fuel.darkColor }}
                      ></div>

                      {/* Détails métalliques */}
                      <div className="absolute top-1 left-1 right-1 h-0.5 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Effet lumineux si en cours de pompage */}
                {isPumping && (
                  <div
                    className="absolute top-10 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: fuel.color }}
                  ></div>
                )}
              </div>

              {/* Numéro de pompe */}
              <div className="mt-1 text-gray-400 text-xs">Pompe {fuel.octane}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderModeSelector = () => {
    return null;
  };

  // Modal de sélection du montant
  const renderAmountSelector = () => {
    if (!showAmountSelector || !selectedFuel) return null;

    const maxLitersForAmount = (amount) => (amount / selectedFuel.price).toFixed(1);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-lg w-full animate-slideDown">
          <div className="text-center">
            {/* Header with fuel info */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedFuel.color }}
              >
                <span className="text-white font-bold text-lg">{selectedFuel.shortName}</span>
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-gray-900">{selectedFuel.name}</h2>
                <p className="text-gray-600">{selectedFuel.price.toFixed(3)}€/L</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Distribution</h2>
            <p className="text-lg text-gray-700 mb-6">Détail du fonctionnement</p>

            {/* Steps */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-6 mb-6 text-left">
              <ol className="space-y-3">
                <li className="flex items-start">
                  <span className="text-gray-900 font-bold mr-3">1.</span>
                  <span className="text-gray-700">Une pré-autorisation de <strong className="text-gray-900">{balance.toFixed(2)}€</strong> sera effectuée</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-900 font-bold mr-3">2.</span>
                  <span className="text-gray-700">Faites votre plein puis arrêtez le au montant souhaité</span>
                </li>
              </ol>
            </div>

            {/* Amount info */}
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4 mb-6">
              <p className="text-gray-900 font-semibold mb-1">
                Montant bloqué : {balance.toFixed(2)}€
              </p>
              <p className="text-gray-600 text-sm">
                ≈ {maxLitersForAmount(balance)} litres maximum
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAmountSelector(false);
                  setSelectedFuel(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAmount}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Autoriser {balance.toFixed(2)}€
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rendu du ravitaillement en cours
  const renderFuelingDisplay = () => {
    if (!isFueling || !selectedFuel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white border-3 border-black rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-slideDown">
          <div className="text-center">
            {/* Header with fuel info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: selectedFuel.color }}
                >
                  <span className="text-white font-bold text-lg">{selectedFuel.shortName}</span>
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFuel.name}</h2>
                  <p className="text-gray-600">{selectedFuel.price.toFixed(3)}€/L</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-4 py-2 rounded-full text-sm font-bold bg-yellow-400 text-gray-900">
                  {preAuthAmount.toFixed(2)}€
                </span>
                <p className="text-gray-500 text-xs mt-1">Pré-autorisé</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Remplissage en cours</h2>
            <p className="text-lg text-gray-700 mb-6">Votre plein est en cours...</p>

            {/* Counter cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-2 font-semibold">LITRES</p>
                <p className="font-mono text-5xl font-bold text-gray-900">
                  {currentLiters.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-3 border-black rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-2 font-semibold">MONTANT</p>
                <p className="font-mono text-5xl font-bold text-gray-900">
                  {currentAmount.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-100 ease-linear relative overflow-hidden"
                style={{
                  width: `${fuelingProgress}%`,
                  backgroundColor: selectedFuel.color
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-600 mb-6">
              <span>{fuelingProgress.toFixed(0)}% complete</span>
              <span>Reste : {(preAuthAmount - currentAmount).toFixed(2)}€</span>
            </div>

            {/* Stop button */}
            <button
              onClick={stopFueling}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all text-lg"
            >
              Arrêter le remplissage
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 flex flex-col overflow-hidden">
      {/* Écran de chargement initial */}
      {/* Popup d'erreur lecteur - même design que les popups de paiement */}
      {!isSocketConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slideDown pointer-events-none">
            <div className="text-center">
              {/* Icône d'erreur animée */}
              <div className="relative mb-6 flex justify-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-scaleIn">
                  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Titre */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lecteur indisponible</h2>

              {/* Message d'erreur */}
              <div className="mb-4">
                <p className="text-lg text-gray-700 mb-1">{apiError || 'Connexion au serveur impossible'}</p>
                <p className="text-sm text-gray-500">Reconnexion au lecteur en cours...</p>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-200 my-4"></div>

              {/* Indicateur de reconnexion */}
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

      {/* Message notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-3 rounded-xl shadow-lg border-2 animate-slideDown ${
          messageType === 'error' ? 'bg-red-900 border-red-500 text-red-100' :
          messageType === 'success' ? 'bg-green-900 border-green-500 text-green-100' :
          'bg-blue-900 border-blue-500 text-blue-100'
        }`}>
          {message}
        </div>
      )}

      {/* Animation d'erreur de carte (inactive/bloquée) */}
      {showCardErrorAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border-2 border-gray-600 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-scaleIn">
            <div className="text-center">
              {/* Icône d'alerte animée */}
              <div className="relative mb-6 flex justify-center">
                <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-2xl inline-block">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              {/* Titre */}
              <h2 className="text-3xl font-bold text-white mb-6">Carte inactive</h2>
              
              {/* Message d'erreur */}
              <div className="bg-gray-700 border-2 border-gray-600 rounded-xl p-6 mb-6">
                <p className="text-white font-semibold text-lg mb-2">
                  Authentification refusée
                </p>
                <p className="text-gray-300">
                  {cardErrorMessage || "Cette carte n'est pas autorisée à s'authentifier"}
                </p>
              </div>
              
              {/* Instructions */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <p className="text-gray-300 font-medium">
                  Consultez votre espace client pour activer votre carte
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header compact */}
      <header className="text-center h-12 flex items-center justify-center flex-shrink-0">
        <img src={logo} alt="Logo" className="h-20 md:h-24 object-contain" />
      </header>

      {/* Contenu principal - hauteur fixe */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 px-2 lg:px-4 overflow-hidden">
        {/* Section TPE */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center overflow-hidden">
          {renderTPE()}
        </div>

        {/* Section Pompes */}
        <div className="lg:col-span-2 relative flex flex-col justify-center">
          {/* Sélecteur de mode */}
          {renderModeSelector()}
          
          {/* Pompes */}
          {renderFuelPumps()}
          
          {/* Affichage du ravitaillement en cours (overlay) */}
          {renderFuelingDisplay()}
        </div>
      </div>

      {/* Modal de sélection de montant */}
      {renderAmountSelector()}

      {/* Processing Payment Modal */}
      {showProcessingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slideDown">
            <div className="text-center">
              {/* Spinner icon */}
              <div className="relative mb-6 flex justify-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="animate-spin">
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pré-autorisation en cours</h2>
              <p className="text-lg text-gray-700 mb-4">Validation du paiement...</p>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Montant à bloquer</p>
                <p className="text-3xl font-bold text-gray-900">{preAuthAmount.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de succès */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scaleIn relative">
            {/* Bouton fermer */}
            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                setSelectedFuel(null);
                resetState();
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
            >
              ✕
            </button>
            
            <div className="text-center">
              {/* Icône de succès */}
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Plein terminé !</h2>
              
              {/* Détails */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Carburant</span>
                  <span className="font-semibold text-gray-900">{selectedFuel?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantité</span>
                  <span className="font-semibold text-gray-900">{parseFloat(liters || 0).toFixed(2)} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pré-autorisation</span>
                  <span className="font-semibold text-gray-500">{preAuthAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Montant réel</span>
                  <span className="font-bold text-red-600">-{paymentAmount.toFixed(2)}€</span>
                </div>
                {refundAmount > 0 && (
                  <div className="flex justify-between bg-green-50 p-2 rounded-lg">
                    <span className="text-green-700">Remboursé</span>
                    <span className="font-bold text-green-600">+{refundAmount.toFixed(2)}€</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <p className="text-gray-500 text-sm mb-1">Nouveau solde</p>
                <p className="text-3xl font-bold text-gray-900">{newBalanceAmount.toFixed(2)}€</p>
              </div>
              
              <p className="text-green-600 font-medium mt-4">
                Merci de votre visite !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de solde insuffisant */}
      {showInsufficientBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scaleIn relative">
            {/* Bouton fermer */}
            <button
              onClick={() => setShowInsufficientBalance(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
            >
              ✕
            </button>
            
            <div className="text-center">
              {/* Icône d'erreur */}
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Solde insuffisant</h2>
              <p className="text-gray-600 mb-6">
                Votre solde est insuffisant pour effectuer un plein.
              </p>
              
              {/* Solde actuel */}
              <div className="bg-red-50 rounded-xl p-4 mb-6">
                <p className="text-red-600 text-sm mb-1">Solde actuel</p>
                <p className="text-3xl font-bold text-red-700">{balance.toFixed(2)}€</p>
              </div>
              
              <button
                onClick={() => setShowInsufficientBalance(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
