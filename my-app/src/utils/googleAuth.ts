const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type GoogleTokenClientCallback = (response: { access_token: string; error?: string }) => void;

type GoogleTokenClientConfig = {
  client_id: string;
  scope: string;
  callback: GoogleTokenClientCallback;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: 'consent' | 'none' }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        };
      };
    };
  }
}

const loadGoogleApi = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (event) => reject(event));
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (event) => reject(event);
    document.head.appendChild(script);
  });

export const requestGoogleAccessToken = async (
  clientId: string,
  scope: string,
  prompt: 'consent' | 'none' = 'consent',
) => {
  await loadGoogleApi();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google OAuth client not ready');
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.access_token);
      },
    });

    try {
      tokenClient.requestAccessToken({ prompt });
    } catch (error) {
      reject(error);
    }
  });
};

export const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve user profile: ${response.status}`);
  }

  return response.json() as Promise<{
    id: string;
    email: string;
    verified_email: boolean;
    name?: string;
    picture?: string;
  }>;
};
