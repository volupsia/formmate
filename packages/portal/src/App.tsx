import 'primereact/resources/themes/lara-light-blue/theme.css'; //theme
import 'primereact/resources/primereact.min.css'; //core css
import 'primeicons/primeicons.css'; //icons
import 'primeflex/primeflex.css'; // flex
import './App.css';
import {configs} from "./config";
import axios from "axios";
import {setAuthApiBaseUrl, useUserInfo, setAnalyticsBaseUrl, useGoogleAnalytics, usePageTitle} from "@formmate/sdk";
import {Layout} from "./layout/Layout";
import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {setActivityBaseUrl} from "@formmate/sdk";
import {LoginLayout} from "./auth/LoginLayout";
import {setNotificationBaseUrl} from "@formmate/sdk/notifications/config";
import {setSubBaseUrl} from "@formmate/sdk/sub/config";

setActivityBaseUrl(configs.apiURL);
setAuthApiBaseUrl(configs.apiURL);
setAnalyticsBaseUrl(configs.apiURL);
setNotificationBaseUrl(configs.apiURL);
setSubBaseUrl(configs.apiURL);
axios.defaults.withCredentials = true;

export default function App() {
    const {data} = useUserInfo();
    useGoogleAnalytics();
    const location = useLocation();

    const { label, emoji } = useMemo(() => {
        const path = location.pathname;
        if (path.includes('/login')) return { label: 'Welcome Back', emoji: '👋' };
        if (path.includes('/register')) return { label: 'Create Account', emoji: '🚀' };
        if (path.includes('/profile')) return { label: 'My Profile', emoji: '👤' };
        if (path.includes('/bookmarks')) return { label: 'My Bookmarks', emoji: '🌌' };
        if (path.includes('/activities')) return { label: 'Activities', emoji: '📈' };
        if (path.includes('/notifications')) return { label: 'Notifications', emoji: '🔔' };
        if (path.includes('/sub')) return { label: 'Subscription', emoji: '💎' };
        return { label: 'Portal', emoji: '🌐' };
    }, [location.pathname]);
    usePageTitle(label, 'Portal', emoji);

    return data ? <Layout/> : <LoginLayout/>
}