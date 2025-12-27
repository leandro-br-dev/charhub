import { Fragment, createContext, useContext, useState, cloneElement, isValidElement } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface SheetContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextType | null>(null);

export function Sheet({
  children,
  open: controlledOpen,
  onOpenChange: controlledSetOpen,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledSetOpen ?? setUncontrolledOpen;

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
  className = '',
  ...props
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetTrigger must be used within Sheet');

  const handleClick = (e: React.MouseEvent) => {
    context.setOpen(true);
    if (isValidElement(children)) {
      const childProps = children.props as { onClick?: (e: React.MouseEvent) => void };
      if (childProps.onClick) {
        childProps.onClick(e);
      }
    }
  };

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement;
    const childProps = child.props as { className?: string; onClick?: (e: React.MouseEvent) => void };
    
    return cloneElement(child, {
      ...props,
      onClick: handleClick,
      className: `${childProps.className || ''} ${className}`.trim(),
    });
  }

  return (
    <button type="button" onClick={handleClick} className={className} {...props}>
      {children}
    </button>
  );
}

export function SheetContent({
  side = 'right',
  children,
  className = '',
}: {
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetContent must be used within Sheet');
  
  const { open, setOpen } = context;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`pointer-events-none fixed inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} flex max-w-full ${side === 'right' ? 'pl-10' : 'pr-10'}`}>
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom={side === 'right' ? 'translate-x-full' : '-translate-x-full'}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo={side === 'right' ? 'translate-x-full' : '-translate-x-full'}
              >
                <Dialog.Panel className={`pointer-events-auto w-screen max-w-md ${className}`}>
                  <div className="flex h-full flex-col overflow-y-scroll bg-normal shadow-xl">
                    {children}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
