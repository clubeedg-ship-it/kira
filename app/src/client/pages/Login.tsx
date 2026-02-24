import { Lock, Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await signIn(email, password);
      if (response.error) {
        setErrorMessage(response.error.message ?? 'Unable to sign in with those credentials.');
        return;
      }

      navigate('/', { replace: true });
    } catch {
      setErrorMessage('Unable to reach the authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.signIn')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t('auth.signIn')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-semibold text-primary-300 hover:text-primary-200">
              {t('auth.signUp')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
