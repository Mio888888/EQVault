import type { ProfileIndex } from '../data/types';

interface ProfileListItemProps {
  profile: ProfileIndex;
  onClick: (id: string) => void;
}

const sourceColors: Record<string, string> = {
  oratory1990: 'bg-emerald-100 text-emerald-800',
  crinacle: 'bg-blue-100 text-blue-800',
};

const formLabels: Record<string, string> = {
  'over-ear': 'Over-ear',
  'in-ear': 'In-ear',
  'earbud': 'Earbud',
};

const formColors: Record<string, string> = {
  'over-ear': 'bg-purple-100 text-purple-800',
  'in-ear': 'bg-amber-100 text-amber-800',
  'earbud': 'bg-pink-100 text-pink-800',
};

export default function ProfileListItem({ profile, onClick }: ProfileListItemProps) {
  const sourceBadge = sourceColors[profile.source] ?? 'bg-gray-100 text-gray-800';
  const formBadge = formColors[profile.form] ?? 'bg-gray-100 text-gray-800';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
      onClick={() => onClick(profile.id)}
    >
      {profile.recommended && (
        <span className="text-amber-400 text-sm shrink-0" title="Recommended">&#9733;</span>
      )}
      {!profile.recommended && <span className="w-3.5 shrink-0" />}

      <span className="flex-1 text-sm text-gray-900 truncate" title={profile.name}>
        {profile.name}
      </span>

      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${sourceBadge}`}>
        {profile.source}
      </span>

      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${formBadge}`}>
        {formLabels[profile.form] ?? profile.form}
      </span>
    </div>
  );
}
