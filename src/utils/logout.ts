import { logout } from '../api/auth';
import { tokenStorage } from './tokenStorage';

export const handleLogout = async (): Promise<void> => {
  try {
    await logout();
  } finally {
    tokenStorage.clearTokens();
  }
};
