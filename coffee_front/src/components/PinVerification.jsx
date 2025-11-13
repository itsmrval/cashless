import React, { useState, useEffect } from 'react';

const PinVerification = ({ onVerify, onCancel, isLoading }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [pin]);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Le code PIN doit contenir 4 chiffres');
      return;
    }

    try {
      await onVerify(pin);
      setPin('');
    } catch (err) {
      setError(err.message || 'Code PIN incorrect');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="bg-coffee-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-coffee-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Code PIN</h2>
          <p className="text-gray-600">Entrez votre code PIN pour confirmer</p>
        </div>

        {/* Affichage du PIN */}
        <div className="flex justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                pin.length > i
                  ? 'bg-coffee-500 border-coffee-600 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Clavier numérique */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={isLoading}
              className="keypad-button"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="keypad-button text-red-600 hover:bg-red-50"
          >
            C
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            disabled={isLoading}
            className="keypad-button"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isLoading}
            className="keypad-button"
          >
            ⌫
          </button>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || pin.length !== 4}
            className={`font-semibold py-3 rounded-lg transition-colors ${
              isLoading || pin.length !== 4
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-coffee-600 hover:bg-coffee-700 text-white'
            }`}
          >
            {isLoading ? 'Vérification...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinVerification;
