import React, { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Trash2, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import Card from '../components/Card'
import Modal from '../components/Modal'

/**
 * Cart Drawer
 * Slide-out cart panel for reviewing and editing orders
 */
export default function CartDrawer() {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    totalItems, 
    estimatedTotal, 
    updateQuantity, 
    removeItem, 
    checkout,
    isCheckingOut,
    MOQ 
  } = useCart()

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState('review') // 'review', 'success', 'error'
  const [checkoutError, setCheckoutError] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)

  if (!isOpen) return null

  // Start checkout process
  const handleStartCheckout = async () => {
    setLoadingStaff(true)
    try {
      const { profile } = await getCurrentUser()
      if (!profile) {
        setCheckoutError('Please log in to complete checkout')
        return
      }

      // Fetch staff for this tenant
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name')

      setStaffList(staffData || [])
      setShowCheckoutModal(true)
      setCheckoutStep('review')
    } catch (err) {
      setCheckoutError('Failed to load staff list')
    } finally {
      setLoadingStaff(false)
    }
  }

  // Complete checkout
  const handleCompleteCheckout = async () => {
    setCheckoutError('')
    try {
      const { profile } = await getCurrentUser()
      if (!profile) {
        setCheckoutError('Please log in to complete checkout')
        return
      }

      const staffId = selectedStaffId || null
      const result = await checkout(profile.tenant_id, staffId)

      if (result.error) {
        setCheckoutError(result.error)
        setCheckoutStep('error')
      } else {
        setCheckoutStep('success')
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowCheckoutModal(false)
          setCheckoutStep('review')
          setSelectedStaffId('')
        }, 2000)
      }
    } catch (err) {
      setCheckoutError('Checkout failed. Please try again.')
      setCheckoutStep('error')
    }
  }

  // Cancel checkout
  const handleCancelCheckout = () => {
    setShowCheckoutModal(false)
    setCheckoutStep('review')
    setCheckoutError('')
    setSelectedStaffId('')
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:bg-transparent"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-gray-50 z-40 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Your Cart</h2>
              <p className="text-sm text-gray-500">{totalItems} items</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Your cart is empty</h3>
              <p className="text-gray-500">Add items from the shop to get started</p>
            </div>
          ) : (
            items.map(item => (
              <Card key={item.id} padding="small" className="relative">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.size}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => item.quantity > MOQ ? updateQuantity(item.id, item.quantity - 1) : null}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          item.quantity <= MOQ 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'hover:bg-white text-gray-600'
                        }`}
                        disabled={item.quantity <= MOQ}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg hover:bg-white text-gray-600 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {item.quantity <= MOQ && (
                      <span className="text-xs text-blue-600">Min: {MOQ}</span>
                    )}
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Item Total */}
                <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bg-white border-t border-gray-100 p-6 space-y-4">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">${estimatedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax (estimated)</span>
                <span className="font-medium text-gray-900">${(estimatedTotal * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-900">Estimated Total</span>
                <span className="font-bold text-xl text-gray-900">
                  ${(estimatedTotal * 1.1).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <button 
              onClick={handleStartCheckout}
              disabled={isCheckingOut || loadingStaff}
              className="w-full btn-primary py-4 disabled:opacity-50"
            >
              {isCheckingOut ? 'Processing...' : 'Review & Submit Order'}
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full btn-secondary"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={handleCancelCheckout}
        title={checkoutStep === 'success' ? 'Order Placed!' : 'Complete Order'}
        maxWidth="md"
      >
        {checkoutStep === 'review' && (
          <div className="p-6 space-y-4">
            <p className="text-gray-600">
              Please review your order and select a staff member to assign this order to (optional).
            </p>
            
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} x{item.quantity}</span>
                  <span className="text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${(estimatedTotal * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Staff Member (Optional)
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="input-soft w-full"
              >
                <option value="">-- Select staff member --</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
            </div>

            {checkoutError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                {checkoutError}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCancelCheckout}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteCheckout}
                disabled={isCheckingOut}
                className="flex-1 px-4 py-3 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isCheckingOut ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}

        {checkoutStep === 'success' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Placed Successfully!</h3>
            <p className="text-gray-600">
              Your order has been submitted and inventory has been updated.
            </p>
          </div>
        )}

        {checkoutStep === 'error' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Failed</h3>
            <p className="text-gray-600 mb-4">
              {checkoutError || 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={() => setCheckoutStep('review')}
              className="px-4 py-3 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
