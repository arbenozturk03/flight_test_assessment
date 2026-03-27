interface TusasLogoProps {
  className?: string;
}

export default function TusasLogo({ className = 'h-10' }: TusasLogoProps) {
  return <img src="/tusas-logo.svg" alt="TUSAŞ" className={className} />;
}
