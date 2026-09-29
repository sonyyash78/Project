import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaCheck, FaPlus, FaSearch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const SmartCombobox = ({
  options = [],
  value, // Current selected text value (e.g., "JEE Main")
  onChange, // (name, id, isNew) => void
  onSelectNew, // async (name) => { id, name }
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  label = 'Combobox',
  createNewText = 'Create new'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search with selected value when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(value || '');
    } else {
      setSearch('');
      if (inputRef.current) inputRef.current.focus();
    }
  }, [isOpen, value]);

  const filteredOptions = options.filter(opt =>
    (opt.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.find(
    opt => (opt.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === search.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const handleSelect = (opt) => {
    onChange(opt.name, opt.id, false);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    if (!search.trim()) return;
    
    // Fallback if there is an exact match (user didn't click it but hit enter)
    if (exactMatch) {
      handleSelect(exactMatch);
      return;
    }

    setCreating(true);
    try {
      const newItem = await onSelectNew(search.trim());
      onChange(newItem.name, newItem.id, true);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0 && search.trim() === '') {
         // Do nothing if just enter on empty
      } else if (filteredOptions.length === 1 && !exactMatch) {
         handleSelect(filteredOptions[0]);
      } else if (!exactMatch && search.trim().length > 0) {
         handleCreateNew();
      } else if (exactMatch) {
         handleSelect(exactMatch);
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      
      <div 
        onClick={() => !disabled && setIsOpen(true)}
        className={`flex items-center justify-between w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus-within:border-indigo-500 cursor-text transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex-1 flex items-center gap-2">
          {isOpen ? (
            <FaSearch className="text-slate-500" />
          ) : null}
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? search : (value || '')}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent outline-none border-none text-white placeholder-slate-600"
          />
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          {loading ? (
            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FaChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
          >
            {filteredOptions.length > 0 ? (
              <div className="p-1">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center justify-between group transition-colors text-slate-300"
                  >
                    <span>{opt.name}</span>
                    {value === opt.name && <FaCheck className="text-indigo-400 opacity-100" />}
                  </button>
                ))}
              </div>
            ) : null}

            {search.trim().length > 0 && !exactMatch && (
              <div className="p-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateNew();
                  }}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-xs rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 font-medium"
                >
                  {creating ? (
                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaPlus />
                  )}
                  <span>{createNewText} "{search}"</span>
                </button>
              </div>
            )}
            
            {filteredOptions.length === 0 && (!search.trim() || exactMatch) && (
              <div className="p-3 text-center text-xs text-slate-500">
                No results found.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartCombobox;
