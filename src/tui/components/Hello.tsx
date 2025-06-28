import React from 'react';
import { Text } from 'ink';

type HelloProps = {
  name?: string;
};

export const Hello: React.FC<HelloProps> = ({ name = 'World' }) => {
  return <Text>Hello, {name}!</Text>;
};
