import 'primereact/resources/themes/lara-light-blue/theme.css'; //theme
import 'primereact/resources/primereact.min.css'; //core css
import 'primeicons/primeicons.css'; //icons
import 'primeflex/primeflex.css'; // flex
import './App.css';
import React, { useMemo } from "react";
import {configs} from "./config";
import {Route, Routes, useLocation} from "react-router-dom";
import axios from "axios";
import {LoginPage} from "./pages/auth/LoginPage";
import {RegisterPage} from "./pages/auth/RegisterPage";
import {SidebarLayout} from "./layout/sidebar/SideBarLayout";
import {GlobalStateKeys, useGlobalState} from "./globalState";
import {TopBarLayout} from "./layout/topbar/TopBarLayout";
import {
    AuthRouter,
    setActivityBaseUrl,
    setAuditLogBaseUrl,
    setAuthApiBaseUrl,
    setCmsApiBaseUrl,
    setAnalyticsBaseUrl,
    useUserInfo,
    useGoogleAnalytics,
    usePageTitle
} from "@formmate/sdk";

axios.defaults.withCredentials = true
setCmsApiBaseUrl(configs.apiURL)
setAuditLogBaseUrl(configs.apiURL)
setAuthApiBaseUrl(configs.apiURL)
setActivityBaseUrl(configs.apiURL)
setAnalyticsBaseUrl(configs.apiURL)

function App() {
    const {data} = useUserInfo();
    const [layout, _] = useGlobalState<string>(GlobalStateKeys.Layout, 'sidebar');
    useGoogleAnalytics();
    
    const location = useLocation();
    const { label, emoji } = useMemo(() => {
        const path = location.pathname;
        if (path.includes('/login')) return { label: 'Secure Login', emoji: '🔐' };
        if (path.includes('/register')) return { label: 'Registration', emoji: '✨' };
        if (path.includes('/auth/users')) return { label: 'User Hub', emoji: '👥' };
        if (path.includes('/auth/roles')) return { label: 'Role Management', emoji: '🎭' };
        if (path.includes('/audit')) return { label: 'Audit Trail', emoji: '🛡️' };
        if (path.includes('/profile')) return { label: 'My Profile', emoji: '👤' };
        if (path.includes('/entities')) return { label: '', emoji: '' }; // handled by EntityPageWrapper
        return { label: 'Dashboard', emoji: '📈' };
    }, [location.pathname]);
    usePageTitle(label || undefined, 'Admin', emoji || undefined);
    const AuthRouterComponent = () => (
        <AuthRouter
            baseRouter={configs.routerPrefix +"/auth"}
            LoginPage={LoginPage}
            RegisterPage={RegisterPage}
        />
    );

    return data
        ? (layout === 'sidebar' ? <SidebarLayout/> : <TopBarLayout/>)
        : <Routes>
            <Route path={`${configs.routerPrefix}/auth/*`} element={<AuthRouterComponent/>}/>
            <Route path="*" element={<AuthRouterComponent/>}/>
        </Routes>
}

export default App;