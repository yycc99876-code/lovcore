import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sparkles,
  Table,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { SlashCommandItem } from './slashCommands';

const iconMap: Record<string, LucideIcon> = {
  Type,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  List,
  Table,
  Minus,
  Image,
  Code,
  Quote,
  Sparkles,
};

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  function SlashCommandMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const lastNavigationAtRef = useRef(0);
    const selectedSafeIndex = items.length > 0
      ? Math.min(selectedIndex, items.length - 1)
      : 0;

    const scrollSelectedIntoView = useCallback((nextIndex: number) => {
      window.setTimeout(() => {
        const selectedElement = listRef.current?.querySelectorAll<HTMLElement>(
          '.slash-command-popup-item',
        )[nextIndex];

        selectedElement?.scrollIntoView({ block: 'nearest' });
      }, 0);
    }, []);

    const moveSelection = useCallback((direction: 1 | -1) => {
      const now = performance.now();

      if (now - lastNavigationAtRef.current < 70) {
        return;
      }

      lastNavigationAtRef.current = now;
      const nextIndex = (
        selectedSafeIndex + direction + items.length
      ) % items.length;

      setSelectedIndex(nextIndex);
      scrollSelectedIntoView(nextIndex);
    }, [items.length, scrollSelectedIntoView, selectedSafeIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent): boolean => {
        if (items.length === 0) return false;

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveSelection(-1);
          return true;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveSelection(1);
          return true;
        }

        if (event.key === 'Tab') {
          event.preventDefault();
          moveSelection(event.shiftKey ? -1 : 1);
          return true;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const item = items[selectedSafeIndex];
          if (item) command(item);
          return true;
        }

        return false;
      },
    }), [command, items, moveSelection, selectedSafeIndex]);

    if (items.length === 0) {
      return (
        <div className="slash-command-popup">
          <div className="slash-command-empty">无匹配命令</div>
        </div>
      );
    }

    const groups = Array.from(
      items.reduce((groupMap, item) => {
        const groupItems = groupMap.get(item.group) ?? [];
        groupItems.push(item);
        groupMap.set(item.group, groupItems);
        return groupMap;
      }, new Map<string, SlashCommandItem[]>()),
      ([label, groupItems]) => ({ label, items: groupItems }),
    );

    let flatIndex = -1;

    return (
      <div className="slash-command-popup">
        <div className="slash-command-list" ref={listRef}>
          {groups.map((group) => (
            <div key={group.label}>
              <div className="slash-command-group-label">{group.label}</div>
              {group.items.map((item) => {
                flatIndex += 1;
                const itemIndex = flatIndex;
                const Icon = iconMap[item.icon] ?? Type;
                const isSelected = itemIndex === selectedSafeIndex;

                return (
                  <button
                    type="button"
                    key={item.title}
                    className={`slash-command-popup-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => command(item)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <span className="slash-command-popup-icon">
                      <Icon size={20} />
                    </span>
                    <span className="slash-command-popup-copy">
                      <span className="slash-command-popup-title">{item.title}</span>
                      <span className="slash-command-popup-desc">{item.description}</span>
                    </span>
                    {item.alias && (
                      <span className="slash-command-popup-alias">/{item.alias}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

export default SlashCommandMenu;
