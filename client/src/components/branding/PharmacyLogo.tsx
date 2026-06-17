import {useId} from 'react';

type PharmacyLogoProps = {
  size?: number;
  showText?: boolean;
  title?: string;
  tone?: 'light' | 'dark';
};

const PharmacyLogo = ({ size = 44, showText = false, title = 'Pharmacy System', tone = 'dark' }: PharmacyLogoProps) => {
  const textColor = tone === 'light' ? '#ffffff' : '#12343b';
  const id = useId().replace(/:/g, '');
  const bgId = `${id}-pharmacyLogoBg`;
  const leafId = `${id}-pharmacyLogoLeaf`;

  return (
    <div className='brand-logo' aria-label={title}>
      <svg
        width={size}
        height={size}
        viewBox='0 0 64 64'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-hidden='true'
      >
        <defs>
          <linearGradient id={bgId} x1='10' y1='8' x2='54' y2='58' gradientUnits='userSpaceOnUse'>
            <stop stopColor='#14b8a6' />
            <stop offset='1' stopColor='#2563eb' />
          </linearGradient>
          <linearGradient id={leafId} x1='39' y1='14' x2='53' y2='28' gradientUnits='userSpaceOnUse'>
            <stop stopColor='#86efac' />
            <stop offset='1' stopColor='#38bdf8' />
          </linearGradient>
        </defs>
        <rect x='5' y='5' width='54' height='54' rx='16' fill='#ecfeff' />
        <rect x='9' y='9' width='46' height='46' rx='14' fill={`url(#${bgId})`} />
        <path
          d='M32 15.5C24.3 19.5 19.8 24.9 19.8 32.5C19.8 39.8 25.1 45.6 32 48.1C38.9 45.6 44.2 39.8 44.2 32.5C44.2 24.9 39.7 19.5 32 15.5Z'
          fill='rgba(255,255,255,0.18)'
          stroke='rgba(255,255,255,0.58)'
          strokeWidth='2'
        />
        <path
          d='M32 21V42'
          stroke='#ffffff'
          strokeWidth='5'
          strokeLinecap='round'
        />
        <path
          d='M22 31.5H42'
          stroke='#ffffff'
          strokeWidth='5'
          strokeLinecap='round'
        />
        <path
          d='M40.2 15.2C46.1 15.8 50.3 19.7 51.1 25.5C45.4 25.2 41.1 21.3 40.2 15.2Z'
          fill={`url(#${leafId})`}
        />
      </svg>
      {showText && (
        <span className='brand-logo__text'>
          <strong style={{ color: textColor }}>{title}</strong>
        </span>
      )}
    </div>
  );
};

export default PharmacyLogo;
