import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal component that renders via React Portal to avoid stacking context issues
 * Ensures position: fixed always works correctly regardless of parent CSS properties
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-xl border border-gray-100',
          'max-h-[90vh] overflow-y-auto',
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;