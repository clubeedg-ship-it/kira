import { Lock, Mail, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState('');
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
      const response = await signUp(name, email, password);
      if (response.error) {
        setErrorMessage(response.error.message ?? 'Unable to create account.');
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
          <CardTitle>Create account</CardTitle>
          <CardDescription>Set up your Kira workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Name"
              autoComplete="name"
              icon={<User className="h-4 w-4" />}
              placeholder="Alex Rivera"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
              placeholder="Use at least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign up
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-300 hover:text-primary-200">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
