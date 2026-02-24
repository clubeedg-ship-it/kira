import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export default function AuthGuard({ children }) {
    const [singleTenant, setSingleTenant] = useState(null);
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    useEffect(() => {
        fetch('/api/v1/config')
            .then(r => r.json())
            .then(data => setSingleTenant(data.singleTenant === true))
            .catch(() => setSingleTenant(false));
    }, []);
    // Still loading config
    if (singleTenant === null) {
        return (_jsx("div", { className: "grid min-h-screen place-items-center bg-bg-base px-6 text-text-secondary", children: _jsx("p", { className: "text-sm", children: "Loading..." }) }));
    }
    // Single-tenant: skip auth entirely
    if (singleTenant) {
        return _jsx(_Fragment, { children: children });
    }
    if (isLoading) {
        return (_jsx("div", { className: "grid min-h-screen place-items-center bg-bg-base px-6 text-text-secondary", children: _jsx("p", { className: "text-sm", children: "Checking session..." }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location.pathname } });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=AuthGuard.js.map