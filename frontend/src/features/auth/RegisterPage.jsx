import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password)
      navigate('/settings/api-key')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            error={error}
          />
          <Button type="submit" loading={loading} className="w-full">
            Tạo tài khoản
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
