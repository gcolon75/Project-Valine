import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles, Mic, Code, Twitter, Linkedin, Github } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Join = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.email || !formData.password || !formData.displayName) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const user = await register(formData);
      toast.success('Account created successfully!');
      
      // Navigate to profile setup for new users
      navigate('/setup');
    } catch (error) {
      toast.error(error.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      
      {/* Header */}
      

      {/* Content */}
      <div className="pt-20 flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-md animate-fade-in">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
              <span className="text-sm font-medium text-[#0CCE6B]">
                Join Project Valine
              </span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Create your account
            </h1>
            <p className="text-neutral-600">
              Start connecting with voice actors and artists today
            </p>
          </div>

          {/* Form */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                required
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Display Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                required
                placeholder="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="password"
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* DEV MODE BUTTON */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <button
                onClick={handleDevSignup}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Code className="w-5 h-5" />
                <span>Dev Sign Up (Skip Auth)</span>
              </button>
              <p className="text-xs text-neutral-500 text-center mt-2">
                Development mode only - bypasses authentication
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-neutral-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0CCE6B] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      </div>

      {/* Footer */}
          </div>
  );
};

export default Join;
