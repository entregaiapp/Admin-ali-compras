import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Store, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../schemas/loginSchema';
import { authService } from '../services/authService';
import { MfaLoginStep } from './MfaLoginStep';
import type { LoginResponse } from '../types/auth';

const PRIMARY = '#122a4c';
const PLATFORM_BRANDING = {
  nome: 'Painel Administrativo',
  slogan: 'Gestão completa da operação da sua loja',
  cor_primaria: PRIMARY,
  cor_secundaria: '#16a34a'
};

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const recoveryParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const resetAccessToken = searchParams.get('access_token') || recoveryParams.get('access_token') || '';
  const resetRefreshToken = searchParams.get('refresh_token') || recoveryParams.get('refresh_token') || undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(resetAccessToken ? 'reset' : 'login');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaSession, setMfaSession] = useState<LoginResponse | null>(null);
  const navigate = useNavigate();
  const { loginAs, persistSession } = useAuth();

  const primaryColor = PLATFORM_BRANDING.cor_primaria;
  const secondaryColor = PLATFORM_BRANDING.cor_secundaria;

  if (mfaSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <MfaLoginStep
            session={mfaSession}
            onCancel={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              setMfaSession(null);
            }}
            onComplete={(session) => {
              persistSession(session);
              navigate('/dashboard');
            }}
          />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Informe seu e-mail.');
        return;
      }

      setLoading(true);

      try {
        const response = await authService.forgotPassword(email.trim());
        setMessage(response.message || 'Verifique seu e-mail para redefinir a senha.');
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Não foi possível iniciar a recuperação.');
      } finally {
        setLoading(false);
      }

      return;
    }

    if (mode === 'reset') {
      if (!resetAccessToken) {
        setError('Link de recuperação inválido.');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        setError('As senhas não conferem.');
        return;
      }

      setLoading(true);

      try {
        const response = await authService.resetPassword(resetAccessToken, resetRefreshToken, password);
        setMessage(response.message || 'Senha redefinida com sucesso.');
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        navigate('/login', { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Não foi possível redefinir a senha.');
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!loginSchema.validate(email, password)) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    
    try {
      let response = await loginAs(email, password, 'tenant');
      
      if (response && response.access_token) {
        const user = persistSession(response);

        if (user?.perfil === 'entregador') {
          try {
            response = await loginAs(email, password, 'driver');
            persistSession(response);
          } catch (driverLoginError) {
            console.warn('Driver login fallback failed, keeping tenant login response.', driverLoginError);
          } finally {
            navigate('/driver');
            return;
          }
        }

        if (response.mfa_required && response.aal !== 'aal2') {
          setMfaSession(response);
          return;
        }

        navigate('/dashboard');
      } else {
        setError('Falha no login: Resposta inválida.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f0f4f8' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-center w-1/2 p-12 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-lg">
          <div className="mb-10">
            <div className="h-24 w-24 rounded-2xl bg-white/15 flex items-center justify-center border border-white/15">
              <Store className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white/80 border border-white/15 bg-white/10 mb-5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
            Plataforma Administrativa
          </div>
          <h1 className="text-5xl font-semibold leading-tight mb-5">
            {PLATFORM_BRANDING.nome}
          </h1>
          <p className="text-white/75 text-xl leading-relaxed max-w-md">
            {PLATFORM_BRANDING.slogan}
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{PLATFORM_BRANDING.nome}</div>
              <div className="text-gray-500 text-sm line-clamp-1">{PLATFORM_BRANDING.slogan}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-gray-900 font-semibold text-2xl mb-1">
              {mode === 'forgot' ? 'Recuperar senha' : mode === 'reset' ? 'Nova senha' : 'Entrar no painel'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {mode === 'forgot'
                ? 'Informe o e-mail cadastrado no painel'
                : mode === 'reset'
                  ? 'Crie uma nova senha de acesso'
                  : 'Acesse com suas credenciais administrativas'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  {message}
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                <label className="block text-sm text-gray-700 mb-1.5">E-mail ou usuário</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 text-gray-800 bg-white"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
              </div>
              )}

              {mode !== 'forgot' && (
                <div>
                <label className="block text-sm text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 text-gray-800 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              )}

              {mode === 'reset' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 text-gray-800 bg-white"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Lembrar acesso</span>
                </label>
                <button type="button" onClick={() => setMode('forgot')} className="text-sm hover:underline" style={{ color: primaryColor }}>
                  Esqueci a senha
                </button>
              </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Aguarde...
                  </>
                ) : mode === 'forgot' ? 'Enviar instruções' : mode === 'reset' ? 'Redefinir senha' : 'Entrar no Painel'}
              </button>

              {mode !== 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setMessage('');
                    navigate('/login', { replace: true });
                  }}
                  className="w-full text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ color: primaryColor }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para login
                </button>
              )}
            </form>
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <button 
                onClick={() => navigate('/driver')}
                className="text-sm font-bold hover:underline flex items-center justify-center gap-1.5 w-full transition-all"
                style={{ color: primaryColor }}
              >
                Acessar Minhas Entregas
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 Plataforma Administrativa · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
