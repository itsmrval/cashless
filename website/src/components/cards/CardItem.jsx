import React, { useState } from 'react';
import { 
  CreditCard, 
  Lock, 
  Unlock, 
  Loader2, 
  Wifi,
  Check,
  Package
} from 'lucide-react';

const statusConfig = {
  active: {
    label: 'Active',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    gradient: 'from-slate-900 via-slate-800 to-slate-900'
  },
  inactive: {
    label: 'Inactive',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    gradient: 'from-slate-600 via-slate-500 to-slate-600'
  },
  waiting_activation: {
    label: 'En attente',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    gradient: 'from-amber-800 via-amber-700 to-amber-800'
  }
};

function CardItem({ 
  card, 
  isSelected = false, 
  onSelect, 
  onToggleStatus, 
  userName,
  compact = false,
  readOnly = false 
}) {
  const [loading, setLoading] = useState(false);
  
  const status = statusConfig[card?.status] || {
    label: card?.status || 'Inconnu',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    gradient: 'from-slate-700 via-slate-600 to-slate-700'
  };

  const isLocked = card?.status === 'inactive';
  const canToggle = card?.status === 'active' || card?.status === 'inactive';

  const handleToggleStatus = async (e) => {
    e.stopPropagation();
    if (!canToggle || loading) return;
    
    setLoading(true);
    try {
      await onToggleStatus?.(card._id);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect?.(card._id);
  };

  if (compact) {
    return (
      <button
        onClick={handleSelect}
        className={`
          flex items-center gap-3 p-3 rounded-xl border-2 transition-all w-full text-left
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          }
          ${isLocked ? 'opacity-75' : ''}
        `}
      >
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          bg-gradient-to-br ${status.gradient} text-white shadow
        `}>
          {isLocked ? <Lock size={18} /> : <CreditCard size={18} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            •••• {card._id?.slice(-4) || '0000'}
          </p>
          <div className={`inline-flex items-center gap-1 text-xs ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${card?.status === 'active' ? 'animate-pulse' : ''}`}></span>
            {status.label}
          </div>
        </div>

        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
        )}
      </button>
    );
  }

  // Carte avec ratio bancaire standard (85.6mm × 53.98mm = 1.586:1)
  return (
    <div className="relative w-full">
      {/* Card visual avec aspect ratio de carte bancaire */}
      <div 
        onClick={handleSelect}
        className={`
          relative w-full cursor-pointer transition-all duration-300
          ${isSelected ? '' : 'hover:scale-[1.02]'}
        `}
        style={{ aspectRatio: '1.586 / 1' }}
      >
        {/* Glow effect pour carte sélectionnée */}
        {isSelected && (
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-2xl opacity-30 blur-lg"></div>
        )}

        {/* La carte elle-même */}
        <div className={`
          absolute inset-0 bg-gradient-to-br ${status.gradient} rounded-2xl shadow-xl 
          text-white border overflow-hidden
          ${isSelected ? 'border-blue-400/50 ring-2 ring-blue-500/30' : 'border-white/10'}
          ${isLocked ? 'grayscale-[30%]' : ''}
        `}>
          {/* Background decorations */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          {/* Pattern subtil */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>

          {/* Lock overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-2 border border-white/20">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-semibold text-sm">Carte verrouillée</p>
              </div>
            </div>
          )}

          {/* Contenu de la carte */}
          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            {/* Top row */}
            <div className="flex justify-between items-start">
              {/* Chip */}
              <div className="w-11 h-8 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-500 rounded-md shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-yellow-600/40"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-[1px] bg-yellow-600/40"></div>
                </div>
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-yellow-600/30 rounded-sm"></div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status badge */}
                <span className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                  bg-white/20 backdrop-blur-sm text-white border border-white/20
                `}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${card?.status === 'active' ? 'animate-pulse' : ''}`}></span>
                  {status.label}
                </span>
                <Wifi className="text-white/40 rotate-90 h-5 w-5" />
              </div>
            </div>

            {/* Card number - centré verticalement */}
            <div className="flex-1 flex items-center">
              <p className="font-mono text-xl tracking-[0.2em] text-white/95 font-medium">
                •••• •••• •••• {card._id?.slice(-4) || '0000'}
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Titulaire</p>
                <p className="text-sm font-medium tracking-wide text-white/90 uppercase">
                  {userName || 'Utilisateur'}
                </p>
              </div>

            {/* Toggle button - masqué en mode readOnly */}
            {canToggle && !readOnly && (
              <button
                onClick={handleToggleStatus}
                disabled={loading}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-all disabled:opacity-50
                  ${card?.status === 'active'
                    ? 'bg-white/20 hover:bg-red-500/80 text-white'
                    : 'bg-emerald-500/80 hover:bg-emerald-600 text-white'
                  }
                `}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : card?.status === 'active' ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>
            )} 
             {/* Visa/MC logo */}
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-red-500 opacity-80"></div>
                <div className="w-7 h-7 rounded-full bg-orange-400 opacity-80"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-30">
          <Check size={14} className="text-white" />
        </div>
      )}
    </div>
  );
}

// Composant pour afficher l'état "pas de carte"
export function NoCardPlaceholder() {
  return (
    <div 
      className="relative w-full"
      style={{ aspectRatio: '1.586 / 1' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Pattern de fond */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-4 w-20 h-20 border-2 border-slate-400 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-slate-400 rounded-full"></div>
        </div>

        {/* Contenu centré */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mb-3 shadow-inner border border-slate-300">
            <Package className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">Carte non livrée</p>
          <p className="text-slate-400 text-xs text-center mt-1 px-6">
            Votre carte sera bientôt disponible ici une fois livrée.
          </p>
        </div>

        {/* Fake card elements (très subtils) */}
        <div className="absolute inset-0 p-5 opacity-20">
          <div className="w-10 h-7 bg-slate-300 rounded-md"></div>
          <div className="absolute bottom-5 left-5">
            <div className="h-3 w-32 bg-slate-300 rounded mb-2"></div>
            <div className="h-2 w-20 bg-slate-300 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardItem;
