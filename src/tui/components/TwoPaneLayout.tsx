import { Box } from 'ink';
import React from 'react';

type TwoPaneLayoutProps = {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
};

export function TwoPaneLayout({
  leftPane,
  rightPane,
  leftWidth = 40,
  rightWidth = 60,
}: TwoPaneLayoutProps) {
  return (
    <Box width="100%" height="100%">
      <Box width={`${leftWidth}%`} borderStyle="single" borderRight>
        {leftPane}
      </Box>
      <Box width={`${rightWidth}%`} borderStyle="single" paddingLeft={1}>
        {rightPane}
      </Box>
    </Box>
  );
}
