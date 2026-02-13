import React, { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Cart Context
 * Manages shopping cart state with MOQ (Minimum Order Quantity) logic
 * MOQ Rule: 3 units minimum per item
 */
const CartContext = createContext(null)

// MOQ Constant
const MOQ = 3

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Add item to cart with MOQ logic
  const addItem = useCallback((product) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id)
      
      if (existingItem) {
        // Item exists - increment by 1
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // New item - set quantity to MOQ (3)
        return [...currentItems, { ...product, quantity: MOQ }]
      }
    })
  }, [])

  // One-click restock - adds MOQ quantity specifically for restock feature
  const restockItem = useCallback((product) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id)
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + MOQ }
            : item
        )
      } else {
        return [...currentItems, { ...product, quantity: MOQ }]
      }
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((productId) => {
    setItems(currentItems => currentItems.filter(item => item.id !== productId))
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      // If below 1, remove the item
      removeItem(productId)
      return
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  // Decrement quantity with MOQ protection
  const decrementQuantity = useCallback((productId) => {
    setItems(currentItems => {
      const item = currentItems.find(i => i.id === productId)
      if (!item) return currentItems
      
      if (item.quantity <= MOQ) {
        // At or below MOQ - ask to remove (handled by UI)
        return currentItems
      }
      
      return currentItems.map(i =>
        i.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
    })
  }, [])

  // Clear cart
  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  // Checkout - create order and update inventory
  const checkout = useCallback(async (tenantId, staffId = null) => {
    if (items.length === 0) return { error: 'Cart is empty' }
    
    setIsCheckingOut(true)
    try {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.1
      const total = subtotal + tax

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          tenant_id: tenantId,
          staff_id: staffId,
          status: 'pending',
          total_amount: total,
          tax_amount: tax,
          notes: ''
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        inventory_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update inventory quantities (reduce stock)
      for (const item of items) {
        const { data: inventoryItem } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.id)
          .single()

        if (inventoryItem) {
          await supabase
            .from('inventory')
            .update({ quantity: inventoryItem.quantity - item.quantity })
            .eq('id', item.id)
        }
      }

      // Clear cart on success
      clearCart()
      setIsOpen(false)
      
      return { success: true, order }
    } catch (error) {
      console.error('Checkout error:', error)
      return { error: error.message }
    } finally {
      setIsCheckingOut(false)
    }
  }, [items, clearCart])

  // Getters
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalUniqueItems = items.length
  const estimatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Check if item is in cart
  const getItem = useCallback((productId) => {
    return items.find(item => item.id === productId)
  }, [items])

  // Check if item is already in cart
  const hasItem = useCallback((productId) => {
    return items.some(item => item.id === productId)
  }, [items])

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    decrementQuantity,
    restockItem,
    clearCart,
    checkout,
    totalItems,
    totalUniqueItems,
    estimatedTotal,
    getItem,
    hasItem,
    isOpen,
    setIsOpen,
    isCheckingOut,
    MOQ
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// Custom hook to use cart
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export default CartContext
