import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const Auth: React.FC = () => {
  const [authMethod, setAuthMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'PHONE' | 'OTP'>('PHONE');

  // Email State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Error Translator
  const translateError = (errMessage: string) => {
    const msg = errMessage.toLowerCase();
    if (msg.includes('invalid login credentials')) return '邮箱或密码不正确';
    if (msg.includes('user already registered')) return '该邮箱已经被注册过了';
    if (msg.includes('rate limit exceeded')) return '操作太频繁了，请稍后再试 (Rate limit)';
    if (msg.includes('email link')) return '验证邮件发送失败，请检查邮箱格式';
    if (msg.includes('password should be at least')) return '密码太短，至少需要6位';
    if (msg.includes('missing email')) return '请输入有效的邮箱地址';
    return errMessage;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (error) throw error;
      setPhoneStep('OTP');
    } catch (err: any) {
      setError(translateError(err.message || '发送验证码失败，请检查手机号格式或后台配置'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
    } catch (err: any) {
      setError(translateError(err.message || '验证码错误或已过期'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Use our custom backend to bypass Supabase native Rate Limits & Email Confirmations
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '注册失败');

        // Registration successful, now log them in
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;

        // No need to alert, they are logged in and App.tsx will route them
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(translateError(err.message || '邮箱或密码错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center opacity-[0.03]">
        <div className="w-[800px] h-[800px] rounded-full border border-[#1F1F1F]"></div>
        <div className="absolute w-[600px] h-[600px] rounded-full border border-[#1F1F1F]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-stone-100 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#1F1F1F] rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
            <SparklesIcon className="w-8 h-8 text-[#B8860B]" />
          </div>
        </div>

        <h2 className="text-2xl font-serif font-bold text-center text-stone-800 mb-6">
          天机阁
        </h2>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
          <button
            onClick={() => { setAuthMethod('PHONE'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMethod === 'PHONE'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            手机快捷登录
          </button>
          <button
            onClick={() => { setAuthMethod('EMAIL'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMethod === 'EMAIL'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            邮箱密码登录
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {authMethod === 'PHONE' ? (
            <motion.div
              key="phone-section"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {phoneStep === 'PHONE' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">手机号码</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DevicePhoneMobileIcon className="h-5 w-5 text-stone-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors"
                        placeholder="请输入手机号"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phone}
                    className="w-full bg-[#1F1F1F] text-[#B8860B] font-bold py-3.5 rounded-xl shadow-md hover:bg-[#333] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
                  >
                    {loading ? <SparklesIcon className="w-5 h-5 animate-spin" /> : '获取验证码'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">验证码</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyIcon className="h-5 w-5 text-stone-400" />
                      </div>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors tracking-widest text-center text-lg font-mono"
                        placeholder="六位数字"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !otp}
                    className="w-full bg-[#1F1F1F] text-[#B8860B] font-bold py-3.5 rounded-xl shadow-md hover:bg-[#333] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
                  >
                    {loading ? <SparklesIcon className="w-5 h-5 animate-spin" /> : '验证并登录'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPhoneStep('PHONE'); setError(null); setOtp(''); }}
                    className="w-full py-3 text-stone-500 text-sm hover:text-[#1F1F1F] transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeftIcon className="w-4 h-4" /> 返回修改手机号
                  </button>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="email-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">邮箱</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">密码</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-[#1F1F1F] text-[#B8860B] font-bold py-3.5 rounded-xl shadow-md hover:bg-[#333] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
                >
                  {loading ? (
                    <SparklesIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    isSignUp ? '注册账号' : '立即登录'
                  )}
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                    className="text-sm text-stone-500 hover:text-[#B8860B] transition-colors"
                  >
                    {isSignUp ? '已有账号？点击登录' : '没有账号？点击注册'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
