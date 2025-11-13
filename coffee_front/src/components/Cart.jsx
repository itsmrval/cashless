import React from 'react';

const Cart = ({ items, onRemoveItem, onCheckout, totalAmount }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-gray-500">Votre panier est vide</p>
        <p className="text-sm text-gray-400 mt-1">Sélectionnez des produits pour commencer</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 fade-in">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        Panier ({items.reduce((sum, item) => sum + item.quantity, 0)})
      </h3>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × {item.price.toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-bold text-coffee-700">
                {(item.quantity * item.price).toFixed(2)} €
              </span>
              <button
                onClick={() => onRemoveItem(index)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                aria-label="Supprimer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-700">Total</span>
          <span className="text-2xl font-bold text-coffee-700">{totalAmount.toFixed(2)} €</span>
        </div>

        <button
          onClick={onCheckout}
          className="w-full bg-coffee-600 hover:bg-coffee-700 text-white font-bold py-4 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>Payer</span>
        </button>
      </div>
    </div>
  );
};

export default Cart;
