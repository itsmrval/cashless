import React, { useState, useEffect, useCallback } from 'react';
import fuels from './fuels.json';
import io from 'socket.io-client';

// URL du serveur Socket.IO (lecteur de carte)
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL ;

// Mode démo - mettre à true pour simuler sans lecteur de carte
const DEMO_MODE = false;
const DEMO_PIN = '1234';
const DEMO_BALANCE = 150.00;

// Montants prédéfinis pour le mode montant fixe
const PRESET_AMOUNTS = [10, 20, 30, 50, 80, 100];

function App() {
  // État Socket.IO
  const [socket, setSocket] = useState(null);
  
  // États utilisateur
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(3);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  
  // État mode démo
  const [isDemoMode] = useState(DEMO_MODE);
  
  // États de connexion
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // États pompe et carburant
  const [selectedFuel, setSelectedFuel] = useState(null);
  const [liters, setLiters] = useState('');
  const [isFueling, setIsFueling] = useState(false);
  const [fuelingProgress, setFuelingProgress] = useState(0);
  const [currentLiters, setCurrentLiters] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [fuelingIntervalRef, setFuelingIntervalRef] = useState(null);
  
  // États pré-autorisation
  const [paymentMode, setPaymentMode] = useState('fixed'); // 'fixed' = montant fixe, 'full' = plein avec pré-auth
  const [selectedPresetAmount, setSelectedPresetAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [preAuthAmount, setPreAuthAmount] = useState(0);
  const [isPreAuthActive, setIsPreAuthActive] = useState(false);
  const [showAmountSelector, setShowAmountSelector] = useState(false);
  
  // États TPE
  const [tpeInput, setTpeInput] = useState('');
  const [tpeMode, setTpeMode] = useState('idle'); // 'idle', 'pin', 'amount', 'processing', 'success', 'error', 'preauth'
  const [tpeMessage, setTpeMessage] = useState('');
  
  // États modals et messages
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [newBalanceAmount, setNewBalanceAmount] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Connexion Socket.IO
  useEffect(() => {
    console.log('Connexion au serveur Socket.IO...', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000,
      forceNew: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO connecté - ID:', newSocket.id);
      setIsSocketConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Erreur connexion Socket.IO:', error);
      setIsSocketConnected(false);
    });

    newSocket.on('card_inserted', async (data) => {
      console.log('CARTE DÉTECTÉE VIA SOCKET.IO', data);
      
      if (data.card_id && data.card_id !== null) {
        setUser({ name: `Client ${data.card_id.substring(0, 8)}`, cardId: data.card_id });
        setBalance(0); // Sera mis à jour après vérification du PIN
        setPinAttempts(3);
        setIsCardBlocked(false);
        setTpeMode('pin');
        setTpeMessage('Saisir code PIN');
        setTpeInput('');
      }
    });

    newSocket.on('pin_verification_result', (result) => {
      console.log('Résultat de vérification PIN:', result);
      setIsVerifyingPin(false);
      
      if (result.success) {
        setIsPinVerified(true);
        setTpeMode('idle');
        setTpeMessage('Code accepté');
        setTpeInput('');
        setPinAttempts(3);
        setTimeout(() => setTpeMessage(''), 2000);
      } else if (result.blocked) {
        setIsCardBlocked(true);
        setPinAttempts(0);
        setTpeMode('error');
        setTpeMessage('CARTE BLOQUÉE');
      } else if (result.attempts_remaining !== undefined) {
        setPinAttempts(result.attempts_remaining);
        setTpeInput('');
        setTpeMode('pin');
        setTpeMessage(`Erreur - ${result.attempts_remaining} essai(s)`);
        setTimeout(() => setTpeMessage('Saisir code PIN'), 2000);
      }
    });

    newSocket.on('card_removed', (data) => {
      console.log('Carte retirée:', data);
      resetState();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO déconnecté:', reason);
      setIsSocketConnected(false);
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [isDemoMode]);

  const resetState = useCallback(() => {
    // Arrêter le ravitaillement en cours si présent
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
    setPaymentMode('fixed');
    setSelectedPresetAmount(50);
    setCustomAmount('');
    setPreAuthAmount(0);
    setIsPreAuthActive(false);
    setShowAmountSelector(false);
    setRefundAmount(0);
  }, [fuelingIntervalRef]);

  // Fonction pour simuler l'insertion de carte en mode démo
  const handleDemoInsertCard = () => {
    if (!isDemoMode) return;
    
    const demoCardId = 'DEMO' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setUser({ name: `Client Demo`, cardId: demoCardId });
    setBalance(DEMO_BALANCE);
    setPinAttempts(3);
    setIsCardBlocked(false);
    setTpeMode('pin');
    setTpeMessage('Saisir code PIN');
    setTpeInput('');
    
    console.log('🎮 Mode démo: Carte insérée -', demoCardId);
  };

  // Fonction pour simuler le retrait de carte en mode démo
  const handleDemoRemoveCard = () => {
    if (!isDemoMode) return;
    console.log('🎮 Mode démo: Carte retirée');
    resetState();
  };

  // Gestion des boutons du TPE
  const handleTpeButton = (value) => {
    if (isCardBlocked) return;
    
    if (value === 'C') {
      // Effacer
      setTpeInput('');
      return;
    }
    
    if (value === 'CE') {
      // Effacer dernier caractère
      setTpeInput(prev => prev.slice(0, -1));
      return;
    }
    
    if (value === 'OK') {
      handleTpeValidate();
      return;
    }
    
    if (value === 'X') {
      // Annuler
      if (tpeMode === 'amount') {
        setTpeMode('idle');
        setTpeInput('');
        setSelectedFuel(null);
        setLiters('');
      }
      return;
    }
    
    // Chiffres
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
      
      // Mode démo : vérification locale du PIN
      if (isDemoMode) {
        setTimeout(() => {
          setIsVerifyingPin(false);
          if (tpeInput === DEMO_PIN) {
            setIsPinVerified(true);
            setTpeMode('idle');
            setTpeMessage('Code accepté');
            setTpeInput('');
            setPinAttempts(3);
            console.log('🎮 Mode démo: PIN correct');
            setTimeout(() => setTpeMessage(''), 2000);
          } else {
            const newAttempts = pinAttempts - 1;
            setPinAttempts(newAttempts);
            setTpeInput('');
            if (newAttempts === 0) {
              setIsCardBlocked(true);
              setTpeMode('error');
              setTpeMessage('CARTE BLOQUÉE');
              console.log('🎮 Mode démo: Carte bloquée');
            } else {
              setTpeMode('pin');
              setTpeMessage(`Erreur - ${newAttempts} essai(s)`);
              console.log(`🎮 Mode démo: PIN incorrect - ${newAttempts} essai(s) restant(s)`);
              setTimeout(() => setTpeMessage('Saisir code PIN'), 2000);
            }
          }
        }, 1000);
        return;
      }
      
      // Mode réel : vérification via Socket.IO
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
      setMessage('Solde insuffisant ! Impossible de faire le plein.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Sélectionner le carburant et ouvrir le sélecteur de montant
    setSelectedFuel(fuel);
    setShowAmountSelector(true);
  };

  // Confirmer le montant et lancer la pré-autorisation
  const handleConfirmAmount = () => {
    let amount;
    
    if (paymentMode === 'fixed') {
      amount = customAmount ? parseFloat(customAmount) : selectedPresetAmount;
      if (isNaN(amount) || amount <= 0) {
        setMessage('Montant invalide');
        setMessageType('error');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
    } else {
      // Mode plein : pré-autorisation du solde entier
      amount = balance;
    }

    // Vérifier que le montant ne dépasse pas le solde
    if (amount > balance) {
      setMessage(`Montant trop élevé. Solde disponible : ${balance.toFixed(2)}€`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
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
    
    // Simuler le temps de traitement
    setTimeout(() => {
      // Bloquer le montant sur le compte
      setPreAuthAmount(amount);
      setBalance(prev => prev - amount);
      setIsPreAuthActive(true);
      
      setTpeMode('success');
      setTpeMessage(`${amount.toFixed(2)}€ bloqués`);
      
      console.log(`💳 Pré-autorisation de ${amount.toFixed(2)}€ acceptée`);
      
      // Démarrer le ravitaillement après 1.5s
      setTimeout(() => {
        startFueling(selectedFuel, amount);
      }, 1500);
    }, 2000);
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

  // Finaliser le ravitaillement et calculer le remboursement
  const finalizeFueling = () => {
    const actualAmount = currentLiters * selectedFuel.price;
    const refund = preAuthAmount - actualAmount;
    
    // Rembourser la différence
    const finalBalance = balance + refund;
    
    setBalance(finalBalance);
    setPaymentAmount(actualAmount);
    setNewBalanceAmount(finalBalance);
    setRefundAmount(refund);
    setLiters(currentLiters);
    setIsPreAuthActive(false);
    
    setIsFueling(false);
    setShowPaymentSuccess(true);
    
    console.log(`💳 Paiement finalisé: ${actualAmount.toFixed(2)}€ (remboursement: ${refund.toFixed(2)}€)`);
    
    setTimeout(() => {
      setShowPaymentSuccess(false);
      setTpeMode('idle');
      setTpeMessage('');
      setSelectedFuel(null);
      setFuelingProgress(0);
      setCurrentLiters(0);
      setCurrentAmount(0);
      setPreAuthAmount(0);
      setRefundAmount(0);
      setCustomAmount('');
    }, 5000);
  };

  const startFueling = (fuel, maxAmount) => {
    const maxLiters = maxAmount / fuel.price;
    
    setIsFueling(true);
    setFuelingProgress(0);
    setCurrentLiters(0);
    setCurrentAmount(0);
    setTpeMode('idle');
    setTpeMessage('Remplissage...');
    
    // Vitesse : environ 1 litre par 100ms (rapide pour la démo)
    const litersPerTick = 0.05;
    const interval = 50;
    
    const fuelingInterval = setInterval(() => {
      setCurrentLiters(prev => {
        const next = prev + litersPerTick;
        const nextAmount = next * fuel.price;
        
        // Arrêter si on atteint le max de la pré-autorisation
        if (next >= maxLiters || nextAmount >= maxAmount) {
          clearInterval(fuelingInterval);
          setFuelingIntervalRef(null);
          
          const finalLiters = Math.min(next, maxLiters);
          setCurrentAmount(finalLiters * fuel.price);
          setFuelingProgress(100);
          
          // Finaliser automatiquement
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

  // Rendu du TPE
  const renderTPE = () => {
    const displayText = tpeMode === 'pin' 
      ? '•'.repeat(tpeInput.length)
      : tpeInput;

    return (
      <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl border-4 border-gray-700 w-80">
        {/* Écran du TPE */}
        <div className="bg-gradient-to-b from-green-900 to-green-950 rounded-lg p-4 mb-4 border-2 border-green-800">
          <div className="bg-green-400 bg-opacity-20 rounded p-3 min-h-[80px]">
            {/* Status de la carte */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300 text-xs">
                {user ? `💳 ${user.name}` : '💳 Insérer carte'}
              </span>
              {user && (
                <span className="text-green-300 text-xs font-bold">
                  {balance.toFixed(2)}€
                </span>
              )}
            </div>
            
            {/* Message principal */}
            <div className="text-green-400 text-lg font-mono text-center mb-2">
              {tpeMessage || (selectedFuel ? `${selectedFuel.shortName} - ${selectedFuel.price.toFixed(3)}€/L` : 'PRÊT')}
            </div>
            
            {/* Zone de saisie */}
            <div className="bg-green-950 rounded p-2 text-center">
              <span className="text-green-400 text-2xl font-mono tracking-widest">
                {displayText || '----'}
              </span>
              {tpeMode === 'amount' && tpeInput && (
                <span className="text-green-300 text-sm ml-2">L</span>
              )}
            </div>
          </div>
        </div>

        {/* Clavier du TPE */}
        <div className="grid grid-cols-3 gap-2">
          {/* Rangée 1 */}
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => handleTpeButton(num.toString())}
              disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
              className="tpe-button tpe-button-number"
            >
              {num}
            </button>
          ))}
          
          {/* Rangée 2 */}
          {[4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => handleTpeButton(num.toString())}
              disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
              className="tpe-button tpe-button-number"
            >
              {num}
            </button>
          ))}
          
          {/* Rangée 3 */}
          {[7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleTpeButton(num.toString())}
              disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
              className="tpe-button tpe-button-number"
            >
              {num}
            </button>
          ))}
          
          {/* Rangée 4 - Actions */}
          <button
            onClick={() => handleTpeButton('C')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="tpe-button tpe-button-action bg-yellow-600 hover:bg-yellow-500 border-2 border-yellow-500"
          >
            C
          </button>
          <button
            onClick={() => handleTpeButton('0')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="tpe-button tpe-button-number"
          >
            0
          </button>
          <button
            onClick={() => handleTpeButton('CE')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="tpe-button tpe-button-action bg-orange-600 hover:bg-orange-500 border-2 border-orange-500"
          >
            ⌫
          </button>
          
          {/* Rangée 5 - Validation/Annulation */}
          <button
            onClick={() => handleTpeButton('X')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked}
            className="tpe-button tpe-button-action bg-red-600 hover:bg-red-500 border-2 border-red-500"
          >
            ✕
          </button>
          <button
            onClick={() => handleTpeButton('OK')}
            disabled={tpeMode === 'processing' || tpeMode === 'success' || isCardBlocked || tpeMode === 'idle'}
            className="tpe-button tpe-button-action bg-green-600 hover:bg-green-500 border-2 border-green-500 col-span-2"
          >
            OK
          </button>
        </div>

        {/* Indicateur LED */}
        <div className="flex justify-center gap-4 mt-4">
          <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <div className={`w-3 h-3 rounded-full ${tpeMode === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <div className={`w-3 h-3 rounded-full ${tpeMode === 'error' || isCardBlocked ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
        </div>

        {/* Fente carte */}
        <div className="mt-4 flex justify-center">
          <div className="w-48 h-3 bg-black rounded-full border border-gray-700"></div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-1">Insérer carte ↑</p>

        {/* Boutons Mode Démo */}
        {isDemoMode && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-yellow-400 text-xs font-bold px-2 py-1 bg-yellow-900 rounded">🎮 MODE DÉMO</span>
            </div>
            <div className="flex gap-2">
              {!user ? (
                <button
                  onClick={handleDemoInsertCard}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-all"
                >
                  💳 Insérer carte
                </button>
              ) : (
                <button
                  onClick={handleDemoRemoveCard}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-all"
                >
                  ⏏️ Retirer carte
                </button>
              )}
            </div>
            {!user && (
              <p className="text-gray-500 text-xs text-center mt-2">
                PIN démo : <span className="text-green-400 font-mono">{DEMO_PIN}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Rendu des pompes à carburant
  const renderFuelPumps = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {fuels.map((fuel) => (
          <div
            key={fuel.id}
            onClick={() => !isFueling && handleFuelSelect(fuel)}
            className={`fuel-pump ${fuel.colorClass} ${fuel.borderClass} ${
              selectedFuel?.id === fuel.id ? 'fuel-pump-selected' : ''
            } ${!isPinVerified || isFueling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-center">
              <span className="text-4xl mb-2 block">{fuel.icon}</span>
              <h3 className="text-xl font-bold text-white mb-1">{fuel.shortName}</h3>
              <p className="text-white text-opacity-80 text-sm mb-3">{fuel.name}</p>
              <div className="bg-black bg-opacity-30 rounded-lg py-2 px-3">
                <span className="text-2xl font-bold text-white">{fuel.price.toFixed(3)}€</span>
                <span className="text-white text-opacity-80 text-sm">/L</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Rendu du sélecteur de mode (info seulement, pas de sélection ici)
  const renderModeSelector = () => {
    if (!isPinVerified || isFueling) return null;
    
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">💳</span>
          <h3 className="text-white font-semibold">Solde disponible</h3>
        </div>
        <div className="text-center">
          <span className={`text-4xl font-bold ${balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balance.toFixed(2)}€
          </span>
        </div>
        {balance <= 0 && (
          <div className="mt-3 p-2 bg-red-900 rounded-lg text-center">
            <span className="text-red-400 text-sm">
              ⚠️ Solde insuffisant pour faire le plein
            </span>
          </div>
        )}
        {isPreAuthActive && (
          <div className="mt-3 p-2 bg-yellow-900 rounded-lg text-center">
            <span className="text-yellow-400 text-sm">
              🔒 Pré-autorisation active : {preAuthAmount.toFixed(2)}€
            </span>
          </div>
        )}
        <p className="text-gray-400 text-sm text-center mt-3">
          {balance > 0 ? 'Cliquez sur un carburant pour commencer' : 'Rechargez votre carte pour continuer'}
        </p>
      </div>
    );
  };

  // Modal de sélection du montant
  const renderAmountSelector = () => {
    if (!showAmountSelector || !selectedFuel) return null;
    
    const maxLitersForAmount = (amount) => (amount / selectedFuel.price).toFixed(1);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-scaleIn border-2 border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedFuel.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFuel.name}</h2>
                  <p className="text-gray-400">{selectedFuel.price.toFixed(3)}€/L</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAmountSelector(false);
                  setSelectedFuel(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sélection du mode */}
          <div className="p-6">
            <h3 className="text-white font-semibold mb-4 text-center">Choisissez votre mode de paiement</h3>
            
            {/* Onglets de mode */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPaymentMode('fixed')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                  paymentMode === 'fixed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="text-lg">💵 Montant fixe</div>
                <div className="text-xs opacity-75">Choisir un montant</div>
              </button>
              <button
                onClick={() => setPaymentMode('full')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                  paymentMode === 'full'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="text-lg">⛽ Faire le plein</div>
                <div className="text-xs opacity-75">Pré-auth. {balance.toFixed(2)}€</div>
              </button>
            </div>

            {/* Mode montant fixe */}
            {paymentMode === 'fixed' && (
              <div className="space-y-4">
                {/* Montants prédéfinis */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.filter(amount => amount <= balance).map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedPresetAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`py-4 rounded-lg font-bold transition-all ${
                        selectedPresetAmount === amount && !customAmount
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-xl">{amount}€</div>
                      <div className="text-xs text-gray-300">~{maxLitersForAmount(amount)}L</div>
                    </button>
                  ))}
                </div>
                
                {/* Montant personnalisé */}
                <div className="mt-4">
                  <label className="text-gray-400 text-sm mb-2 block">Ou saisissez un montant :</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Montant en €"
                      max={balance}
                      className="flex-1 bg-gray-700 text-white text-xl font-bold py-3 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="flex items-center text-white text-xl px-3">€</span>
                  </div>
                  {customAmount && parseFloat(customAmount) > balance && (
                    <p className="text-red-400 text-sm mt-1">
                      Montant supérieur au solde ({balance.toFixed(2)}€)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mode plein */}
            {paymentMode === 'full' && (
              <div className="bg-gray-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-white mb-2">Comment ça marche ?</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Une pré-autorisation de <strong className="text-green-400">{balance.toFixed(2)}€</strong> sera bloquée</li>
                      <li>Faites votre plein librement</li>
                      <li>Arrêtez quand vous voulez</li>
                      <li>Seul le montant réel sera débité</li>
                      <li>Le reste sera débloqué immédiatement</li>
                    </ol>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg">
                  <p className="text-yellow-400 text-sm text-center">
                    🔒 Montant bloqué : <strong>{balance.toFixed(2)}€</strong>
                    <br/>
                    <span className="text-xs">≈ {maxLitersForAmount(balance)} litres maximum</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer avec bouton de confirmation */}
          <div className="p-6 border-t border-gray-700 bg-gray-900 rounded-b-2xl">
            <button
              onClick={handleConfirmAmount}
              disabled={paymentMode === 'fixed' && customAmount && parseFloat(customAmount) > balance}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-lg"
            >
              {paymentMode === 'fixed' 
                ? `✓ Confirmer ${customAmount || selectedPresetAmount}€`
                : `🔒 Autoriser ${balance.toFixed(2)}€ et commencer`
              }
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Rendu du ravitaillement en cours
  const renderFuelingDisplay = () => {
    if (!isFueling || !selectedFuel) return null;
    
    return (
      <div className="mt-8 bg-gray-800 rounded-2xl p-6 border-2 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">{selectedFuel.icon}</span>
            {selectedFuel.name}
          </h3>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-500 text-black">
              🔒 {preAuthAmount.toFixed(2)}€
            </span>
            <p className="text-gray-400 text-xs mt-1">Pré-autorisé</p>
          </div>
        </div>
        
        {/* Compteurs style station service */}
        <div className="bg-black rounded-xl p-6 mb-6 border-2" style={{ borderColor: selectedFuel.color }}>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-1">LITRES</p>
              <p className="font-mono text-5xl font-bold" style={{ color: selectedFuel.color }}>
                {currentLiters.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-1">MONTANT</p>
              <p className="font-mono text-5xl font-bold text-yellow-400">
                {currentAmount.toFixed(2)}€
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-sm">
            <span className="text-gray-500">
              Prix : {selectedFuel.price.toFixed(3)}€/L
            </span>
            <span className="text-gray-500">
              Reste disponible : {(preAuthAmount - currentAmount).toFixed(2)}€
            </span>
          </div>
        </div>
        
        {/* Barre de progression avec animation */}
        <div className="relative h-8 bg-gray-900 rounded-full overflow-hidden mb-6 border border-gray-700">
          <div
            className="h-full rounded-full transition-all duration-100 relative overflow-hidden"
            style={{
              width: `${fuelingProgress}%`,
              backgroundColor: selectedFuel.color
            }}
          >
            {/* Animation de flux */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm drop-shadow-lg">
              {fuelingProgress.toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* Bouton d'arrêt */}
        <button
          onClick={stopFueling}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all text-lg flex items-center justify-center gap-2"
        >
          <span className="text-2xl">⏹</span>
          Arrêter le remplissage
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Erreur de connexion */}
      {!isSocketConnected && !isDemoMode && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100]">
          <div className="bg-red-900 border-2 border-red-500 rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-100 mb-4">Erreur de connexion</h2>
            <p className="text-red-200 mb-6">
              Impossible de se connecter au serveur du lecteur de carte.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-800 text-red-300">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                  Lecteur déconnecté
                </div>
              </div>
              <p className="text-red-300 text-sm">
                Vérifiez que le serveur est démarré
              </p>
              <code className="bg-black bg-opacity-50 text-red-200 p-2 rounded text-xs">
                {SOCKET_URL}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Message notification */}
      {message && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg border-2 animate-slideDown ${
          messageType === 'error' ? 'bg-red-900 border-red-500 text-red-100' :
          messageType === 'success' ? 'bg-green-900 border-green-500 text-green-100' :
          'bg-blue-900 border-blue-500 text-blue-100'
        }`}>
          {message}
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          ⛽ Station Service Cashless
        </h1>
        <p className="text-gray-400 text-lg">
          Sélectionnez votre carburant et payez avec votre carte
        </p>
      </header>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section TPE */}
        <div className="lg:col-span-1 flex flex-col items-center">
          <h2 className="text-xl font-bold text-white mb-4">Terminal de Paiement</h2>
          {renderTPE()}
          
          {/* Instructions */}
          <div className="mt-6 bg-gray-800 rounded-xl p-4 w-80 border border-gray-700">
            <h3 className="text-white font-semibold mb-3">📋 Instructions</h3>
            <ol className="text-gray-400 text-sm space-y-2">
              <li>1. Insérez votre carte dans le TPE</li>
              <li>2. Saisissez votre code PIN</li>
              <li>3. Cliquez sur un carburant</li>
              <li>4. Choisissez montant fixe ou plein</li>
              <li>5. Faites le plein et arrêtez quand vous voulez !</li>
            </ol>
          </div>
        </div>

        {/* Section Pompes */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-4">Choisissez votre carburant</h2>
          
          {/* Sélecteur de mode */}
          {renderModeSelector()}
          
          {/* Pompes */}
          {renderFuelPumps()}
          
          {/* Affichage du ravitaillement en cours */}
          {renderFuelingDisplay()}
        </div>
      </div>

      {/* Modal de sélection de montant */}
      {renderAmountSelector()}

      {/* Modal de succès */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scaleIn">
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
                    <span className="text-green-700">💰 Remboursé</span>
                    <span className="font-bold text-green-600">+{refundAmount.toFixed(2)}€</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <p className="text-gray-500 text-sm mb-1">Nouveau solde</p>
                <p className="text-3xl font-bold text-gray-900">{newBalanceAmount.toFixed(2)}€</p>
              </div>
              
              <p className="text-green-600 font-medium mt-4">
                Merci de votre visite ! 🚗
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 py-3">
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Station Service Cashless • Paiement sécurisé par carte
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
