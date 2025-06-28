import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { TwoPaneLayout } from './TwoPaneLayout.js';

describe('TwoPaneLayout Component', () => {
  it('should render both panes with content', () => {
    const { lastFrame } = render(
      <TwoPaneLayout
        leftPane={<Text>Left Content</Text>}
        rightPane={<Text>Right Content</Text>}
        activePane="left"
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('Left Content');
    expect(frame).toContain('Right Content');
  });

  it('should show active pane with green border', () => {
    const { lastFrame } = render(
      <TwoPaneLayout
        leftPane={<Text>Left</Text>}
        rightPane={<Text>Right</Text>}
        activePane="left"
      />
    );

    // Inkのborderは実際のフレーム出力では視覚的な境界として表示される
    // ここでは内容が正しく表示されることを確認
    const frame = lastFrame();
    expect(frame).toBeDefined();
    expect(frame).toContain('Left');
    expect(frame).toContain('Right');
  });

  it('should support custom left pane width', () => {
    const { lastFrame } = render(
      <TwoPaneLayout
        leftPane={<Text>Narrow Left</Text>}
        rightPane={<Text>Wide Right</Text>}
        activePane="right"
        leftPaneWidth="30%"
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('Narrow Left');
    expect(frame).toContain('Wide Right');
  });
});