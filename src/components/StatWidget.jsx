import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * StatWidget Component
 * Dashboard statistic card with number, label, and optional trend indicator
 * Soft UI design with pill-shaped trend badges
 */
export default function StatWidget({ 
  title, 
  value, 
  subtitle,
  trend = null, // { value: number, direction: 'up' | 'down' | 'neutral' }
  icon: Icon,
  color = 'gray' // 'gray' | 'blue' | 'green' | 'red' | 'yellow'
}) {
  // Color variants for icon background
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  }

  // Trend indicator
  const renderTrend = () => {
    if (!trend) return null

    const { value: trendValue, direction } = trend
    
    const trendClasses = {
      up: 'bg-green-50 text-green-600',
      down: 'bg-red-50 text-red-600',
      neutral: 'bg-gray-100 text-gray-600'
    }

    const TrendIcon = {
      up: TrendingUp,
      down: TrendingDown,
      neutral: Minus
    }[direction]

    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${trendClasses[direction]}`}>
        <TrendIcon className="w-3 h-3" />
        <span>{trendValue}%</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-soft-md p-4 md:p-6 hover:shadow-soft-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              {value}
            </h4>
            {renderTrend()}
          </div>
          {subtitle && (
            <p className="text-[10px] md:text-sm text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        
        {Icon && (
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
