import {
  cloneElement,
  Fragment,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { Menu, Portal, Transition } from '@headlessui/react';

type ButtonElement = ReactElement<{ className?: string }>;

type SmartDropdownProps = {
  buttonContent: ButtonElement;
  buttonProps?: Record<string, unknown>;
  menuWidth?: string;
  children: ReactNode;
};

export function SmartDropdown({
  buttonContent,
  buttonProps,
  menuWidth = 'w-56',
  children
}: SmartDropdownProps): JSX.Element {
  const buttonRef = useRef<HTMLElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const calculatePosition = useCallback(() => {
    window.requestAnimationFrame(() => {
      const target = buttonRef.current;
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 224; // ~max-h-56
      const openUpwards = spaceBelow < menuHeight && rect.top > spaceBelow;
      const openLeftwards = rect.left + rect.width / 2 > window.innerWidth / 2;

      const style: CSSProperties = {
        position: 'fixed',
        minWidth: `${rect.width}px`,
        left: openLeftwards ? 'auto' : `${rect.left}px`,
        right: openLeftwards ? `${window.innerWidth - rect.right}px` : 'auto',
        top: openUpwards ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openUpwards ? `${window.innerHeight - rect.top + 4}px` : 'auto'
      };

      setMenuStyle(style);
    });
  }, []);

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => {
        useEffect(() => {
          if (!open) {
            return undefined;
          }

          calculatePosition();
          window.addEventListener('scroll', calculatePosition, true);
          window.addEventListener('resize', calculatePosition);

          return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
          };
        }, [open, calculatePosition]);

        const clonedButton = cloneElement(
          buttonContent,
          {
            ...buttonProps,
            ref: (node: HTMLElement | null) => {
              buttonRef.current = node;
            }
          } as unknown as ButtonElement['props'] & { ref: (node: HTMLElement | null) => void }
        );

        return (
          <>
            <Menu.Button as={Fragment}>{clonedButton}</Menu.Button>

            <Portal>
              <Transition
                as={Fragment}
                show={open}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items
                  className={`${menuWidth} rounded-md bg-light shadow-lg ring-1 ring-black/5 focus:outline-none z-50`}
                  style={menuStyle}
                >
                  <div className="p-1" onClick={(event) => event.stopPropagation()}>
                    {children}
                  </div>
                </Menu.Items>
              </Transition>
            </Portal>
          </>
        );
      }}
    </Menu>
  );
}