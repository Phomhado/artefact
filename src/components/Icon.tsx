type IconProps = {
  name: 'plus' | 'edit' | 'trash' | 'arrow' | 'stack';
  className?: string;
};

const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" />,
  trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  stack: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6v4H9zM9 11h6M9 15h4" />
    </>
  ),
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
