import React from 'react'

/**
 * Card Component
 * Reusable white card with Soft UI styling
 * Features aggressive rounding (rounded-3xl) and soft shadows
 */
export default function Card({ 
  children, 
  className = '',
  padding = 'normal', // 'none' | 'small' | 'normal' | 'large'
  shadow = 'normal', // 'none' | 'small' | 'normal' | 'large'
  hover = false
}) {
  // Padding variants
  const paddingClasses = {
    none: '',
    small: 'p-4',
    normal: 'p-6',
    large: 'p-8'
  }

  // Shadow variants
  const shadowClasses = {
    none: '',
    small: 'shadow-soft',
    normal: 'shadow-soft-md',
    large: 'shadow-soft-lg'
  }

  const baseClasses = [
    'bg-white',
    'rounded-3xl',
    paddingClasses[padding],
    shadowClasses[shadow],
    hover && 'transition-all duration-200 hover:shadow-soft-lg',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

/**
 * Card Header Component
 * Consistent header styling for cards
 */
export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * Card Footer Component
 * Consistent footer styling for cards
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 pt-6 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  )
}
