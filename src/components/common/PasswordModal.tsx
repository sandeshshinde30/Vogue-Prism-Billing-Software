import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PasswordModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Enter Password",
  description = "This action requires administrator password"
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default admin password - in production, this should be configurable
  const ADMIN_PASSWORD = 'admin123';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a small delay for security
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      onSuccess();
      handleClose();
    } else {
      setError('Incorrect password');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
          <Lock size={32} className="text-red-600" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="pr-10"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </Button>
          </div>
        </form>

        <div className="text-xs text-gray-500 text-center">
          Default password: admin123
        </div>
      </div>
    </Modal>
  );
}