import React, { useState, useEffect, useRef } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    updatePassword,
    getAuth
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    orderBy,
    getDocs,
    deleteDoc,
    limit,
    or
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    getBytes,
    deleteObject
} from 'firebase/storage';
import { auth, db, storage, firebaseConfig } from './firebase';
import { Role, UserProfile, DocumentItem, ApplicationStage, Task, Message, Notification, AuditLog, PSTemplate, ApplicationProgress, Application, ApplicationDocument, ApplicationStatus, PersonalStatement } from './types';
import { generatePersonalStatement } from './services/geminiService';
import {
    LayoutDashboard,
    FileText,
    CheckSquare,
    MessageSquare,
    LogOut,
    Upload,
    Bell,
    Shield,
    TrendingUp,
    Download,
    AlertCircle,
    FileCheck,
    XCircle,
    Menu,
    X,
    Sparkles,
    Users,
    Settings,
    Trash2,
    Lock,
    RefreshCw,
    PlusCircle,
    UserPlus,
    ChevronRight,
    Globe,
    Cpu,
    Sun,
    Moon,
    Clock,
    User,
    CheckCircle,
    Plus,
    Copy,
    Loader2,
    Check,
    Send,
    BookOpen
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// --- Utilities ---

const logAction = async (action: string, details: string, userId: string) => {
    try {
        await addDoc(collection(db, "audit_log"), {
            action,
            details,
            performedBy: userId,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Failed to log action", e);
    }
};

const notifyUser = async (userId: string, title: string, message: string, type: Notification['type']) => {
    if (!userId || userId === 'admin') return;
    await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        timestamp: Date.now(),
        seen: false,
        type
    });
};

// --- Components ---

const Sidebar = ({ role, activeTab, setActiveTab, mobileOpen, setMobileOpen, isDark, toggleTheme, unreadCount = 0 }: any) => {
    // Admin/SuperAdmin menu items
    const adminMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
        { id: 'students', label: 'Student Mgmt', icon: Users, roles: ['admin', 'super_admin'] },
        { id: 'tasks', label: 'Team Tasks', icon: CheckSquare, roles: ['admin', 'super_admin'] },
        { id: 'applications', label: 'Applications', icon: FileText, roles: ['admin', 'super_admin'] },
        { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ['admin', 'super_admin'] },
        { id: 'ai-gen', label: 'AI Generator', icon: Sparkles, roles: ['admin', 'super_admin'] },
        { id: 'super-admin', label: 'Super Admin Controls', icon: Shield, roles: ['super_admin'] },
    ];

    // Student menu items
    const studentMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student'] },
        { id: 'applications', label: 'Applications', icon: FileCheck, roles: ['student'] },
        { id: 'profile', label: 'Profile Settings', icon: Settings, roles: ['student'] },
        { id: 'support', label: 'Support', icon: MessageSquare, roles: ['student'] },
    ];

    const menuItems = role === 'student' ? studentMenuItems : adminMenuItems;
    const filteredItems = menuItems.filter(item => item.roles.includes(role));

    return (
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-background text-gray-600 dark:text-gray-300 transition-transform transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="flex flex-col items-center justify-center h-28 px-6 pt-6">
                <img src="/arc-logo.png" alt="ARC" className="w-20 h-20 object-contain mb-3" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Application Portal</span>
                <button className="md:hidden absolute top-4 right-4 text-gray-400" onClick={() => setMobileOpen(false)}><X size={24} /></button>
            </div>
            <div className="px-4 py-3 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Main Menu</h3>
            </div>
            <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
                {filteredItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                        className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all rounded-lg group ${activeTab === item.id
                            ? 'bg-[#3ed8db] text-white shadow-md'
                            : 'hover:bg-gray-100 dark:hover:bg-surface-highlight hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 mr-3 transition-colors ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white'}`} />
                        <span className={activeTab === item.id ? 'text-white' : ''}>{item.label}</span>
                        {item.id === 'messages' && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                        {item.id === 'support' && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="p-4 space-y-2">
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-surface-highlight rounded-lg hover:bg-gray-200 dark:hover:bg-surface transition"
                >
                    {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => signOut(auth)} className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
            </div>
        </div>
    );
};

const AuthPage = ({ setUserProfile }: { setUserProfile: (u: UserProfile) => void }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isDark, setIsDark] = useState(localStorage.getItem('theme') !== 'light');

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let userCred;
            if (isLogin) {
                try {
                    userCred = await signInWithEmailAndPassword(auth, email, password);
                } catch (error: any) {
                    if (email === 'areduconsultants@gmail.com' && password === 'ARedu123') {
                        userCred = await createUserWithEmailAndPassword(auth, email, password);
                    } else {
                        throw error;
                    }
                }

                // Override for superadmin credentials
                if (email === 'areduconsultants@gmail.com' && password === 'ARedu123') {
                    const docRef = doc(db, "users", userCred.user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as UserProfile;
                        setUserProfile({ ...userData, role: 'super_admin' });
                        return;
                    } else {
                        // Create superadmin profile if doesn't exist
                        const superAdminProfile: UserProfile = {
                            uid: userCred.user.uid,
                            email: userCred.user.email!,
                            displayName: 'Super Admin',
                            role: 'super_admin',
                            createdAt: Date.now(),
                            profileCompletion: 100
                        };
                        await setDoc(docRef, superAdminProfile);
                        setUserProfile(superAdminProfile);
                        return;
                    }
                }
            } else {
                userCred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCred.user, { displayName: name });

                const role = loginType === 'student' ? 'student' : 'admin';

                const userProfile: UserProfile = {
                    uid: userCred.user.uid,
                    email: userCred.user.email!,
                    displayName: name,
                    role: role,
                    createdAt: Date.now(),
                    profileCompletion: 10
                };
                await setDoc(doc(db, "users", userCred.user.uid), userProfile);

                if (role === 'student') {
                    await setDoc(doc(db, "progress", userCred.user.uid), {
                        studentId: userCred.user.uid,
                        currentStage: 'Document Collection',
                        history: [{ stage: 'Document Collection', timestamp: Date.now(), completed: true }]
                    });
                    await logAction('USER_REGISTER', `Student registered: ${email}`, userCred.user.uid);
                } else {
                    await logAction('USER_REGISTER', `Admin registered: ${email}`, userCred.user.uid);
                }
            }

            const docSnap = await getDoc(doc(db, "users", userCred.user!.uid));
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) return;
        try {
            await addDoc(collection(db, "notifications"), {
                userId: 'super_admin',
                title: 'Password Reset Request',
                message: `User ${resetEmail} requested a password reset.`,
                timestamp: Date.now(),
                seen: false,
                type: 'warning'
            });
            alert("Request sent to Super Admin. You will receive an email once processed.");
            setShowForgot(false);
            setResetEmail('');
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background text-gray-900 dark:text-white flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">

                {/* Left Side: Hero Text */}
                <div className="hidden lg:block space-y-4">
                    <img src="/arc-logo.png" alt="ARC" className="w-32 h-auto mb-4 drop-shadow-2xl" />

                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                        <Sparkles className="w-3 h-3 mr-2" /> 500+ Universities Available
                    </div>

                    <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-white">
                        AR Consultants<br />
                        <span className="text-primary">Your Partner in Education</span>
                    </h1>

                    <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
                        Access top universities worldwide with expert guidance, personalised course selection, and end-to-end support for admissions and visas - all made smoother with intelligent tools.
                    </p>

                    <div className="flex gap-6 pt-2">
                        <div className="flex flex-col">
                            <Cpu className="w-6 h-6 text-primary mb-1" />
                            <span className="font-bold text-sm">AI Powered</span>
                            <span className="text-xs text-gray-500">Gemini 2.5 Integrated</span>
                        </div>
                        <div className="flex flex-col">
                            <Globe className="w-6 h-6 text-blue-500 mb-1" />
                            <span className="font-bold text-sm">Global Reach</span>
                            <span className="text-xs text-gray-500">Major Study Destinations</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div className="w-full max-w-md mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative glass-panel p-8 rounded-xl shadow-2xl bg-white/80 dark:bg-surface/80">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {isLogin ? 'Welcome Back' : 'Get Started'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {isLogin ? "Sign in to access your dashboard." : "Create an account to get started."}
                            </p>
                        </div>

                        {/* Login Type Toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setLoginType('student')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${loginType === 'student'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                            >
                                Student Login
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginType('admin')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${loginType === 'admin'
                                    ? 'bg-gray-800 dark:bg-gray-700 text-white shadow-lg'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                            >
                                Admin Login
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-600 dark:text-red-200 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" /> {error}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-5">
                            {!isLogin && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                                    <input type="text" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                                    <input type="email" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Password</label>
                                    <input type="password" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>

                            {isLogin && (
                                <div className="flex justify-end">
                                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">Forgot Password?</button>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center">
                                {loading ? 'Processing...' : (isLogin ? <><span className="mr-2">Sign In</span> <ChevronRight size={16} /></> : 'Create Account')}
                            </button>
                        </form>

                        <div className="mt-6 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="flex items-center px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-surface-highlight rounded-lg hover:bg-gray-200 dark:hover:bg-surface transition"
                            >
                                {isDark ? <Sun className="w-4 h-4 mr-1.5" /> : <Moon className="w-4 h-4 mr-1.5" />}
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <div className="text-sm">
                                <span className="text-gray-500">{isLogin ? "New user?" : "Already registered?"}</span>
                                <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-primary hover:text-primary-hover font-medium transition">
                                    {isLogin ? "Create Account" : "Sign In"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border p-6 rounded-xl w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reset Password</h3>
                        <p className="text-sm text-gray-500 mb-4">Enter your email to notify the administrator.</p>
                        <form onSubmit={handleForgot}>
                            <input type="email" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none mb-4" placeholder="name@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-white/20 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded hover:bg-primary-hover transition">Send Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- Panels ---

const Dashboard = ({ profile }: { profile: UserProfile }) => {
    // Student-specific state
    const [applications, setApplications] = useState<Application[]>([]);
    const [showNewAppModal, setShowNewAppModal] = useState(false);
    const [studentStats, setStudentStats] = useState({ total: 0, inReview: 0, accepted: 0, rejected: 0 });

    // Admin-specific state
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [activityFilter, setActivityFilter] = useState<'all' | 'applications' | 'resets'>('all');
    const [selectedAppForView, setSelectedAppForView] = useState<Application | null>(null);

    useEffect(() => {
        if (profile.role === 'student') {
            const q = query(collection(db, "applications"), where("studentId", "==", profile.uid));
            const unsub = onSnapshot(q, (snap) => {
                const apps = snap.docs.map(d => ({ ...d.data(), id: d.id } as Application));
                setApplications(apps);
                setStudentStats({
                    total: apps.length,
                    inReview: apps.filter(a => a.status === 'In Review').length,
                    accepted: apps.filter(a => a.status === 'Accepted').length,
                    rejected: apps.filter(a => a.status === 'Rejected').length
                });
            });
            return () => unsub();
        } else if (profile.role === 'admin' || profile.role === 'super_admin') {
            const appsQuery = query(collection(db, "applications"), orderBy("createdAt", "desc"));
            const unsubApps = onSnapshot(appsQuery, (snap) => {
                setAllApplications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Application)));
            });

            const usersQuery = query(collection(db, "users"));
            const unsubUsers = onSnapshot(usersQuery, (snap) => {
                setAllUsers(snap.docs.map(d => d.data() as UserProfile));
            });

            return () => {
                unsubApps();
                unsubUsers();
            };
        }
    }, [profile]);

    if (profile.role === 'student') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {profile.displayName}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Requests</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{studentStats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending</p>
                                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">0</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{studentStats.inReview}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completed</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{studentStats.accepted}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teal "Need a Document?" Card */}
                <div className="bg-gradient-to-r from-primary to-[#128a8d] p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-2">Make an Application</h3>
                        <p className="text-white/90 mb-6">Click here to make a university application</p>
                        <button
                            onClick={() => setShowNewAppModal(true)}
                            className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Application
                        </button>
                    </div>
                </div>

                {/* Recent Requests Table */}
                <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Requests</h3>
                            <button className="text-sm text-primary hover:text-primary-hover transition">View All →</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-surface-highlight border-b border-gray-200 dark:border-border">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Request ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Student Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Expected Collection</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-border">
                                {applications.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            No applications yet. Click "New Request" to get started!
                                        </td>
                                    </tr>
                                ) : (
                                    applications.slice(0, 5).map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-surface-highlight/50 transition">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{app.applicationNumber}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 dark:text-white font-medium">{app.fullName}</div>
                                                <div className="text-xs text-gray-500">{app.targetUniversities[0] || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(app.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${app.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    app.status === 'In Review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <button
                                                    onClick={() => setSelectedAppForView(app)}
                                                    className="text-primary hover:text-primary-hover transition font-medium"
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* New Application Modal */}
                {showNewAppModal && <NewApplicationModal onClose={() => setShowNewAppModal(false)} profile={profile} />}

                {/* Student Application Detail Modal */}
                {selectedAppForView && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center bg-gray-50 dark:bg-surface-highlight sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAppForView.fullName}</h2>
                                    <p className="text-sm text-gray-500">Application ID: {selectedAppForView.applicationNumber}</p>
                                </div>
                                <button onClick={() => setSelectedAppForView(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Application Details</h3>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{selectedAppForView.status}</span></div>
                                            <div><span className="text-gray-500">Highest Qualification:</span> <span className="font-semibold">{selectedAppForView.highestQualification}</span></div>
                                            <div><span className="text-gray-500">Budget:</span> <span className="font-semibold">{selectedAppForView.budgetPerYear}</span></div>
                                            <div><span className="text-gray-500">Submitted:</span> <span className="font-semibold">{new Date(selectedAppForView.createdAt).toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Target Courses</h3>
                                        <ul className="space-y-1 text-sm">
                                            {selectedAppForView.targetCourses.map((course, i) => (
                                                <li key={i} className="text-gray-700 dark:text-gray-300">• {course}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Target Countries</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedAppForView.countries.map((country, i) => (
                                            <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{country}</span>
                                        ))}
                                    </div>
                                </div>
                                {selectedAppForView.documents && selectedAppForView.documents.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Uploaded Documents</h3>
                                        <div className="space-y-2">
                                            {selectedAppForView.documents.map((doc, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-highlight rounded-lg">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">View</a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-200 dark:border-border flex justify-end">
                                    <button
                                        onClick={() => setSelectedAppForView(null)}
                                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }


    // Admin/Super Admin Dashboard
    const adminStats = {
        applicationsReceived: allApplications.filter(a => a.status === 'Pending' || a.status === 'In Review').length,
        applicationsSubmitted: allApplications.filter(a => a.status === 'Submitted' || a.status === 'Accepted').length,
        studentsRegistered: allUsers.filter(u => u.role === 'student').length,
        totalApplications: allApplications.length
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {profile.displayName}</p>
            </div>

            {/* Top Analytics */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Role</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 capitalize">{profile.role.replace('_', ' ')}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Applications Received</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{adminStats.applicationsReceived}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Applications Submitted</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{adminStats.applicationsSubmitted}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Students Registered</p>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{adminStats.studentsRegistered}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* New Application Action Bar */}
            <div className="bg-primary p-6 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Submit Application on Behalf of Student</h3>
                    <p className="text-white/80 text-sm">Create and submit applications directly from the admin portal</p>
                </div>
                <button
                    onClick={() => setShowNewAppModal(true)}
                    className="bg-white text-primary px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Application
                </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-surface/50 border border-gray-200 dark:border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-border">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActivityFilter('all')}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition ${activityFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface-highlight text-gray-600 dark:text-gray-300'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActivityFilter('applications')}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition ${activityFilter === 'applications' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface-highlight text-gray-600 dark:text-gray-300'}`}
                            >
                                Applications Received
                            </button>
                            <button
                                onClick={() => setActivityFilter('resets')}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition ${activityFilter === 'resets' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface-highlight text-gray-600 dark:text-gray-300'}`}
                            >
                                Reset Requests
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-3">
                        {allApplications.slice(0, 5).map(app => (
                            <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-highlight/50 border border-gray-200 dark:border-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-highlight transition">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(62,216,219,0.6)]"></div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{app.fullName}</p>
                                        <p className="text-xs text-gray-500">Application {app.applicationNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${app.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        app.status === 'In Review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {app.status}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono font-bold">{new Date(app.createdAt).toLocaleDateString()}</span>
                                    <button
                                        onClick={() => setSelectedAppForView(app)}
                                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                        {allApplications.length === 0 && (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>

            {/* New Application Modal */}
            {showNewAppModal && <NewApplicationModal onClose={() => setShowNewAppModal(false)} profile={profile} />}

            {/* Application Detail View Modal */}
            {selectedAppForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center bg-gray-50 dark:bg-surface-highlight sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAppForView.fullName}</h2>
                                <p className="text-sm text-gray-500">Application ID: {selectedAppForView.applicationNumber}</p>
                            </div>
                            <button onClick={() => setSelectedAppForView(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Application Details</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{selectedAppForView.status}</span></div>
                                        <div><span className="text-gray-500">Highest Qualification:</span> <span className="font-semibold">{selectedAppForView.highestQualification}</span></div>
                                        <div><span className="text-gray-500">Budget:</span> <span className="font-semibold">{selectedAppForView.budgetPerYear}</span></div>
                                        <div><span className="text-gray-500">Submitted:</span> <span className="font-semibold">{new Date(selectedAppForView.createdAt).toLocaleString()}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Target Courses</h3>
                                    <ul className="space-y-1 text-sm">
                                        {selectedAppForView.targetCourses.map((course, i) => (
                                            <li key={i} className="text-gray-700 dark:text-gray-300">• {course}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Target Countries</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAppForView.countries.map((country, i) => (
                                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{country}</span>
                                    ))}
                                </div>
                            </div>
                            {selectedAppForView.documents && selectedAppForView.documents.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Uploaded Documents</h3>
                                    <div className="space-y-2">
                                        {selectedAppForView.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-highlight rounded-lg">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">View</a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- New Application Modal ---

const NewApplicationModal = ({ onClose, profile }: { onClose: () => void, profile: UserProfile }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: profile.displayName || '',
        targetCourses: [''],
        targetUniversities: [''],
        countries: [''],
        budgetPerYear: '',
        highestQualification: ''
    });
    const [docs, setDocs] = useState<{ file: File, type: DocumentType, customType?: string }[]>([]);

    const handleArrayChange = (field: 'targetCourses' | 'targetUniversities' | 'countries', index: number, value: string) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayItem = (field: 'targetCourses' | 'targetUniversities' | 'countries') => {
        if (formData[field].length < 3) {
            setFormData({ ...formData, [field]: [...formData[field], ''] });
        }
    };

    const removeArrayItem = (field: 'targetCourses' | 'targetUniversities' | 'countries', index: number) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray.length ? newArray : [''] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Generate ID
            const appId = `ARC-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

            // Upload files
            const uploadedDocs: ApplicationDocument[] = [];
            for (const doc of docs) {
                const path = `applications/${appId}/documents/${doc.file.name}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, doc.file);
                const url = await getDownloadURL(storageRef);
                uploadedDocs.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: doc.file.name,
                    url,
                    type: doc.type,
                    uploadedAt: Date.now(),
                    status: 'Pending'
                });
            }

            // Calculate percentage
            let filledFields = 0;
            if (formData.fullName) filledFields++;
            if (formData.budgetPerYear) filledFields++;
            if (formData.highestQualification) filledFields++;
            if (formData.targetCourses[0]) filledFields++;
            if (formData.targetUniversities[0]) filledFields++;
            if (formData.countries[0]) filledFields++;
            if (uploadedDocs.length > 0) filledFields++;
            const percentage = Math.round((filledFields / 7) * 100);

            const application: Application = {
                id: '', // Will be set by addDoc
                studentId: profile.uid,
                applicationNumber: appId,
                fullName: formData.fullName,
                targetCourses: formData.targetCourses.filter(Boolean),
                targetUniversities: formData.targetUniversities.filter(Boolean),
                countries: formData.countries.filter(Boolean),
                budgetPerYear: formData.budgetPerYear,
                highestQualification: formData.highestQualification,
                documents: uploadedDocs,
                status: 'In Review',
                percentageCompleted: percentage,
                createdAt: Date.now(),
                lastUpdated: Date.now()
            };

            await addDoc(collection(db, "applications"), application);
            await logAction('CREATE_APPLICATION', `Created application ${appId}`, profile.uid);

            // Notify SuperAdmin and all Admins
            await notifyUser('super_admin', 'New Application Submitted', `${formData.fullName} submitted a new application (${appId})`, 'info');

            // Get all admins and notify them
            const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
            const adminsSnap = await getDocs(adminsQuery);
            for (const adminDoc of adminsSnap.docs) {
                await notifyUser(adminDoc.id, 'New Application Submitted', `${formData.fullName} submitted a new application (${appId})`, 'info');
            }

            onClose();
            alert("Application submitted successfully!");
        } catch (error: any) {
            console.error("Error submitting application:", error);
            alert("Failed to submit application: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl w-full max-w-2xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center sticky top-0 bg-white dark:bg-surface z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Application Request</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={24} /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                                    <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Highest Qualification</label>
                                    <input required value={formData.highestQualification} onChange={e => setFormData({ ...formData, highestQualification: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" placeholder="e.g. High School Diploma" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Budget Per Year</label>
                                    <input required value={formData.budgetPerYear} onChange={e => setFormData({ ...formData, budgetPerYear: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" placeholder="e.g. $15,000 - $20,000" />
                                </div>
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">Preferences (Max 3)</h3>

                            {/* Courses */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Target Courses</label>
                                {formData.targetCourses.map((course, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input required value={course} onChange={e => handleArrayChange('targetCourses', idx, e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" placeholder="e.g. Computer Science" />
                                        {formData.targetCourses.length > 1 && <button type="button" onClick={() => removeArrayItem('targetCourses', idx)} className="text-red-500"><Trash2 size={18} /></button>}
                                    </div>
                                ))}
                                {formData.targetCourses.length < 3 && <button type="button" onClick={() => addArrayItem('targetCourses')} className="text-xs text-primary flex items-center"><PlusCircle size={14} className="mr-1" /> Add Course</button>}
                            </div>

                            {/* Universities */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Target Universities</label>
                                {formData.targetUniversities.map((uni, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input required value={uni} onChange={e => handleArrayChange('targetUniversities', idx, e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" placeholder="e.g. Oxford University" />
                                        {formData.targetUniversities.length > 1 && <button type="button" onClick={() => removeArrayItem('targetUniversities', idx)} className="text-red-500"><Trash2 size={18} /></button>}
                                    </div>
                                ))}
                                {formData.targetUniversities.length < 3 && <button type="button" onClick={() => addArrayItem('targetUniversities')} className="text-xs text-primary flex items-center"><PlusCircle size={14} className="mr-1" /> Add University</button>}
                            </div>

                            {/* Countries */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Target Countries</label>
                                {formData.countries.map((country, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input required value={country} onChange={e => handleArrayChange('countries', idx, e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg" placeholder="e.g. UK" />
                                        {formData.countries.length > 1 && <button type="button" onClick={() => removeArrayItem('countries', idx)} className="text-red-500"><Trash2 size={18} /></button>}
                                    </div>
                                ))}
                                {formData.countries.length < 3 && <button type="button" onClick={() => addArrayItem('countries')} className="text-xs text-primary flex items-center"><PlusCircle size={14} className="mr-1" /> Add Country</button>}
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">Documents</h3>
                            <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500 mb-4">Upload relevant documents (Passport, Transcripts, etc.)</p>
                                    <input type="file" multiple onChange={e => {
                                        if (e.target.files) {
                                            Array.from(e.target.files).forEach(file => {
                                                setDocs(prev => [...prev, { file, type: 'Other' }]);
                                            });
                                        }
                                    }} className="hidden" id="file-upload" />
                                    <label htmlFor="file-upload" className="px-4 py-2 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm font-medium">Select Files</label>
                                </div>
                            </div>
                            {docs.length > 0 && (
                                <div className="space-y-2">
                                    {docs.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-black/20 p-2 rounded">
                                            <div className="flex items-center overflow-hidden">
                                                <FileText size={16} className="text-primary mr-2 flex-shrink-0" />
                                                <span className="text-sm truncate">{doc.file.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={doc.type}
                                                    onChange={e => {
                                                        const newDocs = [...docs];
                                                        newDocs[idx].type = e.target.value as DocumentType;
                                                        setDocs(newDocs);
                                                    }}
                                                    className="text-xs bg-white dark:bg-surface border border-gray-200 dark:border-border rounded p-1"
                                                >
                                                    <option value="Personal Statement">Personal Statement</option>
                                                    <option value="CV">CV</option>
                                                    <option value="Academic Certificates">Academic Certificates</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <button type="button" onClick={() => setDocs(docs.filter((_, i) => i !== idx))} className="text-red-500"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-border flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-white/5 transition">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition shadow-lg flex items-center">
                                {loading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Applications Panel (Admin) ---

const ApplicationsPanel = ({ profile }: { profile: UserProfile }) => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [filter, setFilter] = useState('All');
    const [showNewAppModal, setShowNewAppModal] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q,
            (snap) => {
                setApplications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Application)));
            },
            (error) => {
                console.error('Applications listener error:', error);
                setApplications([]);
            }
        );
        return () => unsub();
    }, []);

    // Sync selectedApp with updated applications list
    useEffect(() => {
        if (selectedApp) {
            const updated = applications.find(a => a.id === selectedApp.id);
            if (updated) setSelectedApp(updated);
        }
    }, [applications]);

    const filteredApps = filter === 'All' ? applications : applications.filter(a => a.status === filter);

    const updateStatus = async (appId: string, newStatus: ApplicationStatus) => {
        try {
            await updateDoc(doc(db, "applications", appId), {
                status: newStatus,
                lastUpdated: Date.now()
            });
            await logAction('UPDATE_APPLICATION_STATUS', `Updated application ${appId} to ${newStatus}`, profile.uid);
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status. Please check your permissions.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {selectedApp ? (
                // Detail View
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center bg-gray-50 dark:bg-surface-highlight">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition"><ChevronRight className="rotate-180" /></button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedApp.fullName}</h2>
                                <p className="text-sm text-gray-500">App ID: {selectedApp.applicationNumber}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {['In Review', 'Interview', 'Offer', 'Accepted', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateStatus(selectedApp.id!, status as ApplicationStatus)}
                                    className={`px-3 py-1 rounded text-xs font-bold border transition ${selectedApp.status === status ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-500 border-gray-300 dark:border-gray-600 hover:border-primary'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-border pb-2">Applicant Details</h3>
                            <div className="space-y-3">
                                <div><span className="text-xs text-gray-500 uppercase block">Highest Qualification</span> <span className="text-gray-900 dark:text-white">{selectedApp.highestQualification}</span></div>
                                <div><span className="text-xs text-gray-500 uppercase block">Budget</span> <span className="text-gray-900 dark:text-white">{selectedApp.budgetPerYear}</span></div>
                                <div><span className="text-xs text-gray-500 uppercase block">Email</span> <span className="text-gray-900 dark:text-white">{profile.email}</span></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-border pb-2">Preferences</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase block mb-1">Target Courses</span>
                                    <div className="flex flex-wrap gap-2">{selectedApp.targetCourses.map(c => <span key={c} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{c}</span>)}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase block mb-1">Target Universities</span>
                                    <div className="flex flex-wrap gap-2">{selectedApp.targetUniversities.map(c => <span key={c} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">{c}</span>)}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase block mb-1">Target Countries</span>
                                    <div className="flex flex-wrap gap-2">{selectedApp.countries.map(c => <span key={c} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">{c}</span>)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-border pb-2">Documents</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {selectedApp.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center p-3 bg-gray-50 dark:bg-surface-highlight/20 rounded border border-gray-200 dark:border-border">
                                        <FileText className="text-primary mr-3" />
                                        <div className="overflow-hidden">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.name}</div>
                                            <div className="text-xs text-gray-500">{doc.type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Applications</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and review student applications</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded-lg p-1">
                                {['All', 'In Review', 'Interview', 'Offer', 'Accepted', 'Rejected'].map(s => (
                                    <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filter === s ? 'bg-white dark:bg-surface-highlight text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowNewAppModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2" /> New Application
                            </button>
                        </div>
                    </div>

                    {showNewAppModal && <NewApplicationModal profile={profile} onClose={() => setShowNewAppModal(false)} />}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredApps.map(app => (
                            <div key={app.id} onClick={() => setSelectedApp(app)} className="glass-panel p-6 rounded-xl bg-white dark:bg-surface/50 border border-gray-200 dark:border-border hover:border-primary/50 cursor-pointer transition group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${app.status === 'Offer' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                        app.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>{app.status}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono font-bold">{new Date(app.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{app.fullName}</h3>
                                <p className="text-sm text-gray-500 mb-4">{app.applicationNumber}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                        <BookOpen size={14} className="mr-2 text-primary" />
                                        <span className="truncate">{app.targetCourses[0]}</span>
                                        {app.targetCourses.length > 1 && <span className="ml-1 text-gray-400">+{app.targetCourses.length - 1}</span>}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                        <Globe size={14} className="mr-2 text-primary" />
                                        <span className="truncate">{app.countries[0]}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const SuperAdminPanel = ({ profile }: { profile: UserProfile }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState({ totalStudents: 0, totalAdmins: 0 });
    const [showAddUser, setShowAddUser] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'logs'>('users');
    const [managingUser, setManagingUser] = useState<UserProfile | null>(null);

    // Add User State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('admin');
    const [isCreating, setIsCreating] = useState(false);
    const [resetRequests, setResetRequests] = useState<Notification[]>([]);

    // Profile Settings State
    const [profileData, setProfileData] = useState({
        displayName: profile.displayName || '',
        email: profile.email || '',
        password: '',
        photoURL: profile.photoURL || ''
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsub = onSnapshot(q, (snap) => {
            const usersData = snap.docs.map(d => d.data() as UserProfile);
            setUsers(usersData);
            setStats({
                totalStudents: usersData.filter(u => u.role === 'student').length,
                totalAdmins: usersData.filter(u => u.role === 'admin').length
            });
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "audit_log"), orderBy("timestamp", "desc"), limit(50));
        const unsub = onSnapshot(q, (snap) => setAuditLogs(snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog))));
        return () => unsub();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "notifications"), where("title", "==", "Password Reset Request"), where("seen", "==", false));
        const unsub = onSnapshot(q, (snap) => setResetRequests(snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification))));
        return () => unsub();
    }, []);

    const handleResetRequest = async (req: Notification) => {
        const email = req.message.split(' ')[1];
        if (!email) return;
        if (!confirm(`Send password reset email to ${email} and mark request as resolved?`)) return;

        try {
            await sendPasswordResetEmail(auth, email);
            await updateDoc(doc(db, "notifications", req.id), { seen: true });
            await logAction('PASSWORD_RESET', `Processed reset for ${email}`, profile.uid);
            alert("Reset email sent and request marked as resolved.");
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const changeRole = async (uid: string, newRole: Role) => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
        await updateDoc(doc(db, "users", uid), { role: newRole });
        await logAction('ROLE_CHANGE', `Changed ${uid} role to ${newRole}`, profile.uid);
    };

    const deleteUser = async (user: UserProfile) => {
        if (!confirm(`Are you sure you want to delete ${user.displayName}? This removes their database access.`)) return;
        try {
            await deleteDoc(doc(db, "users", user.uid));
            await logAction('USER_DELETE', `Deleted user data for ${user.email}`, profile.uid);
            alert("User data removed. Note: Auth account still exists.");
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const secondaryApp = initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);

            const cred = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPass);
            await updateProfile(cred.user, { displayName: newUserName });

            const newUserProfile: UserProfile = {
                uid: cred.user.uid,
                email: newUserEmail,
                displayName: newUserName,
                role: newUserRole,
                createdAt: Date.now(),
                profileCompletion: 0
            };

            await setDoc(doc(db, "users", cred.user.uid), newUserProfile);

            if (newUserRole === 'student') {
                await setDoc(doc(db, "progress", cred.user.uid), {
                    studentId: cred.user.uid,
                    currentStage: 'Document Collection',
                    history: [{ stage: 'Document Collection', timestamp: Date.now(), completed: true }]
                });
            }

            await signOut(secondaryAuth);
            await logAction('USER_CREATE', `Created ${newUserRole}: ${newUserEmail}`, profile.uid);

            alert("User created successfully!");
            setShowAddUser(false);
            setNewUserEmail(''); setNewUserPass(''); setNewUserName('');
        } catch (e: any) {
            alert("Error creating user: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const resetUserPassword = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Reset email sent.");
            await logAction('PASSWORD_RESET', `Sent reset email to ${email}`, profile.uid);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            if (profileData.displayName !== profile.displayName) {
                await updateProfile(auth.currentUser!, { displayName: profileData.displayName });
                await updateDoc(doc(db, "users", profile.uid), { displayName: profileData.displayName });
            }
            if (profileData.email !== profile.email) {
                // await updateEmail(auth.currentUser!, profileData.email); // Requires recent login, skipping for safety in this demo
                // await updateDoc(doc(db, "users", profile.uid), { email: profileData.email });
                alert("Email update requires recent login. Please re-authenticate to update email.");
            }
            if (profileData.password) {
                await updatePassword(auth.currentUser!, profileData.password);
            }

            await logAction('PROFILE_UPDATE', 'Updated own profile settings', profile.uid);
            alert("Profile updated successfully!");
            setProfileData(prev => ({ ...prev, password: '' }));
        } catch (error: any) {
            alert("Error updating profile: " + error.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const storageRef = ref(storage, `profiles/${profile.uid}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateProfile(auth.currentUser!, { photoURL: url });
            await updateDoc(doc(db, "users", profile.uid), { photoURL: url });
            setProfileData(prev => ({ ...prev, photoURL: url }));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Super Admin Controls</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage users, system settings, and your account</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded-lg p-1">
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'users' ? 'bg-white dark:bg-surface-highlight text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Users</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'settings' ? 'bg-white dark:bg-surface-highlight text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Account Settings</button>
                    <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'logs' ? 'bg-white dark:bg-surface-highlight text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Audit Logs</button>
                </div>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => setShowAddUser(!showAddUser)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition">
                            <UserPlus className="w-4 h-4 mr-2" /> Add User
                        </button>
                    </div>

                    {showAddUser && (
                        <div className="glass-panel p-6 rounded-lg animate-in fade-in slide-in-from-top-4 bg-white dark:bg-surface/50">
                            <h3 className="font-bold mb-4 text-gray-700 dark:text-gray-200">Create New User</h3>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input required placeholder="Full Name" className="bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border p-3 rounded text-gray-900 dark:text-white focus:border-primary outline-none" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                                <input required placeholder="Email" type="email" className="bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border p-3 rounded text-gray-900 dark:text-white focus:border-primary outline-none" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                                <input required placeholder="Password" type="password" className="bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border p-3 rounded text-gray-900 dark:text-white focus:border-primary outline-none" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                                <select className="bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border p-3 rounded text-gray-900 dark:text-white focus:border-primary outline-none" value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)}>
                                    <option value="student">Student</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                                <button disabled={isCreating} type="submit" className="md:col-span-2 bg-green-600 text-white p-3 rounded hover:bg-green-700 font-bold shadow-lg shadow-green-900/50">
                                    {isCreating ? 'Creating...' : 'Create User'}
                                </button>
                            </form>
                        </div>
                    )}

                    {resetRequests.length > 0 && (
                        <div className="glass-panel p-6 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                            <h3 className="font-bold text-red-700 dark:text-red-300 mb-4 flex items-center"><AlertCircle className="mr-2" /> Password Reset Requests</h3>
                            <div className="space-y-3">
                                {resetRequests.map(req => (
                                    <div key={req.id} className="flex justify-between items-center bg-white dark:bg-black/40 p-3 rounded border border-red-100 dark:border-red-900/30">
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{req.message}</div>
                                            <div className="text-xs text-gray-500 mt-1">{new Date(req.timestamp).toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => handleResetRequest(req)} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700 transition shadow-sm">
                                            Reset Password
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="p-4 bg-gray-100 dark:bg-surface-highlight rounded border-l-4 border-primary shadow-lg">
                            <p className="text-gray-500 text-xs uppercase tracking-wider">Total Students</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalStudents}</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-surface-highlight rounded border-l-4 border-blue-500 shadow-lg">
                            <p className="text-gray-500 text-xs uppercase tracking-wider">Total Admins</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAdmins}</p>
                        </div>
                    </div>

                    <div className="glass-panel rounded-lg overflow-hidden bg-white dark:bg-surface/50">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-white/5 font-bold text-gray-700 dark:text-gray-200">User Management</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-surface-highlight/50">
                                    <tr>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-border">
                                    {users.map(u => (
                                        <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{u.displayName}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                                                    ${u.role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800' :
                                                        u.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-800'}`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => setManagingUser(u)} className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded hover:bg-gray-200 dark:hover:bg-surface transition">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="glass-panel p-8 rounded-xl max-w-2xl mx-auto bg-white dark:bg-surface/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h3>
                    <div className="flex items-center mb-8">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-surface-highlight overflow-hidden border-4 border-white dark:border-surface shadow-lg">
                                {profileData.photoURL ? (
                                    <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                                        {profileData.displayName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <Upload className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                        <div className="ml-6">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white">{profile.displayName}</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.email}</p>
                            <p className="text-primary text-xs font-bold uppercase mt-1">{profile.role.replace('_', ' ')}</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                            <input type="text" value={profileData.displayName} onChange={e => setProfileData({ ...profileData, displayName: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                            <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password (leave blank to keep current)</label>
                            <input type="password" value={profileData.password} onChange={e => setProfileData({ ...profileData, password: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-primary outline-none" placeholder="••••••••" />
                        </div>
                        <div className="pt-4">
                            <button type="submit" disabled={savingProfile} className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 transition w-full md:w-auto">
                                {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="glass-panel rounded-lg overflow-hidden bg-white dark:bg-surface/50">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-white/5 font-bold text-gray-700 dark:text-gray-200">System Audit Logs</div>
                    <div className="max-h-[600px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {auditLogs.map(log => (
                            <div key={log.id} className="text-xs flex justify-between border-b border-gray-200 dark:border-border pb-2 last:border-0">
                                <div>
                                    <span className="font-bold text-primary">[{log.action}]</span> <span className="text-gray-500 dark:text-gray-400 ml-2">{log.details}</span>
                                </div>
                                <span className="text-gray-500 dark:text-gray-600 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manage User Modal */}
            {managingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Manage User</h3>
                            <button onClick={() => setManagingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mr-4">
                                    {managingUser.displayName.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{managingUser.displayName}</h4>
                                    <p className="text-sm text-gray-500">{managingUser.email}</p>
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded mt-1 inline-block">{managingUser.role}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button onClick={() => { resetUserPassword(managingUser.email); setManagingUser(null); }} className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                    <Lock className="w-5 h-5 mr-3" /> Send Password Reset Email
                                </button>

                                {managingUser.role === 'student' && (
                                    <button onClick={() => { changeRole(managingUser.uid, 'admin'); setManagingUser(null); }} className="w-full flex items-center p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
                                        <Shield className="w-5 h-5 mr-3" /> Promote to Admin
                                    </button>
                                )}

                                {managingUser.role === 'admin' && (
                                    <button onClick={() => { changeRole(managingUser.uid, 'student'); setManagingUser(null); }} className="w-full flex items-center p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30">
                                        <User className="w-5 h-5 mr-3" /> Demote to Student
                                    </button>
                                )}

                                <button onClick={() => { deleteUser(managingUser); setManagingUser(null); }} className="w-full flex items-center p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30">
                                    <Trash2 className="w-5 h-5 mr-3" /> Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProfileSettings = ({ profile }: { profile: UserProfile }) => {
    const [formData, setFormData] = useState({
        displayName: profile.displayName || '',
        targetCourse: profile.targetCourse || '',
        targetCountry: profile.targetCountry || '',
        budget: profile.budget || '',
        highestQualification: profile.highestQualification || ''
    });
    const [saving, setSaving] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passError, setPassError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const storageRef = ref(storage, `profiles/${profile.uid}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateProfile(auth.currentUser!, { photoURL: url });
            await updateDoc(doc(db, "users", profile.uid), { photoURL: url });
            // Force reload or update context if possible, for now just alert
            alert("Profile photo updated!");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setPassError('');
        try {
            await updateDoc(doc(db, "users", profile.uid), formData);

            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    setPassError("Passwords do not match");
                    setSaving(false);
                    return;
                }
                if (newPassword.length < 6) {
                    setPassError("Password must be at least 6 characters");
                    setSaving(false);
                    return;
                }
                await updatePassword(auth.currentUser!, newPassword);
                setNewPassword('');
                setConfirmPassword('');
            }

            await logAction('PROFILE_UPDATE', 'Updated profile details', profile.uid);
            alert("Profile settings saved successfully!");
        } catch (e: any) {
            console.error(e);
            alert("Error saving details: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-panel p-8 rounded-xl max-w-2xl mx-auto bg-white dark:bg-surface/50">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Settings className="mr-3 text-primary" /> Profile Settings
            </h2>

            <div className="mb-8 flex flex-col items-center">
                <div className="relative w-24 h-24 mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-cyan-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                        {profile.photoURL ? <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" /> : profile.displayName.charAt(0)}
                    </div>
                    <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-white dark:bg-surface border border-gray-200 dark:border-border p-1.5 rounded-full cursor-pointer shadow-md hover:bg-gray-50 transition">
                        <Upload className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                </div>
                <p className="text-sm text-gray-500">Click icon to change profile photo</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                    <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition"
                        required
                    />
                </div>

                <div className="border-t border-gray-200 dark:border-border pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition"
                                placeholder="Leave blank to keep current"
                            />
                        </div>
                        {newPassword && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition"
                                />
                            </div>
                        )}
                        {passError && <p className="text-red-500 text-sm">{passError}</p>}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition flex items-center"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};
// --- Student Applications ---

const StudentApplications = ({ profile }: { profile: UserProfile }) => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    useEffect(() => {
        const q = query(collection(db, "applications"), where("studentId", "==", profile.uid));
        const unsub = onSnapshot(q, (snap) => {
            setApplications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Application)));
        });
        return () => unsub();
    }, [profile.uid]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Applications</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Track the status of your university applications</p>
            </div>

            {applications.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-surface/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No applications yet</h3>
                    <p className="text-gray-500 mt-1">Contact an admin to start your application process.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {applications.map(app => (
                        <div key={app.id} onClick={() => setSelectedApp(app)} className="glass-panel p-6 rounded-xl bg-white dark:bg-surface/50 border border-gray-200 dark:border-border hover:border-primary/50 cursor-pointer transition group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${app.status === 'Accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                    app.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>{app.status}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono font-bold">{new Date(app.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{app.fullName}</h3>
                            <p className="text-sm text-gray-500 mb-4">{app.applicationNumber}</p>

                            <div className="space-y-2">
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                    <BookOpen size={14} className="mr-2 text-primary" />
                                    <span className="truncate">{app.targetCourses[0]}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                    <Globe size={14} className="mr-2 text-primary" />
                                    <span className="truncate">{app.countries[0]}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedApp && (
                <StudentApplicationDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} profile={profile} />
            )}
        </div>
    );
};

const StudentApplicationDetailModal = ({ app, onClose, profile }: { app: Application, onClose: () => void, profile: UserProfile }) => {
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitAddendum = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment && !file) return;
        setSubmitting(true);
        try {
            let fileUrl = '';
            if (file) {
                const storageRef = ref(storage, `applications/${app.id}/addendum/${file.name}`);
                await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(storageRef);
            }

            const newAddendum = {
                id: Math.random().toString(36).substr(2, 9),
                text: comment,
                fileUrl,
                fileName: file ? file.name : undefined,
                createdAt: Date.now(),
                createdBy: profile.uid,
                authorName: profile.displayName
            };

            const appRef = doc(db, "applications", app.id);
            const appSnap = await getDoc(appRef);
            if (appSnap.exists()) {
                const currentData = appSnap.data();
                const currentAddendums = currentData.addendums || [];
                await updateDoc(appRef, {
                    addendums: [...currentAddendums, newAddendum],
                    lastUpdated: Date.now()
                });
            }

            setComment('');
            setFile(null);
            alert("Addendum submitted successfully");
        } catch (error) {
            console.error(error);
            alert("Failed to submit addendum");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center bg-gray-50 dark:bg-surface-highlight sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{app.fullName}</h2>
                        <p className="text-sm text-gray-500">Application ID: {app.applicationNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-lg flex items-center justify-between ${app.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        app.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/50 rounded-full">
                                {app.status === 'Accepted' ? <CheckCircle className="w-5 h-5" /> :
                                    app.status === 'Rejected' ? <XCircle className="w-5 h-5" /> :
                                        <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-lg">Status: {app.status}</p>
                                <p className="text-xs opacity-80">Last updated: {new Date(app.lastUpdated || app.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <BookOpen className="w-4 h-4 mr-2 text-primary" /> Application Details
                            </h3>
                            <div className="bg-gray-50 dark:bg-surface-highlight/50 rounded-lg p-4 space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Highest Qualification</span> <span className="font-semibold">{app.highestQualification}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Budget (Per Year)</span> <span className="font-semibold">{app.budgetPerYear}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Submitted Date</span> <span className="font-semibold">{new Date(app.createdAt).toLocaleDateString()}</span></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <Globe className="w-4 h-4 mr-2 text-primary" /> Preferences
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Target Courses</p>
                                    <div className="flex flex-wrap gap-2">
                                        {app.targetCourses.map((c, i) => (
                                            <span key={i} className="px-2 py-1 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded text-xs font-medium">{c}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Target Countries</p>
                                    <div className="flex flex-wrap gap-2">
                                        {app.countries.map((c, i) => (
                                            <span key={i} className="px-2 py-1 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded text-xs font-medium">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-primary" /> Submitted Documents
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {app.documents.map((doc, i) => (
                                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg hover:border-primary transition group">
                                    <div className="p-2 bg-white dark:bg-surface rounded-lg mr-3 group-hover:text-primary transition-colors">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{doc.type}</p>
                                    </div>
                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Addendum Section */}
                    <div className="border-t border-gray-200 dark:border-border pt-8">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2 text-primary" /> Addendum & Updates
                        </h3>

                        {/* List existing addendums if any */}
                        {app.addendums && app.addendums.length > 0 && (
                            <div className="mb-6 space-y-4">
                                {app.addendums.map((addendum, i) => (
                                    <div key={i} className="bg-gray-50 dark:bg-surface-highlight/30 p-4 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-sm">{addendum.authorName}</span>
                                            <span className="text-xs text-gray-500">{new Date(addendum.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{addendum.text}</p>
                                        {addendum.fileUrl && (
                                            <a href={addendum.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-xs text-primary hover:underline">
                                                <FileText className="w-3 h-3 mr-1" /> {addendum.fileName || 'Attached File'}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmitAddendum} className="bg-gray-50 dark:bg-surface-highlight p-4 rounded-lg border border-gray-200 dark:border-border">
                            <h4 className="text-sm font-semibold mb-3">Add Note or Document</h4>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Type your message or additional information here..."
                                className="w-full p-3 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-lg text-sm mb-3 focus:ring-2 focus:ring-primary outline-none"
                                rows={3}
                            />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <label className="cursor-pointer flex items-center text-xs text-gray-500 hover:text-primary transition">
                                        <Upload className="w-4 h-4 mr-1" />
                                        {file ? file.name : 'Attach File'}
                                        <input type="file" className="hidden" onChange={e => e.target.files && setFile(e.target.files[0])} />
                                    </label>
                                    {file && <button type="button" onClick={() => setFile(null)} className="ml-2 text-red-500"><X className="w-3 h-3" /></button>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting || (!comment && !file)}
                                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition"
                                >
                                    {submitting ? 'Sending...' : 'Submit Addendum'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


const StudentManagement = ({ profile, setSelectedStudentId }: { profile: UserProfile, setSelectedStudentId: (id: string) => void }) => {
    const [students, setStudents] = useState<UserProfile[]>([]);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        getDocs(q).then(snap => setStudents(snap.docs.map(d => d.data() as UserProfile)));
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map(student => (
                    <div key={student.uid} className="glass-panel p-6 rounded-lg hover:border-primary/50 transition cursor-pointer group bg-white dark:bg-surface/50" onClick={() => setSelectedStudentId(student.uid)}>
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-surface-highlight border border-gray-200 dark:border-border flex items-center justify-center text-gray-900 dark:text-white text-xl font-bold group-hover:bg-primary group-hover:text-white transition">
                                {student.displayName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition">{student.displayName}</h3>
                                <p className="text-sm text-gray-500">{student.email}</p>
                            </div>
                        </div>
                        <div className="flex justify-between mt-4">
                            <button
                                className="w-full py-2 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-sm font-medium rounded border border-gray-200 dark:border-white/10 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition"
                            >
                                Manage Student
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AIGenerator = ({ profile }: { profile: UserProfile }) => {
    const [formData, setFormData] = useState({
        studentName: '',
        country: '',
        course: '',
        university: '',
        details: ''
    });
    const [generatedContent, setGeneratedContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<PersonalStatement[]>([]);
    const [view, setView] = useState<'generate' | 'history'>('generate');

    useEffect(() => {
        const q = query(collection(db, "personal_statements"), where("generatedBy", "==", profile.uid), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q,
            (snap) => {
                setHistory(snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalStatement)));
            },
            (error) => {
                console.error('Personal statements listener error:', error);
                setHistory([]);
            }
        );
        return () => unsub();
    }, [profile.uid]);

    const handleGenerate = async () => {
        if (!formData.studentName || !formData.course) return;
        setLoading(true);
        try {
            const content = await generatePersonalStatement({
                studentName: formData.studentName,
                course: formData.course,
                university: formData.university || 'university',
                workExperience: formData.details,
                notes: formData.details,
                country: formData.country || 'abroad',
                templateFiles: []
            });
            setGeneratedContent(content);

            await addDoc(collection(db, "personal_statements"), {
                ...formData,
                content,
                generatedBy: profile.uid,
                createdAt: Date.now()
            });
        } catch (error) {
            console.error(error);
            alert("Failed to generate. Please try again.");
        }
        setLoading(false);
    };

    const downloadPDF = () => {
        const element = document.createElement("a");
        const file = new Blob([generatedContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${formData.studentName}_PS.txt`;
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div className="glass-panel p-8 rounded-xl bg-white dark:bg-surface/50 min-h-[600px]">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-2xl text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="mr-2 text-primary" /> AI Personal Statement Generator
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setView('generate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'generate' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300'}`}>Generator</button>
                    <button onClick={() => setView('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'history' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300'}`}>History</button>
                </div>
            </div>

            {view === 'generate' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Name</label>
                            <input className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg outline-none focus:border-primary" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} placeholder="e.g. John Doe" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Country</label>
                                <input className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg outline-none focus:border-primary" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} placeholder="e.g. UK" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target University</label>
                                <input className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg outline-none focus:border-primary" value={formData.university} onChange={e => setFormData({ ...formData, university: e.target.value })} placeholder="e.g. Oxford" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name</label>
                            <input className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg outline-none focus:border-primary" value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} placeholder="e.g. Computer Science" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specific Details / Achievements</label>
                            <textarea className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg outline-none focus:border-primary h-32 resize-none" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} placeholder="List key achievements, motivations, and experiences..." />
                        </div>
                        <button onClick={handleGenerate} disabled={loading || !formData.studentName || !formData.course} className="w-full py-4 bg-gradient-to-r from-primary to-cyan-600 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-primary/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            {loading ? 'Generating Magic...' : 'Generate Personal Statement'}
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border rounded-xl p-6 flex flex-col h-full min-h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300">Generated Content</h4>
                            {generatedContent && (
                                <div className="flex gap-2">
                                    <button onClick={() => navigator.clipboard.writeText(generatedContent)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500" title="Copy"><Copy size={16} /></button>
                                    <button onClick={downloadPDF} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500" title="Download"><Download size={16} /></button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-lg p-4 overflow-y-auto custom-scrollbar text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-serif">
                            {generatedContent || <span className="text-gray-400 italic">Content will appear here...</span>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map(item => (
                        <div key={item.id} className="p-6 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl hover:border-primary/50 transition group cursor-pointer" onClick={() => { setFormData(item); setGeneratedContent(item.content); setView('generate'); }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{item.studentName}</h4>
                                    <p className="text-xs text-gray-500">{item.course}</p>
                                </div>
                                <span className="text-[10px] bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-3 mb-4">{item.content}</p>
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                                <span className="text-xs text-primary font-medium flex items-center">View <ChevronRight size={12} className="ml-1" /></span>
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No history found.</div>}
                </div>
            )}
        </div>
    );
};

const Documents = ({ profile, studentId }: { profile: UserProfile, studentId?: string }) => {
    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const targetId = profile.role === 'student' ? profile.uid : studentId;
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!targetId) return;
        const q = query(collection(db, "documents"), where("studentId", "==", targetId));
        const unsub = onSnapshot(q, (snap) => {
            setDocs(snap.docs.map(d => ({ ...d.data(), id: d.id } as DocumentItem)));
        });
        return () => unsub();
    }, [targetId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !targetId) return;
        setUploading(true);
        const file = e.target.files[0];
        try {
            const storageRef = ref(storage, `documents/${targetId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "documents"), {
                studentId: targetId,
                name: file.name,
                type: 'other',
                url,
                status: 'pending',
                uploadedAt: Date.now()
            });

            await notifyUser('admin', 'New Document', `${profile.displayName} uploaded ${file.name}`, 'info');
            await logAction('DOC_UPLOAD', `Uploaded ${file.name}`, profile.uid);

        } catch (err) { console.error(err); alert("Upload failed"); }
        finally { setUploading(false); }
    };

    const updateStatus = async (docId: string, status: DocumentItem['status'], docName: string) => {
        await updateDoc(doc(db, "documents", docId), { status });
        if (targetId) await notifyUser(targetId, `Document ${status}`, `${docName} was ${status}`, status === 'approved' ? 'success' : 'warning');
    };

    const deleteDocument = async (docItem: DocumentItem) => {
        if (!confirm("Are you sure you want to delete this file?")) return;
        try {
            await deleteDoc(doc(db, "documents", docItem.id));
            try {
                await deleteObject(ref(storage, docItem.url));
            } catch (e) { console.log("Storage delete skipped or failed", e); }

            await logAction('DOC_DELETE', `Deleted document ${docItem.name}`, profile.uid);
        } catch (e: any) {
            alert("Delete failed: " + e.message);
        }
    };

    if (profile.role !== 'student' && !targetId) return <div className="text-center p-10 text-gray-500 font-mono">Select a student from "Student Mgmt" to view documents.</div>;

    return (
        <div className="glass-panel p-6 rounded-xl bg-white dark:bg-surface/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Documents {profile.role !== 'student' && <span className="text-gray-500 text-sm ml-2">(Admin View)</span>}</h3>
                {profile.role === 'student' && (
                    <div className="relative">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} disabled={uploading} />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 shadow-lg shadow-primary/20 transition">
                            <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload File'}
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-border">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
                    <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-surface-highlight/20 divide-y divide-gray-200 dark:divide-border">
                        {docs.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">No documents uploaded yet.</td></tr>}
                        {docs.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <td className="px-6 py-4 flex items-center text-sm font-medium text-gray-900 dark:text-gray-200">
                                    <FileText className="w-4 h-4 mr-3 text-primary" />
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline truncate max-w-xs">{doc.name}</a>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border
                                    ${doc.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' :
                                            doc.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'}`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm flex items-center gap-3">
                                    {profile.role !== 'student' ? (
                                        <>
                                            <button onClick={() => updateStatus(doc.id, 'approved', doc.name)} className="text-green-500 hover:text-green-600 dark:hover:text-green-300"><CheckSquare className="w-4 h-4" /></button>
                                            <button onClick={() => updateStatus(doc.id, 'rejected', doc.name)} className="text-red-500 hover:text-red-600 dark:hover:text-red-300"><XCircle className="w-4 h-4" /></button>
                                            {profile.role === 'super_admin' && (
                                                <button onClick={() => deleteDocument(doc)} className="text-gray-400 hover:text-red-500 ml-2" title="Delete File">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </>
                                    ) : <span className="text-gray-500 text-xs">Read-only</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Tasks = ({ profile, studentId }: { profile: UserProfile, studentId?: string }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'completed'>('all');

    const isGlobal = profile.role !== 'student' && !studentId;
    const targetId = profile.role === 'student' ? profile.uid : studentId;

    useEffect(() => {
        if (isGlobal) {
            const qS = query(collection(db, "users"), where("role", "==", "student"));
            getDocs(qS).then(snap => setStudents(snap.docs.map(d => d.data() as UserProfile)));

            const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
            const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ ...d.data(), id: d.id } as Task))));
            return () => unsub();
        } else if (targetId) {
            const q = query(collection(db, "tasks"), where("assignedTo", "==", targetId), orderBy("createdAt", "desc"));
            const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ ...d.data(), id: d.id } as Task))));
            return () => unsub();
        }
    }, [targetId, isGlobal]);

    const handleCreate = async () => {
        const assignTo = isGlobal ? selectedStudent : targetId;
        if (!newTask || !assignTo) return;

        await addDoc(collection(db, "tasks"), {
            title: newTask,
            assignedTo: assignTo,
            assignedBy: profile.uid,
            status: 'todo',
            priority,
            dueDate: dueDate ? new Date(dueDate).getTime() : null,
            createdAt: Date.now()
        });
        setNewTask('');
        setDueDate('');
        if (isGlobal) setSelectedStudent('');

        if (assignTo !== profile.uid) {
            await notifyUser(assignTo, 'New Task Assigned', `You have been assigned: ${newTask}`, 'warning');
        }
    };

    const toggle = async (t: Task) => await updateDoc(doc(db, "tasks", t.id), { status: t.status === 'completed' ? 'todo' : 'completed' });

    const filteredTasks = tasks.filter(t => {
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        return true;
    });

    return (
        <div className="glass-panel p-6 rounded-xl bg-white dark:bg-surface/50 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                    <CheckSquare className="mr-2 text-primary" />
                    {isGlobal ? 'Global Task Manager' : 'Tasks'}
                </h3>
                <div className="flex gap-2">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="text-xs bg-gray-50 dark:bg-surface border border-gray-200 dark:border-border rounded p-1 text-gray-900 dark:text-white">
                        <option value="all">All Status</option>
                        <option value="todo">To Do</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {profile.role !== 'student' && (
                <div className="bg-gray-50 dark:bg-surface-highlight/20 p-4 rounded-lg mb-6 border border-gray-200 dark:border-border">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <input className="md:col-span-2 p-2 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded text-sm outline-none focus:border-primary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" placeholder="Task Title..." value={newTask} onChange={e => setNewTask(e.target.value)} />
                        {isGlobal && (
                            <select className="p-2 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded text-sm outline-none text-gray-900 dark:text-white" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                                <option value="">Select Student...</option>
                                {students.map(s => <option key={s.uid} value={s.uid}>{s.displayName}</option>)}
                            </select>
                        )}
                        <select className="p-2 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded text-sm outline-none text-gray-900 dark:text-white" value={priority} onChange={e => setPriority(e.target.value as any)}>
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                        </select>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleCreate} disabled={!newTask || (isGlobal && !selectedStudent)} className="px-6 py-2 bg-primary text-white rounded font-bold text-sm hover:bg-primary-hover disabled:opacity-50 transition shadow-lg shadow-primary/20">Assign Task</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {filteredTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-lg hover:border-primary/50 transition group">
                        <div className="flex items-center gap-4 flex-1">
                            <button onClick={() => toggle(t)} className={`w-5 h-5 rounded border flex items-center justify-center transition ${t.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}>
                                {t.status === 'completed' && <Check size={12} className="text-white" />}
                            </button>
                            <div>
                                <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-200'}`}>{t.title}</p>
                                {isGlobal && (
                                    <p className="text-xs text-gray-500 mt-1">Assigned to: <span className="text-primary">{students.find(s => s.uid === t.assignedTo)?.displayName || 'Unknown'}</span></p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider ${t.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                }`}>{t.priority}</span>
                            {profile.role !== 'student' && (
                                <button onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, "tasks", t.id)); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredTasks.length === 0 && <div className="text-center py-12 text-gray-400 italic">No tasks found.</div>}
            </div>
        </div>
    );
};

const Messaging = ({ profile, studentId }: { profile: UserProfile, studentId?: string }) => {
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [txt, setTxt] = useState('');
    const [activeThread, setActiveThread] = useState<string | null>(studentId || null);
    const [threads, setThreads] = useState<{ [key: string]: Message[] }>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const [userMap, setUserMap] = useState<{ [key: string]: UserProfile }>({});
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // New Chat State
    const [showNewChat, setShowNewChat] = useState(false);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile.role !== 'student') {
            const q = query(collection(db, "users"));
            getDocs(q).then(snap => {
                const users = snap.docs.map(d => d.data() as UserProfile);
                setAllUsers(users);
                const map: { [key: string]: UserProfile } = {};
                users.forEach(u => map[u.uid] = u);
                setUserMap(map);
            });
        }
    }, [profile.role]);

    useEffect(() => {
        let q;
        if (profile.role === 'student') {
            q = query(
                collection(db, "messages"),
                or(
                    where("senderId", "==", profile.uid),
                    where("receiverId", "==", profile.uid)
                ),
                orderBy("timestamp", "asc")
            );
        } else {
            // Admins can see all messages
            q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
        }

        const unsub = onSnapshot(q, (snap) => {
            const allMsgs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Message));

            if (profile.role === 'student') {
                setMsgs(allMsgs);
            } else {
                const grouped: { [key: string]: Message[] } = {};
                allMsgs.forEach(m => {
                    const otherId = m.senderId === profile.uid ? m.receiverId : m.senderId;
                    if (!grouped[otherId]) grouped[otherId] = [];
                    grouped[otherId].push(m);
                });
                setThreads(grouped);

                if (activeThread && grouped[activeThread]) {
                    setMsgs(grouped[activeThread]);
                } else if (activeThread) {
                    setMsgs([]);
                }
            }
        });
        return () => unsub();
    }, [profile.uid, profile.role, activeThread]);

    // Mark messages as read
    useEffect(() => {
        if (!activeThread && profile.role !== 'student') return;

        let unreadMsgs: Message[] = [];

        if (profile.role === 'student') {
            unreadMsgs = msgs.filter(m => !m.read && m.receiverId === profile.uid);
        } else if (activeThread) {
            unreadMsgs = msgs.filter(m => !m.read && m.receiverId === profile.uid && m.senderId === activeThread);
        }

        if (unreadMsgs.length > 0) {
            unreadMsgs.forEach(m => {
                updateDoc(doc(db, "messages", m.id), { read: true });
            });
        }
    }, [msgs, activeThread, profile.uid, profile.role]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs]);

    const send = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!txt.trim() && !file) || uploading) return;

        const receiverId = profile.role === 'student' ? 'super_admin' : activeThread;
        if (!receiverId) return;

        setUploading(true);
        try {
            let fileUrl = '';
            let fileType = '';
            let fileName = '';

            if (file) {
                const storageRef = ref(storage, `messages/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(storageRef);
                fileType = file.type;
                fileName = file.name;
            }

            await addDoc(collection(db, "messages"), {
                senderId: profile.uid,
                senderName: profile.displayName,
                receiverId: receiverId,
                content: txt,
                fileUrl,
                fileType,
                fileName,
                timestamp: Date.now(),
                read: false
            });

            if (receiverId === 'super_admin') {
                // Notify all admins
                const adminsQuery = query(collection(db, "users"), where("role", "in", ["admin", "super_admin"]));
                const adminsSnap = await getDocs(adminsQuery);
                for (const adminDoc of adminsSnap.docs) {
                    await notifyUser(adminDoc.id, 'New Message', `${profile.displayName} sent you a message`, 'info');
                }
            } else {
                await notifyUser(receiverId, 'New Message', `${profile.displayName} sent you a message`, 'info');
            }

            setTxt('');
            setFile(null);
        } catch (error) {
            console.error(error);
            alert("Failed to send message");
        } finally {
            setUploading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.uid !== profile.uid &&
        (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getOtherUser = (uid: string) => userMap[uid] || { displayName: 'Unknown User', email: '' };

    return (
        <div className="glass-panel rounded-xl overflow-hidden bg-white dark:bg-surface/50 h-[600px] flex shadow-xl flex-col md:flex-row">
            {profile.role !== 'student' && (
                <div className={`w-full md:w-80 bg-gray-50 dark:bg-surface-highlight/10 flex flex-col border-r border-gray-200 dark:border-white/5 ${activeThread ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 flex justify-between items-center bg-white dark:bg-surface/50 border-b border-gray-200 dark:border-white/5">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200">Conversations</h3>
                        <button onClick={() => setShowNewChat(true)} className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover shadow-lg shadow-primary/20 transition">
                            <PlusCircle size={18} />
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {Object.keys(threads).length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No active conversations</div>}
                        {Object.keys(threads).map(uid => {
                            const lastMsg = threads[uid][threads[uid].length - 1];
                            const otherUser = getOtherUser(uid);
                            return (
                                <div key={uid} onClick={() => setActiveThread(uid)} className={`p-4 cursor-pointer hover:bg-white dark:hover:bg-white/5 transition border-b border-gray-100 dark:border-white/5 ${activeThread === uid ? 'bg-white dark:bg-white/10 border-l-4 border-l-primary' : ''}`}>
                                    <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">{otherUser.displayName}</div>
                                    <div className="text-xs text-gray-400 mb-1">{otherUser.email}</div>
                                    <div className="text-xs text-gray-500 truncate">{lastMsg.senderId === profile.uid ? 'You: ' : ''}{lastMsg.content || 'Attachment'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={`flex-1 flex flex-col bg-white dark:bg-surface/50 ${!activeThread && profile.role !== 'student' ? 'hidden md:flex' : 'flex'}`}>
                {activeThread || profile.role === 'student' ? (
                    <>
                        <div className="p-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm flex justify-between items-center border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center">
                                {profile.role !== 'student' && (
                                    <button onClick={() => setActiveThread(null)} className="md:hidden mr-3 text-gray-500">
                                        <ChevronRight className="rotate-180" />
                                    </button>
                                )}
                                <div className="font-bold text-gray-900 dark:text-white flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                    {profile.role === 'student' ? 'Support Team' : getOtherUser(activeThread!).displayName}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-black/20">
                            {msgs.map(m => (
                                <div key={m.id} className={`flex ${m.senderId === profile.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${m.senderId === profile.uid ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-surface-highlight text-black dark:text-gray-200 rounded-bl-none'}`}>
                                        {m.fileUrl && (
                                            <div className="mb-2">
                                                {m.fileType?.startsWith('image/') ? (
                                                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <img src={m.fileUrl} alt="attachment" className="max-w-full rounded-lg max-h-48 object-cover hover:opacity-90 transition" />
                                                    </a>
                                                ) : (
                                                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-black/10 rounded-lg hover:bg-black/20 transition text-xs">
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        {m.fileName || 'Attachment'}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {m.content && <p className="text-sm">{m.content}</p>}
                                        <p className={`text-[10px] mt-1 ${m.senderId === profile.uid ? 'text-white/70' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={scrollRef}></div>
                        </div>
                        <form onSubmit={send} className="p-4 bg-white dark:bg-surface border-t border-gray-200 dark:border-white/5">
                            {file && (
                                <div className="flex items-center mb-2 p-2 bg-gray-100 dark:bg-surface-highlight rounded-lg text-xs">
                                    <span className="truncate flex-1">{file.name}</span>
                                    <button type="button" onClick={() => setFile(null)} className="text-red-500 ml-2"><X size={14} /></button>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <label className="p-2 text-gray-400 hover:text-primary cursor-pointer transition">
                                    <Upload size={20} />
                                    <input type="file" className="hidden" onChange={e => e.target.files && setFile(e.target.files[0])} />
                                </label>
                                <textarea
                                    value={txt}
                                    onChange={e => setTxt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-100 dark:bg-surface-highlight border-0 rounded-xl p-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none custom-scrollbar"
                                    rows={1}
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={(!txt.trim() && !file) || uploading}
                                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </div>

            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">New Conversation</h3>
                            <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4">
                            <input
                                autoFocus
                                placeholder="Search users..."
                                className="w-full p-3 bg-gray-50 dark:bg-surface-highlight border border-gray-200 dark:border-border rounded-lg text-gray-900 dark:text-white focus:border-primary outline-none mb-4"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="space-y-2 overflow-y-auto max-h-60 custom-scrollbar">
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.uid}
                                        onClick={() => { setActiveThread(u.uid); setShowNewChat(false); }}
                                        className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-surface-highlight rounded-lg transition text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
                                            {u.displayName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{u.displayName}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No users found</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Progress = ({ profile, studentId }: { profile: UserProfile, studentId?: string }) => {
    const [progress, setProgress] = useState<ApplicationProgress | null>(null);
    const targetUid = studentId || profile.uid;

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "progress", targetUid), (d) => {
            if (d.exists()) setProgress(d.data() as ApplicationProgress);
        });
        return () => unsub();
    }, [targetUid]);

    const stages: ApplicationStage[] = ['Document Collection', 'Application Review', 'University Submission', 'Offer Received', 'Visa Processing', 'Completed'];

    const updateStage = async (stage: ApplicationStage) => {
        if (profile.role === 'student') return;
        if (!confirm(`Update stage to ${stage}?`)) return;

        const newHistory = [...(progress?.history || []), { stage, timestamp: Date.now(), completed: true }];
        await setDoc(doc(db, "progress", targetUid), {
            studentId: targetUid,
            currentStage: stage,
            history: newHistory
        }, { merge: true });

        await notifyUser(targetUid, "Application Update", `Your application is now in the ${stage} stage.`, 'info');
    };

    return (
        <div className="glass-panel p-8 rounded-xl bg-white dark:bg-surface/50">
            <h3 className="font-bold text-xl mb-8 text-gray-900 dark:text-white">Application Tracker</h3>
            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
                <div className="space-y-8">
                    {stages.map((stage, idx) => {
                        const isCompleted = progress?.history.some(h => h.stage === stage);
                        const isCurrent = progress?.currentStage === stage;
                        const historyItem = progress?.history.find(h => h.stage === stage);

                        return (
                            <div key={stage} className={`relative pl-12 transition-all duration-500 ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`absolute left-0 w-8 h-8 rounded-full border-4 flex items-center justify-center z-10 transition-all
                                    ${isCompleted ? 'bg-green-500 border-green-500' : isCurrent ? 'bg-primary border-primary animate-pulse' : 'bg-gray-100 dark:bg-surface border-gray-300 dark:border-gray-700'}`}>
                                    {isCompleted && <CheckSquare className="w-4 h-4 text-white" />}
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <h4 className={`font-bold text-lg ${isCurrent ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{stage}</h4>
                                        {historyItem && <p className="text-xs text-gray-500 mt-1 font-mono">{new Date(historyItem.timestamp).toLocaleDateString()}</p>}
                                    </div>
                                    {profile.role !== 'student' && (
                                        <button onClick={() => updateStage(stage)} className="opacity-0 group-hover:opacity-100 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition">
                                            Set Current
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Layout ---

const MainLayout = ({ profile }: { profile: UserProfile }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [showNotif, setShowNotif] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    // For Admin Context:
    const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);

    useEffect(() => {
        // Theme Init (runs once)
        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.remove('dark');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!profile?.uid) return;

        const userIds = [profile.uid];
        if (profile.role === 'super_admin') userIds.push('super_admin');

        const q = query(collection(db, "notifications"), where("userId", "in", userIds), orderBy("timestamp", "desc"), limit(10));
        const unsub = onSnapshot(q,
            (s) => setNotifs(s.docs.map(d => ({ ...d.data(), id: d.id } as Notification))),
            (error) => console.error('Notifications listener error:', error)
        );
        return () => unsub();
    }, [profile?.uid, profile?.role]);

    useEffect(() => {
        if (!profile?.uid) return;

        const q = query(collection(db, "messages"), where("receiverId", "==", profile.uid), where("read", "==", false));
        const unsub = onSnapshot(q,
            (snap) => setUnreadCount(snap.docs.length),
            (error) => console.error('Messages listener error:', error)
        );
        return () => unsub();
    }, [profile?.uid]);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const markRead = async (id: string) => await updateDoc(doc(db, "notifications", id), { seen: true });

    const StudentApplicationDetails = ({ studentId }: { studentId: string }) => {
        const [student, setStudent] = useState<UserProfile | null>(null);

        useEffect(() => {
            getDoc(doc(db, "users", studentId)).then(s => {
                if (s.exists()) setStudent(s.data() as UserProfile);
            });
        }, [studentId]);

        if (!student) return null;

        return (
            <div className="glass-panel p-6 rounded-xl bg-white dark:bg-surface/50 mb-6">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center"><FileCheck className="mr-2 text-primary" /> Application Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Full Name</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.displayName}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Email</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.email}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Course</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.targetCourse || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Country</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.targetCountry || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Budget</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.budget || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Qualification</label>
                        <div className="font-medium text-gray-900 dark:text-white">{student.highestQualification || '-'}</div>
                    </div>
                </div>
            </div>
        );
    };

    // Admin view wrapper
    const AdminStudentView = () => {
        if (!selectedStudentId) return <StudentManagement profile={profile} setSelectedStudentId={(id) => { setSelectedStudentId(id); }} />;

        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                    <button onClick={() => setSelectedStudentId(undefined)} className="text-sm text-primary hover:text-primary-hover transition">← Back to Student List</button>
                    <span className="text-gray-400">|</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300 font-mono text-sm">ID: {selectedStudentId.substring(0, 8)}</span>
                </div>

                <StudentApplicationDetails studentId={selectedStudentId} />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Progress profile={profile} studentId={selectedStudentId} />
                        <Documents profile={profile} studentId={selectedStudentId} />
                    </div>
                    <div className="space-y-6">
                        <Tasks profile={profile} studentId={selectedStudentId} />
                        <Messaging profile={profile} studentId={selectedStudentId} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden transition-colors duration-300">
            <Sidebar role={profile.role} activeTab={activeTab} setActiveTab={setActiveTab} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isDark={isDark} toggleTheme={toggleTheme} unreadCount={unreadCount} />

            <div className="flex-1 flex flex-col md:ml-64 relative bg-gray-50 dark:bg-black/90">
                <header className="h-20 bg-white/80 dark:bg-black/50 backdrop-blur-md flex items-center justify-between px-8 z-40 sticky top-0 transition-colors duration-300">
                    <div className="flex items-center">
                        <button className="md:hidden mr-4 text-gray-500 dark:text-gray-400" onClick={() => setMobileOpen(true)}><Menu /></button>
                    </div>

                    <div className="flex items-center space-x-6">

                        <div className="relative" ref={notifRef}>
                            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <Bell className="w-5 h-5" />
                                {notifs.some(n => !n.seen) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>}
                            </button>
                            {showNotif && (
                                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 font-bold text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-border tracking-wider">Notifications</div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {notifs.length === 0 && <div className="p-6 text-center text-xs text-gray-500">No new notifications</div>}
                                        {notifs.map(n => (
                                            <div key={n.id} onClick={() => {
                                                markRead(n.id);
                                                if (n.title === 'New Message') {
                                                    setActiveTab(profile.role === 'student' ? 'support' : 'messages');
                                                    setShowNotif(false);
                                                }
                                            }} className={`p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition ${!n.seen ? 'bg-primary/5' : ''}`}>
                                                <div className={`font-semibold text-sm ${!n.seen ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</div>
                                                <div className="text-xs text-gray-500 mt-1">{n.message}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 pl-6">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{profile.displayName}</div>
                                <div className="text-xs text-gray-500 capitalize">{profile.role.replace('_', ' ')}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-cyan-700 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white dark:ring-black">
                                {profile.displayName.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                    {activeTab === 'dashboard' && <Dashboard profile={profile} />}
                    {activeTab === 'applications' && (profile.role === 'admin' || profile.role === 'super_admin') && <ApplicationsPanel profile={profile} />}
                    {activeTab === 'applications' && profile.role === 'student' && <StudentApplications profile={profile} />}
                    {activeTab === 'students' && (profile.role !== 'student' ? <AdminStudentView /> : <div>Access Denied</div>)}
                    {activeTab === 'tasks' && <Tasks profile={profile} />}
                    {activeTab === 'messages' && <Messaging profile={profile} />}
                    {activeTab === 'support' && <Messaging profile={profile} />}
                    {activeTab === 'profile' && <ProfileSettings profile={profile} />}
                    {activeTab === 'ai-gen' && (profile.role !== 'student' ? <AIGenerator profile={profile} /> : <div>Access Denied</div>)}
                    {activeTab === 'super-admin' && (profile.role === 'super_admin' ? <SuperAdminPanel profile={profile} /> : <div>Access Denied</div>)}
                </main>
            </div>
        </div>
    );
};

// --- App Root ---

const App = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubDoc) unsubDoc();

            if (user) {
                unsubDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data() as UserProfile);
                    } else {
                        const defaultProfile = {
                            uid: user.uid,
                            email: user.email!,
                            displayName: user.displayName || 'User',
                            role: 'student',
                            createdAt: Date.now()
                        } as UserProfile;
                        setUserProfile(defaultProfile);
                    }
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => {
            unsubscribeAuth();
            if (unsubDoc) unsubDoc();
        };
    }, []);

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-black text-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
            <Shield className="w-16 h-16 mb-6 text-primary drop-shadow-[0_0_15px_rgba(25,125,129,0.8)]" />
            <div className="text-2xl font-bold text-white tracking-widest">AR CONSULTANTS</div>
            <div className="text-xs text-gray-500 mt-2 font-mono">Initializing System Protocols...</div>
        </div>
    );

    return userProfile ? <MainLayout profile={userProfile} /> : <AuthPage setUserProfile={setUserProfile} />;
};

export default App;
