import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Hello } from './Hello.js';

describe('Hello Component', () => {
  it('should render default greeting', () => {
    const { lastFrame } = render(<Hello />);
    expect(lastFrame()).toBe('Hello, World!');
  });

  it('should render greeting with custom name', () => {
    const { lastFrame } = render(<Hello name="termfeed" />);
    expect(lastFrame()).toBe('Hello, termfeed!');
  });
});
