import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="text-xs px-2 py-1 rounded-full border border-line text-ink-600 hover:bg-surface hover:text-ink transition-colors font-medium"
    >
      {i18n.language === 'zh' ? 'EN' : '中'}
    </button>
  );
}
