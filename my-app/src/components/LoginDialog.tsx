import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material';

import { fetchGoogleUserInfo, requestGoogleAccessToken } from '../utils/googleAuth';

type LoginDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (params: { email: string; appToken: string; googleToken: string }) => void;
};

const GOOGLE_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const clientId = "861950972007-ru8kog58u7oa47o55h64pci12edn6scu.apps.googleusercontent.com";

    if (!clientId) {
      setError('Missing Google Client ID. Please configure VITE_GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    try {
      setLoading(true);
      const googleToken = await requestGoogleAccessToken(clientId, GOOGLE_SCOPE);
      const userInfo = await fetchGoogleUserInfo(googleToken);

      if (!userInfo.email) {
        throw new Error('Unable to retrieve email address from Google.');
      }

      const response = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
        },
        body: JSON.stringify({
          token: googleToken,
          email: userInfo.email,
          password: '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const payload = await response.json() as {
        success: boolean;
        code: string;
        message: string;
        data?: {
          token?: string;
        };
      };

      if (!payload.success || !payload.data?.token) {
        throw new Error(payload.message || 'Login failed. Please try again later.');
      }

      onSuccess({
        email: userInfo.email,
        appToken: payload.data.token,
        googleToken,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>Sign in with Google</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Sign in to bookmark your favorite car parks and access live availability faster.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Clicking the button below opens the Google consent screen. Choose an account and approve the requested permissions.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
