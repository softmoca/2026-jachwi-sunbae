import IconBase, { type IconProps } from '../IconBase';

type CategoryIconProps = Omit<IconProps, 'children'>;

export const LockIcon = (props: CategoryIconProps) => (
  <IconBase {...props}>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
  </IconBase>
);

export const WindowIcon = (props: CategoryIconProps) => (
  <IconBase {...props}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M12 3v18M4 12h16" />
  </IconBase>
);

export const DropletIcon = (props: CategoryIconProps) => (
  <IconBase {...props}>
    <path d="M12 3c-2 4-7 7-7 11a7 7 0 0 0 14 0c0-4-5-7-7-11ZM9 15a3 3 0 0 0 3 3" />
  </IconBase>
);

export const BedIcon = (props: CategoryIconProps) => (
  <IconBase {...props}>
    <path d="M3 18v3M21 18v3M3 13h18v5H3ZM5 13V5h14v8M8 9h3v4H8ZM13 9h3v4h-3Z" />
  </IconBase>
);
