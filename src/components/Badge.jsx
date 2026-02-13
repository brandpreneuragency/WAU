import React from 'react'

/**
 * Badge Component
 * Pill-shaped status indicators with pastel colors
 * Used for stock status, order status, etc.
 */
export default function Badge({ 
  children, 
  variant = 'gray', // 'gray' | 'red' | 'green' | 'yellow' | 'blue'
  size = 'md' // 'sm' | 'md'
}) {
  // Variant styles with pastel backgrounds and darker text
  const variantClasses = {
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-600'
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }

  const classes = [
    'inline-flex items-center font-medium rounded-full',
    variantClasses[variant],
    sizeClasses[size]
  ].join(' ')

  return (
    <span className={classes}>
      {children}
    </span>
  )
}

/**
 * Pre-configured badges for common use cases
 */
export function StockBadge({ quantity, minThreshold = 10 }) {
  if (quantity <= 0) {
    return <Badge variant="red">Out of Stock</Badge>
  }
  if (quantity <= minThreshold) {
    return <Badge variant="yellow">Low Stock ({quantity})</Badge>
  }
  return <Badge variant="green">In Stock ({quantity})</Badge>
}

export function StatusBadge({ status }) {
  const statusConfig = {
    pending: { variant: 'yellow', label: 'Pending' },
    processing: { variant: 'blue', label: 'Processing' },
    completed: { variant: 'green', label: 'Completed' },
    cancelled: { variant: 'red', label: 'Cancelled' },
    draft: { variant: 'gray', label: 'Draft' }
  }

  const config = statusConfig[status] || { variant: 'gray', label: status }
  
  return <Badge variant={config.variant}>{config.label}</Badge>
}
