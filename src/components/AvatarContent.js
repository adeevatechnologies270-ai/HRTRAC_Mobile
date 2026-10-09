import React, { useEffect, useState } from 'react';
import { Image, Text } from 'react-native';
import resolveMediaUrl from '../utils/resolveMediaUrl';

const AvatarContent = ({ uri, letter = 'A', imageStyle, textStyle }) => {
  const resolved = resolveMediaUrl(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (resolved && !failed) {
    return (
      <Image
        source={{ uri: resolved }}
        style={imageStyle}
        onError={() => setFailed(true)}
      />
    );
  }
  return <Text style={textStyle}>{letter}</Text>;
};

export default AvatarContent;