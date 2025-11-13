import React from 'react';

const ProductCard = ({ product, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(product)}
      className="product-card p-6 flex flex-col items-center justify-center space-y-3"
    >
      <div className="text-5xl">{product.icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 text-center">{product.name}</h3>
      <p className="text-sm text-gray-500 capitalize">{product.category}</p>
      <p className="text-xl font-bold text-coffee-700">{product.price.toFixed(2)} €</p>
    </div>
  );
};

export default ProductCard;
