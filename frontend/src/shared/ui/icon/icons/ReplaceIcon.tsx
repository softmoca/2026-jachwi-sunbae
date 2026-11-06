import IconBase, { type IconProps } from '../IconBase';

const ReplaceIcon = (props: Omit<IconProps, 'children'>) => (
  <IconBase {...props}>
    <path d="M20 7a8 8 0 0 0-14-1M20 3v4h-4M4 17a8 8 0 0 0 14 1M4 21v-4h4" />
  </IconBase>
);

export default ReplaceIcon;
