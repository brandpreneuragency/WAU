// Test script to create a test user
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vuahfoaufzshipzwvvqi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1YWhmb2F1ZnpzaGlwend2dnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDMyNTksImV4cCI6MjA4NjE3OTI1OX0.2aVgNSh7PDmROyGmua2OqrjPyeoxrHMjbIdqRQu-MVI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  try {
    // Try to sign up a test user
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@test.com',
      password: 'admin123',
      options: {
        data: {
          role: 'super_admin'
        }
      }
    })
    
    console.log('Signup result:', { data, error })
    
    // Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    console.log('Signin result:', { signInData, signInError })
    
  } catch (err) {
    console.error('Test error:', err)
  }
}

testAuth()
