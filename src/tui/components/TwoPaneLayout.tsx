import React, { ReactNode } from 'react';
import { Box } from 'ink';
import type { Pane } from '../types/index.js';

type TwoPaneLayoutProps = {
  leftPane: ReactNode;
  rightPane: ReactNode;
  activePane: Pane;
  leftPaneWidth?: number | string;
};

export const TwoPaneLayout: React.FC<TwoPaneLayoutProps> = ({
  leftPane,
  rightPane,
  activePane,
  leftPaneWidth = '40%',
}) => {
  const leftBorderColor = activePane === 'left' ? 'green' : 'gray';
  const rightBorderColor = activePane === 'right' ? 'green' : 'gray';

  return (
    <Box flexDirection="row" height="100%">
      <Box
        width={leftPaneWidth}
        borderStyle="single"
        borderColor={leftBorderColor}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
      >
        {leftPane}
      </Box>
      <Box
        flexGrow={1}
        borderStyle="single"
        borderColor={rightBorderColor}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
      >
        {rightPane}
      </Box>
    </Box>
  );
};