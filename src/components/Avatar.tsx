import React, { memo, useState } from 'react';

interface AvatarProps {
  src: string | undefined;
  alt: string;
  mini?: boolean;
}

const Avatar = (props: AvatarProps) => {
  const { src, alt, mini } = props;
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };
  console.log('Avatar', src);
  return (
    <div className="flex flex-shrink-0">
      {src === undefined || hasError ? (
        <div className={`${ mini ? 'h-10 w-10' : 'h-16 w-16' } rounded-full animate-colorChange`} />
      ) : (
        <img
          src={src}
          alt={alt}
          className={`${ mini ? 'h-10 w-10' : 'h-16 w-16' } rounded-full`}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default memo(Avatar);