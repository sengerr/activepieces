import {
  OAuth2PropertyValue,
  PieceAuth,
  createPiece,
} from '@activepieces/pieces-framework';
import { createContact } from './lib/actions/create-contact.action';
import { getOrCreateContact } from './lib/actions/create-or-get-contact.action';
import { sendMessage } from './lib/actions/send-message.action';
import { createCustomApiCallAction } from '@activepieces/pieces-common';

export const intercomAuth = PieceAuth.OAuth2({
  authUrl: 'https://app.intercom.com/oauth',
  tokenUrl: 'https://api.intercom.io/auth/eagle/token',
  required: true,
  scope: [],
});

export const intercom = createPiece({
  displayName: 'Intercom',
  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/intercom.png',
  auth: intercomAuth,
  triggers: [],
  actions: [
    getOrCreateContact,
    createContact,
    sendMessage,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.intercom.io',
      auth: intercomAuth,
      authMapping: (auth) => ({
        Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
      }),
    }),
  ],
});
