import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [major, setMajor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, userRole, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && userRole) {
      setLoading(false); // clear loading so we don't stay stuck
      if (userRole === 'organizer') {
        navigate('/organizer');
      } else if (userRole === 'recruiter') {
        navigate('/recruiter');
      } else if (userRole === 'student') {
        navigate('/student');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, userRole, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignup) {
        // Only students can sign up (recruiters are created by organizers)
        const additionalData = { name: studentName, major: major };
        await signup(email, password, 'student', additionalData);
        // Students always go to map view
        navigate('/');
      } else {
        await login(email, password);
        // The useEffect above will clear loading and navigate when userRole is set
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">
          {isSignup ? 'Sign Up' : 'Login'}
        </h2>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Sign up as a student. Recruiter accounts can only be created by organizers.
                </p>
              </div>

              <input
                type="text"
                placeholder="Full Name"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                required
              />
              <input
                type="text"
                placeholder="Major"
                value={major}
                onChange={e => setMajor(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                required
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            required
            minLength="6"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-iise-navy text-white p-2 rounded hover:bg-iise-blue disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}
          </button>
        </form>
        
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full mt-4 text-iise-navy hover:underline"
        >
          {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  );
}

export default Login;