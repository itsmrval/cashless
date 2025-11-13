import React from 'react';
import ProductCard from './ProductCard';

const Menu = ({ products, onProductSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Grouper les produits par catégorie
  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryProducts = products.filter(p => p.category === category);
        return (
          <div key={category} className="fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-3 capitalize flex items-center">
              <span className="bg-coffee-100 text-coffee-700 px-3 py-1 rounded-full text-sm mr-2">
                {categoryProducts.length}
              </span>
              {category === 'café' && '☕'} 
              {category === 'thé' && '🍵'}
              {category === 'eau' && '💧'}
              <span className="ml-2">{category}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onProductSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Menu;
