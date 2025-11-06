'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, User } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
}

interface SelectSearchProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export default function SelectSearch({
  label,
  value,
  onChange,
  options,
  placeholder = 'Rechercher...',
  required = false,
  disabled = false,
  className = '',
  error,
}: SelectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trouver l'option sélectionnée
  const selectedOption = options.find((opt) => opt.value === value);

  // Filtrer les options selon la recherche
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Bouton principal */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 text-left bg-white border rounded-lg
          flex items-center justify-between gap-2
          transition-all duration-200
          ${disabled 
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
          }
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption ? (
            <div className="flex flex-col min-w-0">
              <span className="text-gray-900 font-medium truncate">{selectedOption.label}</span>
              {selectedOption.subtitle && (
                <span className="text-xs text-gray-500 truncate">{selectedOption.subtitle}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </div>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-hidden animate-scale-up">
          {/* Barre de recherche */}
          <div className="p-3 border-b border-gray-100 bg-gray-50 sticky top-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, prénom ou numéro..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              />
            </div>
          </div>

          {/* Liste des options */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucun résultat trouvé
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-cyan-50 transition-colors
                    flex items-center gap-3 border-b border-gray-50 last:border-b-0
                    ${option.value === value ? 'bg-cyan-50 border-l-4 border-l-cyan-600' : ''}
                  `}
                >
                  <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">
                      {option.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-medium truncate ${
                      option.value === value ? 'text-cyan-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </span>
                    {option.subtitle && (
                      <span className="text-xs text-gray-500 truncate">{option.subtitle}</span>
                    )}
                  </div>
                  {option.value === value && (
                    <div className="w-2 h-2 bg-cyan-600 rounded-full shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

