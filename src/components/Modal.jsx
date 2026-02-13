import React from 'react'
import { X } from 'lucide-react'

/**
 * Modal Component
 * Reusable modal with overlay and close button
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md',
  showCloseButton = true,
  hasHeader = true
}) {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-3xl shadow-soft-lg w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 ${hasHeader ? '' : 'hidden'}`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showCloseButton && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
