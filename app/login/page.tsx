'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import { authAPI } from '@/lib/api';
import { setAuthToken, setUser } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      setAuthToken(response.token);
      setUser(response.user);
      toast.success('Connexion réussie');
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur de connexion';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-scale-up">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Bienvenue
          </h1>
          <p className="text-slate-600 text-lg">Connectez-vous à votre compte GTA</p>
        </div>

        <div className="bg-white shadow  border border-slate-200 p-8 transition-shadow duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-slide-in">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              disabled={loading}
              className="border focus:ring-1 focus:ring-cyan-200"
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              disabled={loading}
              className="border focus:ring-1 focus:ring-cyan-200"
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              size="sm"
              variant="primary"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                <>
                  {/* <LogIn className="w-5 h-5 mr-2" /> */}
                  Se connecter
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center pt-6 border-t-2 border-slate-100">
            <p className="text-sm text-slate-600">
              Vous n'avez pas de compte ?{' '}
              <Link
                href="/register"
                className="font-semibold text-cyan-600 hover:text-cyan-700 transition-colors hover:underline"
              >
                S'inscrire
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          © 2025 GTA - Système de gestion des temps
        </p>
      </div>
    </div>
  );
}
