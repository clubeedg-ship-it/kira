import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Lock, Mail } from 'lucide-react';
import { useState } from 'react';
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
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    if (!isLoading && isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const handleSubmit = async (event) => {
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
        }
        catch {
            setErrorMessage('Unable to reach the authentication service.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-bg-base px-4 py-8", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: t('auth.signIn') }), _jsx(CardDescription, { children: t('app.tagline') })] }), _jsxs(CardContent, { children: [_jsxs("form", { className: "space-y-4", onSubmit: handleSubmit, children: [_jsx(Input, { label: t('auth.email'), type: "email", autoComplete: "email", icon: _jsx(Mail, { className: "h-4 w-4" }), placeholder: "you@company.com", value: email, onChange: (event) => setEmail(event.target.value), required: true }), _jsx(Input, { label: t('auth.password'), type: "password", autoComplete: "current-password", icon: _jsx(Lock, { className: "h-4 w-4" }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (event) => setPassword(event.target.value), required: true }), errorMessage ? _jsx("p", { className: "text-sm text-error", children: errorMessage }) : null, _jsx(Button, { type: "submit", className: "w-full", loading: isSubmitting, children: t('auth.signIn') })] }), _jsxs("p", { className: "mt-4 text-center text-sm text-text-secondary", children: [t('auth.noAccount'), ' ', _jsx(Link, { to: "/signup", className: "font-semibold text-primary-300 hover:text-primary-200", children: t('auth.signUp') })] })] })] }) }));
}
//# sourceMappingURL=Login.js.map