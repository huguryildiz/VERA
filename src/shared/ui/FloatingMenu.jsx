import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFloating } from '../hooks/useFloating';

/**
 * FloatingMenu — reusable action menu for table rows and cards.
 * Props:
 *   trigger: ReactNode — the button that opens the menu
 *   isOpen: boolean
 *   onClose: () => void
 *   children: ReactNode — menu items
 *   placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' — default 'bottom-end'
 *   menuClassName: string — optional additional classes for the menu container
 */
export default function FloatingMenu({
  trigger,
  isOpen,
  onClose,
  children,
  placement = 'bottom-end',
  menuClassName = '',
}) {
  const triggerRef = useRef(null);
  const { floatingRef, floatingStyle } = useFloating({
    triggerRef,
    isOpen,
    onClose,
    placement,
    offset: 4,
  });

  return (
    <>
      <span ref={triggerRef}>{trigger}</span>
      {isOpen && createPortal(
        <div
          ref={floatingRef}
          className={`floating-menu${menuClassName ? ` ${menuClassName}` : ''}`}
          style={floatingStyle}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
