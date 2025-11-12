"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        window.location.href = "/"
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Login form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-6">
            

            <div className="text-center space-y-2">
              <h1 className="text-6xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Mail</span>
                <span className="text-foreground">Auto</span>
              </h1>
              <p className="text-sm text-muted-foreground">Email Automation Platform</p>
            </div>
          </div>

          <div className="text-center space-y-3 pt-2">
            <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-base text-muted-foreground">Enter your credentials to access your account</p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to your account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Create a free account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center text-xs text-muted-foreground">
            <p>
              By signing in, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Feature showcase */}
      <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_70%)]" />

        <div className="relative z-10 max-w-lg space-y-8 text-white">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">Powerful email automation at your fingertips</h2>
            <p className="text-xl text-blue-100">Create, manage, and track email campaigns with precision and ease.</p>
          </div>

          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-white/20 p-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Advanced Campaign Management</h3>
                <p className="text-blue-100">
                  Design, schedule, and optimize your email campaigns with powerful tools.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-white/20 p-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Audience Segmentation</h3>
                <p className="text-blue-100">
                  Target the right people with intelligent audience segmentation and personalization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-white/20 p-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Real-time Analytics</h3>
                <p className="text-blue-100">Track performance with detailed analytics and actionable insights.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
