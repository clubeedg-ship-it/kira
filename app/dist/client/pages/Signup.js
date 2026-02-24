import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
export default function Signup() {
    const navigate = useNavigate();
    const { signUp, isAuthenticated, isLoading } = useAuth();
    const [name, setName] = useState('');
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
            const response = await signUp(name, email, password);
            if (response.error) {
                setErrorMessage(response.error.message ?? 'Unable to create account.');
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
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-bg-base px-4 py-8", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Create account" }), _jsx(CardDescription, { children: "Set up your Kira workspace." })] }), _jsxs(CardContent, { children: [_jsxs("form", { className: "space-y-4", onSubmit: handleSubmit, children: [_jsx(Input, { label: "Name", autoComplete: "name", icon: _jsx(User, { className: "h-4 w-4" }), placeholder: "Alex Rivera", value: name, onChange: (event) => setName(event.target.value), required: true }), _jsx(Input, { label: "Email", type: "email", autoComplete: "email", icon: _jsx(Mail, { className: "h-4 w-4" }), placeholder: "you@company.com", value: email, onChange: (event) => setEmail(event.target.value), required: true }), _jsx(Input, { label: "Password", type: "password", autoComplete: "new-password", icon: _jsx(Lock, { className: "h-4 w-4" }), placeholder: "Use at least 8 characters", value: password, onChange: (event) => setPassword(event.target.value), required: true }), errorMessage ? _jsx("p", { className: "text-sm text-error", children: errorMessage }) : null, _jsx(Button, { type: "submit", className: "w-full", loading: isSubmitting, children: "Sign up" })] }), _jsxs("p", { className: "mt-4 text-center text-sm text-text-secondary", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "font-semibold text-primary-300 hover:text-primary-200", children: "Log in" })] })] })] }) }));
}
//# sourceMappingURL=Signup.js.map