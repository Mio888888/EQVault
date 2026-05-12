import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (local === value) return;
    const timer = setTimeout(() => {
      onChange(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(() => {
    setLocal('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          aria-label={t('search.clear')}
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
