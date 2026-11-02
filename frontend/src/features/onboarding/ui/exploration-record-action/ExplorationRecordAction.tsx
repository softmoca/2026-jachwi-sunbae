import { useNavigate } from 'react-router-dom';

import type { MapAddress } from '@/features/map/model/Map';
import { LOGIN_PATH } from '@/shared/lib/navigation/appPaths';
import { Button } from '@/shared/ui/button/Button';

import { prepareExplorationRecord } from '../../lib/explorationJourney';

type Props = { location: MapAddress; className?: string };

const ExplorationRecordAction = ({ location, className }: Props) => {
  const navigate = useNavigate();
  return (
    <Button
      className={className}
      fullWidth
      onClick={() => {
        prepareExplorationRecord(location);
        navigate(LOGIN_PATH);
      }}
    >
      이 동네에서 본 방 기록하기
    </Button>
  );
};
export default ExplorationRecordAction;
