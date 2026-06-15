import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileIndex } from '../data/types';

interface ProfileListItemProps {
  profile: ProfileIndex;
  onClick: (id: string) => void;
}

const sourceColors: Record<string, string> = {
  oratory1990: 'bg-emerald-100/70 text-emerald-800',
  crinacle: 'bg-primary/12 text-primary',
};

const formColors: Record<string, string> = {
  'over-ear': 'bg-violet-100/60 text-violet-800',
  'in-ear': 'bg-amber-100/70 text-amber-800',
  'earbud': 'bg-pink-100/60 text-pink-800',
};

function ProfileListItemInner({ profile, onClick }: ProfileListItemProps) {
  const { t } = useTranslation();
  const sourceBadge = sourceColors[profile.source] ?? 'bg-line text-ink-600';
  const formBadge = formColors[profile.form] ?? 'bg-line text-ink-600';

  const formLabelMap: Record<string, string> = {
    'over-ear': t('item.formOverEar'),
    'in-ear': t('item.formInEar'),
    'earbud': t('item.formEarbud'),
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream cursor-pointer border-b border-line/60 transition-colors"
      onClick={() => onClick(profile.id)}
    >
      {profile.recommended && (
        <span className="text-accent text-sm shrink-0" title={t('item.recommended')}>&#9733;</span>
      )}
      {!profile.recommended && <span className="w-3.5 shrink-0" />}

      <span className="flex-1 text-sm text-ink truncate" title={profile.name}>
        {profile.name}
      </span>

      <span className={`text-xs px-1.5 py-0.5 rounded-control font-medium shrink-0 ${sourceBadge}`}>
        {profile.source}
      </span>

      <span className={`text-xs px-1.5 py-0.5 rounded-control font-medium shrink-0 ${formBadge}`}>
        {formLabelMap[profile.form] ?? profile.form}
      </span>
    </div>
  );
}

export default memo(ProfileListItemInner);
