'use client'

import React, { useState, FormEvent } from 'react'
import { Eye, EyeOff, Github, Chrome, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const FormInput = ({
  id,
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  id: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon: React.ElementType
}) => (
  <div className="relative flex items-center">
    <Icon className="absolute left-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
    <Input
      id={id}
      name={id}
      type={type}
      required
      className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
)

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState<'github' | 'google' | null>(null)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    setIsSocialLoading(provider)
    try {
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch (err) {
      toast.error(`Failed to sign in with ${provider}`)
      setIsSocialLoading(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      if (activeTab === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          throw new Error('Signup failed')
        }
        toast.success('Account created successfully! Please log in.')
        setActiveTab('login')
      } else {
        const result = await signIn('credentials', {
          redirect: false,
          email: formData.email,
          password: formData.password,
          callbackUrl: '/dashboard',
        })
        if (result?.error) {
          throw new Error(result.error)
        }
        toast.success('Logged in successfully!')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${activeTab}`
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full justify-center min-h-full bg-gray-100 dark:bg-gray-900">
      <main className="  align-middle justify-center container mx-auto px-4 py-8 ">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {activeTab === 'login' ? 'Welcome Back!' : 'Create an Account'}
            </h1>
          </div>

          <div className=" gap-2 justify-center mb-6 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <Button
              variant={activeTab === 'login' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('login')}
              className={`w-1/2 text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              aria-pressed={activeTab === 'login'}
            >
              Login
            </Button>
            <Button
              variant={activeTab === 'signup' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('signup')}
              className={`w-1/2 text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              aria-pressed={activeTab === 'signup'}
            >
              Sign Up
            </Button>
          </div>

          <div className="justify-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('github')}
              disabled={!!isSocialLoading}
              className="flex items-center justify-center w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign in with GitHub"
              aria-busy={isSocialLoading === 'github'}
            >
              {isSocialLoading === 'github' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Github className="w-5 h-5 mr-2" aria-hidden="true" />
              )}
              <span className="text-sm font-medium">GitHub</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={!!isSocialLoading}
              className="flex items-center justify-center w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign in with Google"
              aria-busy={isSocialLoading === 'google'}
            >
              {isSocialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Chrome className="w-5 h-5 mr-2" aria-hidden="true" />
              )}
              <span className="text-sm font-medium">Google</span>
            </Button>
          </div>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {activeTab === 'signup' && (
              <FormInput
                id="name"
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                icon={User}
              />
            )}

            <FormInput
              id="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              icon={Mail}
            />

            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !!isSocialLoading}
              className="w-full flex justify-center items-center bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-400 dark:disabled:bg-blue-700 disabled:cursor-not-allowed transition-colors"
              aria-label={activeTab === 'login' ? 'Log in' : 'Create account'}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <span className="flex items-center">
                  {activeTab === 'login' ? 'Login' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  )
}