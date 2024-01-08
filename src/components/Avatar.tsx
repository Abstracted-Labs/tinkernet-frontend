import React, { useState } from 'react';

interface AvatarProps {
  src: string;
  alt: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className="flex flex-shrink-0">
      {hasError ? (
        <div className="h-16 w-16 rounded-full animate-colorChange" />
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-16 w-16 rounded-full"
          onError={handleError}
        />
      )}
    </div>
  );
};

export default Avatar;