import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, User, Phone, Gift, MapPin, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When false (admin route), hides the sign-up path entirely — existing accounts only. */
  allowSignup?: boolean;
}

export function LoginModal({ isOpen, onClose, allowSignup = true }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const canSignup = allowSignup;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isLogin || !canSignup) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          resetForm();
          onClose();
        }
      } else {
        if (!name.trim()) {
          setError(t('guest.enterName'));
          return;
        }
        const { error } = await signUp(email, password, name.trim(), phone.trim());
        if (error) {
          setError(error.message);
        } else {
          setNotice(t('guest.accountCreated'));
          setPassword('');
        }
      }
    } catch {
      setError(t('guest.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const showLoginForm = isLogin || !canSignup;

  const BENEFITS = [
    { icon: Gift, label: t('guest.benefitPoints') },
    { icon: MapPin, label: t('guest.benefitAddress') },
    { icon: Clock, label: t('guest.benefitTrack') },
    { icon: Sparkles, label: t('guest.benefitRewards') },
  ];

  const inputClass =
    'w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {showLoginForm ? t('guest.signIn') : t('guest.joinMat3amji')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
          {!showLoginForm && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {t('guest.signupPerk')}
            </p>
          )}
        </div>

        {!showLoginForm && (
          <div className="px-6 pt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-3">
              {t('guest.whyJoin')}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-3 py-2.5"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-primary-600 dark:text-primary-400" />
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {notice && (
              <div className="bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
                {notice}
              </div>
            )}

            {!showLoginForm && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('guest.name')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder={t('guest.yourName')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('guest.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      placeholder={t('guest.yourPhone')}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('guest.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder={t('guest.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('guest.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder={t('guest.passwordPlaceholder')}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? t('guest.pleaseWait') : showLoginForm ? t('guest.signIn') : t('guest.createAccount')}
            </button>
          </form>

          {canSignup && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setNotice('');
                }}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                {isLogin ? t('guest.noAccountJoin') : t('guest.haveAccountSignIn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
