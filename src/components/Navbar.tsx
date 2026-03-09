import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, profile, isAdmin, isProvider } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const scrollToSection = (id: string) => {
    if (!isHomePage) {
      navigate('/#' + id);
      // The LandingPage component will handle the scroll via useEffect
    } else {
      const element = document.getElementById(id);
      if (element) {
        const offset = 80; // Height of the fixed navbar
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
    setIsOpen(false);
  };

  const navLinks = [
    { name: 'Home', id: 'home' },
    { name: 'About', id: 'about' },
    { name: 'Services', id: 'services' },
    { name: 'Gallery', id: 'gallery' },
    { name: 'Contact', id: 'contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-gray-900/95 backdrop-blur-md py-2 shadow-xl' : 'bg-gray-900 py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-500/20">A</div>
            <span className="text-2xl font-black tracking-tighter text-white">
              Anjaneya <span className="text-emerald-500">Services</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.id)}
                className="px-4 py-2 text-sm font-bold text-gray-300 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/5"
              >
                {link.name}
              </button>
            ))}
            
            <div className="h-6 w-px bg-gray-700 mx-4"></div>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to={isAdmin ? "/admin" : isProvider ? "/provider" : "/dashboard"} 
                  className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Logout">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2">
                <User size={18} />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 shadow-2xl absolute top-full left-0 w-full animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left px-4 py-4 text-base font-bold text-gray-300 hover:bg-white/5 hover:text-emerald-400 rounded-xl"
              >
                {link.name}
              </button>
            ))}
            {user ? (
              <div className="pt-4 space-y-2">
                <Link 
                  to={isAdmin ? "/admin" : isProvider ? "/provider" : "/dashboard"} 
                  onClick={() => setIsOpen(false)} 
                  className="flex items-center space-x-3 px-4 py-4 text-base font-bold text-emerald-400 bg-emerald-500/10 rounded-xl"
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center space-x-3 w-full text-left px-4 py-4 text-base font-bold text-red-400 hover:bg-red-500/10 rounded-xl">
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)} className="block px-4 py-4 text-base font-bold text-emerald-500 bg-emerald-500/10 rounded-xl text-center mt-4">
                Login / Signup
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
