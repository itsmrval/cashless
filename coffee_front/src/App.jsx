import React, { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Cart from './components/Cart';
import UserInfo from './components/UserInfo';
import PinVerification from './components/PinVerification';
import { getMenu, getUserInfo, processPayment, waitForCard } from './api/coffeeApi';

function App() {
  // États principaux
  const [cardId, setCardId] = useState('');
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isWaitingCard, setIsWaitingCard] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger le menu au démarrage
  useEffect(() => {
    loadMenu();
    // Démarrer l'attente de carte automatiquement
    startWaitingForCard();
  }, []);

  const loadMenu = async () => {
    setIsLoadingMenu(true);
    setError('');
    try {
      const data = await getMenu();
      if (data.success) {
        setMenu(data.menu);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const startWaitingForCard = async () => {
    setIsWaitingCard(true);
    setError('');
    setUser(null);
    setCardId('');
    setCart([]);
    
    try {
      // Attendre qu'une carte soit scannée (timeout de 60 secondes)
      const cardData = await waitForCard(60);
      
      if (cardData.success && cardData.card_id) {
        setCardId(cardData.card_id);
        // Charger automatiquement les infos utilisateur
        await loadUserInfo(cardData.card_id);
      }
    } catch (err) {
      setError(err.message);
      // Recommencer l'attente après une erreur
      setTimeout(() => startWaitingForCard(), 2000);
    } finally {
      setIsWaitingCard(false);
    }
  };

  const loadUserInfo = async (card_id) => {
    setError('');
    try {
      const data = await getUserInfo(card_id);
      if (data.success) {
        setUser(data.user);
        setSuccess(`Bienvenue ${data.user.name}!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
      setUser(null);
      // Recommencer l'attente de carte
      setTimeout(() => startWaitingForCard(), 2000);
    }
  };

  const handleProductSelect = (product) => {
    if (!user) {
      setError('Veuillez d\'abord scanner votre carte');
      return;
    }

    // Vérifier si le produit est déjà dans le panier
    const existingItemIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Augmenter la quantité
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      // Ajouter un nouveau produit
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    setError('');
    setSuccess('');
  };

  const handleRemoveItem = (index) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
    } else {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Votre panier est vide');
      return;
    }

    const total = calculateTotal();
    if (user.balance < total) {
      setError(`Solde insuffisant. Il vous manque ${(total - user.balance).toFixed(2)} €`);
      return;
    }

    setShowPinModal(true);
    setError('');
  };

  const handlePinVerify = async (pin) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const total = calculateTotal();
      
      // Processus de paiement avec vérification du PIN
      const result = await processPayment(cardId, cart, total, pin);
      
      if (result.success) {
        setSuccess(`Paiement réussi! Nouveau solde: ${result.new_balance.toFixed(2)} €`);
        
        // Mettre à jour le solde utilisateur
        setUser({ ...user, balance: result.new_balance });
        
        // Vider le panier
        setCart([]);
        
        // Fermer le modal
        setShowPinModal(false);
        
        // Effacer le message de succès après 5 secondes
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      }
    } catch (err) {
      setError(err.message);
      throw err; // Propagate to PinVerification component
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setCardId('');
    setError('');
    setSuccess('');
    // Recommencer l'attente d'une nouvelle carte
    startWaitingForCard();
  };

  const handleChangeCard = () => {
    setError('');
    setSuccess('');
    // Recommencer l'attente d'une nouvelle carte
    startWaitingForCard();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-coffee-50 to-coffee-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-4xl">☕</div>
              <div>
                <h1 className="text-2xl font-bold text-coffee-800">Coffee Distributor</h1>
                <p className="text-sm text-gray-600">Système de paiement cashless</p>
              </div>
            </div>
            {user && !isWaitingCard && (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Déconnexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Messages d'erreur et de succès */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Saisie de la carte */}
        {isWaitingCard ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
              <div className="text-center mb-6">
                <div className="bg-coffee-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg className="w-10 h-10 text-coffee-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">En attente de carte</h2>
                <p className="text-gray-600">Veuillez poser votre carte sur le lecteur</p>
                <div className="mt-4">
                  <div className="inline-flex items-center space-x-2 text-coffee-600">
                    <div className="w-2 h-2 bg-coffee-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-coffee-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-coffee-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale - Menu */}
            <div className="lg:col-span-2 space-y-6">
              <UserInfo user={user} cardId={cardId} />
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
                  <button
                    onClick={handleChangeCard}
                    className="text-coffee-600 hover:text-coffee-700 text-sm font-semibold flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Changer de carte</span>
                  </button>
                </div>
                <Menu
                  products={menu}
                  onProductSelect={handleProductSelect}
                  isLoading={isLoadingMenu}
                />
              </div>
            </div>

            {/* Colonne latérale - Panier */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Cart
                  items={cart}
                  onRemoveItem={handleRemoveItem}
                  onCheckout={handleCheckout}
                  totalAmount={calculateTotal()}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Modal de vérification PIN */}
      {showPinModal && (
        <PinVerification
          onVerify={handlePinVerify}
          onCancel={() => {
            setShowPinModal(false);
            setError('');
          }}
          isLoading={isProcessing}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>Coffee Distributor - Système cashless © 2025</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
