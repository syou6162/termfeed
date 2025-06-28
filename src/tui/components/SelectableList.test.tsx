import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { SelectableList } from './SelectableList.js';

describe('SelectableList Component', () => {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  const renderItem = (item: string) => item;

  it('should render all items', () => {
    const { lastFrame } = render(
      <SelectableList items={items} selectedIndex={0} renderItem={renderItem} />
    );

    const frame = lastFrame();
    expect(frame).toContain('Item 1');
    expect(frame).toContain('Item 2');
    expect(frame).toContain('Item 3');
  });

  it('should show selection indicator', () => {
    const { lastFrame } = render(
      <SelectableList items={items} selectedIndex={1} renderItem={renderItem} />
    );

    const frame = lastFrame();
    expect(frame).toContain('> Item 2');
    expect(frame).toContain('  Item 1');
    expect(frame).toContain('  Item 3');
  });

  it('should show empty message when no items', () => {
    const { lastFrame } = render(
      <SelectableList
        items={[]}
        selectedIndex={0}
        renderItem={renderItem}
        emptyMessage="No items available"
      />
    );

    expect(lastFrame()).toBe('No items available');
  });

  it('should not highlight when inactive', () => {
    const { lastFrame } = render(
      <SelectableList items={items} selectedIndex={0} renderItem={renderItem} isActive={false} />
    );

    const frame = lastFrame();
    expect(frame).toContain('> Item 1');
    // 非アクティブ時も選択インジケータは表示されるが、色付けはされない
  });

  it('should work with custom render function', () => {
    const customItems = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
    ];
    const customRender = (item: (typeof customItems)[0]) => `${item.id}: ${item.name}`;

    const { lastFrame } = render(
      <SelectableList items={customItems} selectedIndex={0} renderItem={customRender} />
    );

    const frame = lastFrame();
    expect(frame).toContain('> 1: First');
    expect(frame).toContain('  2: Second');
  });
});
