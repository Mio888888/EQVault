import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { List } from 'react-window';
import type { ProfileIndex } from '../data/types';
import ProfileListItem from './ProfileListItem';

interface ProfileListProps {
  profiles: ProfileIndex[];
  onSelect: (id: string) => void;
}

interface RowData {
  profiles: ProfileIndex[];
  onSelect: (id: string) => void;
}

const ROW_HEIGHT = 44;

function RowComponent({
  index,
  style,
  profiles,
  onSelect,
}: {
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: CSSProperties;
} & RowData): ReactElement {
  const profile = profiles[index];
  return (
    <div style={style}>
      <ProfileListItem profile={profile} onClick={onSelect} />
    </div>
  );
}

export default function ProfileList({ profiles, onSelect }: ProfileListProps) {
  const { t } = useTranslation();
  const [listHeight, setListHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      const height = Math.max(300, window.innerHeight - 280);
      setListHeight(height);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const rowProps = useCallback(
    () => ({ profiles, onSelect }),
    [profiles, onSelect]
  );

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        {t('list.empty')}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <List
        rowComponent={RowComponent}
        rowCount={profiles.length}
        rowHeight={ROW_HEIGHT}
        rowProps={rowProps()}
        style={{ height: listHeight }}
        overscanCount={5}
      />
    </div>
  );
}
