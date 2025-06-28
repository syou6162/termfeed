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
    <Box width="100%" height="100%" flexDirection="row">
      <Box width={`${leftWidth}%`} borderStyle="single" borderRight flexShrink={0}>
        {leftPane}
      </Box>
      <Box width={`${rightWidth}%`} flexShrink={0} flexGrow={1}>
        {rightPane}
      </Box>
    </Box>
  );
}
