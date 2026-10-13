import IconBase, { type IconProps } from '../IconBase';

const StoreIcon = (props: Omit<IconProps, 'children'>) => (
  <IconBase {...props}>
    <path d="M4 10v10h16V10M3 10l2-6h14l2 6" />
    <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6M9 4v6M15 4v6" />
  </IconBase>
);

export default StoreIcon;
