import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';
import { LogIn, UserPlus, Phone, Mail, Chrome, Lock, ArrowRight, Smartphone } from 'lucide-react';

type AuthMethod = 'email' | 'phone';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [role, setRole] = useState<'user' | 'provider'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  const superAdmins = ['pandaprasannakumar150@gmail.com', 'prasannaofficial1712@gmail.com'];

  const handleAuthSuccess = async (user: any, selectedRole: 'user' | 'provider') => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const isSuperAdmin = superAdmins.includes(user.email || '');
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || displayName || 'User',
        phone: phone || '',
        photoURL: user.photoURL || '',
        role: isSuperAdmin ? 'admin' : selectedRole,
        createdAt: serverTimestamp(),
        isApproved: (isSuperAdmin || selectedRole === 'user') ? true : false
      };
      await setDoc(docRef, newProfile);
    }
    navigate('/dashboard');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user, 'user'); // Role will be fetched from DB if exists
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
        await handleAuthSuccess(result.user, role);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleAuthSuccess(result.user, role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset link sent to your email!');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-8 pt-12 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <LogIn size={32} />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 font-medium">
            {isLogin ? 'Log in to your Anjaneya Services account' : 'Join our professional service network'}
          </p>
        </div>
        
        <div className="px-8 pb-12">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMethod === 'email' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
              Email
            </button>
            <button 
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMethod === 'phone' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
              Phone OTP
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-fade-in">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100 animate-fade-in">
              {message}
            </div>
          )}

          {!isLogin && (
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-3">I want to join as:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('user')}
                  className={`py-3 rounded-2xl border-2 transition-all font-bold ${role === 'user' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  Customer
                </button>
                <button
                  onClick={() => setRole('provider')}
                  className={`py-3 rounded-2xl border-2 transition-all font-bold ${role === 'provider' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  Service Man
                </button>
              </div>
            </div>
          )}

          {authMethod === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-5">
              {!isLogin && (
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    required
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" 
                    placeholder="Full Name" 
                  />
                </div>
              )}
              {!isLogin && (
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    required
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" 
                    placeholder="Phone Number" 
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" 
                    placeholder="name@example.com" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-gray-700">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-extrabold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}</span>
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="tel" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" 
                  placeholder="Phone Number" 
                />
              </div>
              <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-extrabold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                Send OTP
              </button>
            </div>
          )}

          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white px-4 text-gray-400">Or continue with</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700"
          >
            <Chrome className="text-red-500" size={20} />
            <span>Google</span>
          </button>

          <div className="mt-10 text-center text-sm">
            <span className="text-gray-500 font-medium">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-emerald-600 font-extrabold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
