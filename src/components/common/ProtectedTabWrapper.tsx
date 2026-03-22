import { useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordModal } from './PasswordModal';

interface ProtectedTabWrapperProps {
  children: ReactNode;
  tabName: string;
}

export function ProtectedTabWrapper({ children, tabName }: ProtectedTabWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const navigate = useNavigate();

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (isAuthenticated) {
      setShowPasswordModal(false);
    }
  }, [isAuthenticated]);

  const handleModalClose = () => {
    // Only redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/');
    }
  };

  if (!isAuthenticated) {
    return (
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={handleModalClose}
        onSuccess={handlePasswordSuccess}
        title="Access Required"
        description={`Enter the administrator password to access ${tabName}`}
      />
    );
  }

  return <>{children}</>;
}
